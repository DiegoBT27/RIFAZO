

import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  increment,
} from 'firebase/firestore';
import type { Raffle, ManagedUser, Participation, RaffleResult, ActivityLog, Rating, PlanName } from '@/types';
import { PLAN_CONFIG, getPlanDetails } from '@/lib/config/plans';


const usersCollection = collection(db, 'users');
const rafflesCollection = collection(db, 'raffles');
const participationsCollection = collection(db, 'participations');
const raffleResultsCollection = collection(db, 'raffleResults');
const activityLogsCollection = collection(db, 'activityLogs');
const ratingsCollection = collection(db, 'ratings');


// User Functions
export const getUsers = async (): Promise<ManagedUser[]> => {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagedUser));
};

export const getUserById = async (userId: string): Promise<ManagedUser | null> => {
  const userDoc = doc(db, 'users', userId);
  const snapshot = await getDoc(userDoc);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as ManagedUser;
  }
  return null;
};

export const getUserByUsername = async (username: string): Promise<ManagedUser | null> => {
  const q = query(usersCollection, where('username', '==', username));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as ManagedUser;
};

export const addUser = async (userData: Omit<ManagedUser, 'id'>): Promise<ManagedUser> => {
  const dataToSave: { [key: string]: any } = {
    username: userData.username,
    password: userData.password,
    role: userData.role || 'user',
    isBlocked: userData.isBlocked || false,
    averageRating: 0,
    ratingCount: 0,
    plan: null,
    planActive: false,
    planStartDate: null,
    planEndDate: null,
    planAssignedBy: null,
    rafflesCreatedThisPeriod: 0,
    rafflesEditedThisPeriod: 0, // Added
  };

  if (userData.role === 'admin' || userData.role === 'founder') {
      const freePlanDetails = PLAN_CONFIG['free'];
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + freePlanDetails.durationDays);

      dataToSave.plan = 'free';
      dataToSave.planActive = true;
      dataToSave.planStartDate = startDate.toISOString();
      dataToSave.planEndDate = endDate.toISOString();
      dataToSave.planAssignedBy = 'system_initial';
  }

  const optionalFields: (keyof Omit<ManagedUser, 'id' | 'username' | 'password' | 'role' | 'isBlocked' | 'averageRating' | 'ratingCount' | 'plan' | 'planActive' | 'planStartDate' | 'planEndDate' | 'planAssignedBy' | 'rafflesCreatedThisPeriod' | 'rafflesEditedThisPeriod'>)[] = [
    'organizerType', 'fullName', 'companyName', 'rif', 'publicAlias',
    'whatsappNumber', 'locationState', 'locationCity',
    'email', 'bio', 'adminPaymentMethodsInfo'
  ];

  optionalFields.forEach(field => {
    if (userData[field] !== undefined) {
      dataToSave[field] = userData[field];
    }
  });

  if (userData.publicAlias !== undefined) {
    dataToSave.publicAlias = userData.publicAlias;
  } else if (dataToSave.publicAlias === undefined && dataToSave.role !== 'user' && userData.username) {
    dataToSave.publicAlias = userData.username;
  }

  const docRef = await addDoc(usersCollection, dataToSave);
  const savedUser: ManagedUser = {
    id: docRef.id,
    ...dataToSave
  } as ManagedUser;
  return savedUser;
};

export const updateUser = async (userId: string, userData: Partial<ManagedUser>): Promise<void> => {
  const userDoc = doc(db, 'users', userId);
  const dataToUpdate: { [key: string]: any } = {};

  for (const key in userData) {
    if (Object.prototype.hasOwnProperty.call(userData, key)) {
      const typedKey = key as keyof Partial<ManagedUser>;
      const value = userData[typedKey];

      if (typedKey === 'isBlocked') {
        dataToUpdate[typedKey] = value === undefined ? false : value;
      } else if (value !== undefined) {
        if (typedKey === 'password' && value === '') {
          // Skip empty password update
        } else {
          dataToUpdate[typedKey] = value;
        }
      } else {
        dataToUpdate[typedKey] = null;
      }
    }
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await updateDoc(userDoc, dataToUpdate);
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  const userDoc = doc(db, 'users', userId);
  await deleteDoc(userDoc);
};


export const assignPlanToAdmin = async (
  adminUserId: string,
  planName: PlanName,
  assignerUsername: string,
  customStartDate?: Date | string | null
): Promise<void> => {
  const adminUserDocRef = doc(db, 'users', adminUserId);
  const planDetails = PLAN_CONFIG[planName];

  if (!planDetails) {
    throw new Error(`Plan "${planName}" no encontrado en la configuración.`);
  }

  let effectiveStartDate: Date;
  let isScheduled = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  if (customStartDate) {
    effectiveStartDate = new Date(customStartDate);
    effectiveStartDate.setHours(0, 0, 0, 0); 
    if (effectiveStartDate > today) {
      isScheduled = true;
    }
  } else {
    effectiveStartDate = today;
  }

  const endDate = new Date(effectiveStartDate);
  endDate.setDate(effectiveStartDate.getDate() + planDetails.durationDays);

  const planData: Partial<ManagedUser> = {
    plan: planName,
    planActive: !isScheduled, 
    planStartDate: effectiveStartDate.toISOString(),
    planEndDate: endDate.toISOString(),
    planAssignedBy: assignerUsername,
    rafflesCreatedThisPeriod: 0, 
    rafflesEditedThisPeriod: 0, // Reset edit counter
  };

  await updateDoc(adminUserDocRef, planData);

  const adminUserSnap = await getDoc(adminUserDocRef);
  const adminUsername = adminUserSnap.data()?.username || adminUserId;

  await addActivityLog({
    adminUsername: assignerUsername,
    actionType: isScheduled ? 'ADMIN_PLAN_SCHEDULED' : 'ADMIN_PLAN_ASSIGNED',
    targetInfo: `Admin: ${adminUsername}, Plan: ${planDetails.displayName}`,
    details: {
      adminUserId,
      adminUsername,
      planName: planDetails.displayName,
      planStartDate: planData.planStartDate,
      planEndDate: planData.planEndDate,
      isScheduled
    }
  });
};

export const removeAdminPlan = async (adminUserId: string, removerUsername: string): Promise<void> => {
  const adminUserDocRef = doc(db, 'users', adminUserId);
  
  const adminUserSnap = await getDoc(adminUserDocRef);
  if (!adminUserSnap.exists()) {
    throw new Error("Usuario administrador no encontrado.");
  }
  const adminData = adminUserSnap.data() as ManagedUser;
  const oldPlanName = adminData.plan || 'N/A';

  const planUpdateData: Partial<ManagedUser> = {
    plan: null,
    planActive: false,
    planStartDate: null,
    planEndDate: null,
    planAssignedBy: removerUsername, 
    rafflesCreatedThisPeriod: 0,
    rafflesEditedThisPeriod: 0, // Reset edit counter
  };
  await updateDoc(adminUserDocRef, planUpdateData);

  await addActivityLog({
    adminUsername: removerUsername,
    actionType: 'ADMIN_PLAN_REMOVED',
    targetInfo: `Admin: ${adminData.username}, Plan Anterior: ${oldPlanName}`,
    details: {
      adminUserId,
      adminUsername: adminData.username,
      removedPlan: oldPlanName
    }
  });
};


// Raffle Functions
export const getRaffles = async (): Promise<Raffle[]> => {
  const snapshot = await getDocs(rafflesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Raffle));
};

export const getRaffleById = async (raffleId: string): Promise<Raffle | null> => {
  const raffleDoc = doc(db, 'raffles', raffleId);
  const snapshot = await getDoc(raffleDoc);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Raffle;
  }
  return null;
};

export const addRaffle = async (raffleData: Omit<Raffle, 'id' | 'soldNumbers' | 'effectiveSoldNumbers'>, creator: ManagedUser): Promise<Raffle> => {
  const newRaffleData = { ...raffleData, soldNumbers: [], status: 'active' as 'active' | 'pending_draw' | 'completed' | 'cancelled' };
  const docRef = await addDoc(rafflesCollection, newRaffleData);
  const savedRaffle = { id: docRef.id, ...newRaffleData } as Raffle;

  if (creator.id) {
    const userDocRef = doc(db, 'users', creator.id);
    await updateDoc(userDocRef, {
      rafflesCreatedThisPeriod: increment(1)
    });
  }

  await addActivityLog({
    adminUsername: creator.username,
    actionType: 'RAFFLE_CREATED',
    targetInfo: `Rifa: ${savedRaffle.name}`,
    details: {
      raffleId: savedRaffle.id,
      raffleName: savedRaffle.name,
      prize: savedRaffle.prize,
    }
  });

  return savedRaffle;
};

export const updateRaffle = async (raffleId: string, raffleData: Partial<Raffle>, editor: ManagedUser): Promise<void> => {
  if (!editor) {
    let errorMessage = "Información del editor inválida para actualizar la rifa. El objeto 'editor' es undefined.";
    console.error(`Error en updateRaffle: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  if (typeof editor.role === 'undefined') {
    let errorMessage = "Información del editor inválida para actualizar la rifa. 'editor.role' es undefined.";
    console.error(`Error en updateRaffle: ${errorMessage} Objeto editor:`, JSON.stringify(editor, null, 2));
    throw new Error(errorMessage);
  }

  const raffleToEdit = await getRaffleById(raffleId);
  if (!raffleToEdit) throw new Error("Rifa no encontrada para editar.");

  if (editor.role !== 'founder') {
    const planDetails = getPlanDetails(editor.planActive ? editor.plan : null);
    if (planDetails.canEditRaffles === false) {
      throw new Error(`Tu plan actual (${planDetails.displayName}) no permite editar rifas.`);
    }
    if (raffleToEdit.creatorUsername !== editor.username) {
      throw new Error("No tienes permiso para editar esta rifa porque no eres el creador y no eres fundador.");
    }
    if (planDetails.canEditRaffles === 'limited') {
      if ((editor.rafflesEditedThisPeriod || 0) >= (planDetails.editRaffleLimit || Infinity)) {
        throw new Error(`Has alcanzado el límite de ${planDetails.editRaffleLimit} ediciones de rifas para tu plan actual (${planDetails.displayName}).`);
      }
    }
  }
  
  const raffleDoc = doc(db, 'raffles', raffleId);
  await updateDoc(raffleDoc, raffleData);

  // Increment edit count if admin with limited edits and the raffle update was successful
  if (editor.role === 'admin') {
    const planDetails = getPlanDetails(editor.planActive ? editor.plan : null);
    if (planDetails.canEditRaffles === 'limited') {
        const userDocRef = doc(db, 'users', editor.id);
        await updateDoc(userDocRef, {
        rafflesEditedThisPeriod: increment(1)
        });
    }
  }


  await addActivityLog({
    adminUsername: editor.username,
    actionType: 'RAFFLE_EDITED',
    targetInfo: `Rifa: ${raffleData.name || raffleToEdit.name}`,
    details: {
      raffleId: raffleId,
      raffleName: raffleData.name || raffleToEdit.name,
    }
  });
};

export const deleteRaffleAndParticipations = async (raffleId: string): Promise<void> => {
  const batch = writeBatch(db);

  const raffleDoc = doc(db, 'raffles', raffleId);
  batch.delete(raffleDoc);

  const participationsQuery = query(participationsCollection, where('raffleId', '==', raffleId));
  const participationsSnapshot = await getDocs(participationsQuery);
  participationsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  const resultsQuery = query(raffleResultsCollection, where('raffleId', '==', raffleId));
  const resultsSnapshot = await getDocs(resultsQuery);
  resultsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  const ratingsQuery = query(ratingsCollection, where('raffleId', '==', raffleId));
  const ratingsSnapshot = await getDocs(ratingsQuery);
  ratingsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};


// Participation Functions
export const getParticipations = async (): Promise<Participation[]> => {
  const snapshot = await getDocs(participationsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
};

export const getParticipationsByRaffleId = async (raffleId: string): Promise<Participation[]> => {
  const q = query(participationsCollection, where('raffleId', '==', raffleId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
};

export const getParticipationsByUsername = async (username: string): Promise<Participation[]> => {
  const q = query(participationsCollection, where('participantUsername', '==', username));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
};


export const addParticipation = async (participationData: Omit<Participation, 'id'>): Promise<Participation> => {
  const docRef = await addDoc(participationsCollection, participationData);
  const savedParticipation = { id: docRef.id, ...participationData } as Participation;
  return savedParticipation;
};

export const updateParticipation = async (participationId: string, participationData: Partial<Participation>): Promise<void> => {
  const participationDocRef = doc(db, 'participations', participationId);
  await updateDoc(participationDocRef, participationData);
};

export const deleteParticipation = async (participationId: string): Promise<void> => {
  const participationDoc = doc(db, 'participations', participationId);
  await deleteDoc(participationDoc);
};


// Raffle Result Functions
export const addRaffleResult = async (resultData: Omit<RaffleResult, 'id'>): Promise<RaffleResult> => {
  const docRef = await addDoc(raffleResultsCollection, resultData);
  return { id: docRef.id, ...resultData };
};

export const getRaffleResults = async (): Promise<RaffleResult[]> => {
  const snapshot = await getDocs(raffleResultsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RaffleResult));
};

export const getRaffleResultByRaffleId = async (raffleId: string): Promise<RaffleResult | null> => {
  const q = query(raffleResultsCollection, where('raffleId', '==', raffleId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as RaffleResult;
};


// Activity Log Functions
export const addActivityLog = async (logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    await addDoc(activityLogsCollection, {
      ...logData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding activity log: ", error);
  }
};

export const getActivityLogs = async (limitCount: number = 100, forAdminUsername?: string): Promise<ActivityLog[]> => {
  let q;
  if (forAdminUsername) {
    q = query(activityLogsCollection, where('adminUsername', '==', forAdminUsername), orderBy('timestamp', 'desc'), limit(limitCount));
  } else {
    q = query(activityLogsCollection, orderBy('timestamp', 'desc'), limit(limitCount));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(0) 
    } as ActivityLog;
  });
};


// Rating Functions
export const addRating = async (ratingData: Omit<Rating, 'id' | 'createdAt'>): Promise<Rating> => {
  const newRatingData = { ...ratingData, createdAt: serverTimestamp() };
  const docRef = await addDoc(ratingsCollection, newRatingData);

  const organizerUser = await getUserByUsername(ratingData.organizerUsername);
  if (organizerUser) {
    const organizerUserRef = doc(db, "users", organizerUser.id);
    try {
      await runTransaction(db, async (transaction) => {
        const organizerDoc = await transaction.get(organizerUserRef);
        if (!organizerDoc.exists()) {
          throw "Organizer document does not exist!";
        }

        const currentRatingCount = organizerDoc.data().ratingCount || 0;
        const currentAverageRating = organizerDoc.data().averageRating || 0;

        const newRatingCount = currentRatingCount + 1;
        const newTotalStars = (currentAverageRating * currentRatingCount) + ratingData.ratingStars;
        const newAverageRating = parseFloat((newTotalStars / newRatingCount).toFixed(1));

        transaction.update(organizerUserRef, {
          averageRating: newAverageRating,
          ratingCount: newRatingCount
        });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }

  const participationsQuery = query(
    participationsCollection,
    where('raffleId', '==', ratingData.raffleId),
    where('participantUsername', '==', ratingData.raterUsername)
  );
  const participationsSnapshot = await getDocs(participationsQuery);
  if (!participationsSnapshot.empty) {
    const participationDocToUpdate = participationsSnapshot.docs[0];
    await updateDoc(participationDocToUpdate.ref, { userHasRatedOrganizerForRaffle: true });
  }

  return { id: docRef.id, ...newRatingData, createdAt: new Date() } as Rating;
};

export const getRatingsByOrganizerUsername = async (organizerUsername: string): Promise<Rating[]> => {
  const q = query(ratingsCollection, where('organizerUsername', '==', organizerUsername), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(0)
    } as Rating;
  });
};

export const checkIfUserRatedRaffle = async (raterUsername: string, raffleId: string): Promise<boolean> => {
  const q = query(
    ratingsCollection,
    where('raterUsername', '==', raterUsername),
    where('raffleId', '==', raffleId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};


const serializeDocument = (docData: Record<string, any>): Record<string, any> => {
  const serialized: Record<string, any> = {};
  for (const key in docData) {
    if (Object.prototype.hasOwnProperty.call(docData, key)) {
      const value = docData[key];
      if (value instanceof Timestamp) {
        serialized[key] = { _seconds: value.seconds, _nanoseconds: value.nanoseconds, __datatype__: 'timestamp' };
      } else {
        serialized[key] = value;
      }
    }
  }
  return serialized;
};

const deserializeDocument = (docData: Record<string, any>): Record<string, any> => {
  const deserialized: Record<string, any> = {};
  for (const key in docData) {
    if (Object.prototype.hasOwnProperty.call(docData, key)) {
      const value = docData[key];
      if (value && typeof value === 'object' && value.__datatype__ === 'timestamp') {
        deserialized[key] = new Timestamp(value._seconds, value._nanoseconds);
      } else {
        deserialized[key] = value;
      }
    }
  }
  return deserialized;
};

export const exportFirestoreCollections = async (collectionNames: string[]): Promise<Record<string, any[]>> => {
  const data: Record<string, any[]> = {};
  for (const collectionName of collectionNames) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    data[collectionName] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...serializeDocument(doc.data()),
    }));
  }
  return data;
};

const deleteAllDocumentsInCollection = async (collectionName: string, exceptions: { field: string, value: any }[] = []): Promise<number> => {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  let deletedCount = 0;
  snapshot.docs.forEach(doc => {
    let shouldDelete = true;
    if (exceptions.length > 0) {
      const docData = doc.data();
      for (const exception of exceptions) {
        if (docData[exception.field] === exception.value) {
          shouldDelete = false;
          break;
        }
      }
    }
    if (shouldDelete) {
      batch.delete(doc.ref);
      deletedCount++;
    }
  });
  await batch.commit();
  return deletedCount;
};

export const importFirestoreCollections = async (
  dataToImport: Record<string, any[]>,
  collectionsToRestore: string[]
): Promise<{ success: boolean; errors: string[]; summary: string[] }> => {
  const errors: string[] = [];
  const summary: string[] = [];

  for (const collectionName of collectionsToRestore) {
    if (!dataToImport[collectionName]) {
      const msg = `Colección "${collectionName}" no encontrada en el archivo de respaldo. Omitiendo.`;
      console.warn(msg);
      summary.push(msg);
      continue;
    }

    try {
      console.log(`[Import] Eliminando datos existentes en la colección: ${collectionName}`);
      await deleteAllDocumentsInCollection(collectionName);
      summary.push(`Datos existentes en "${collectionName}" eliminados.`);
      console.log(`[Import] Datos eliminados de ${collectionName}. Procediendo a importar...`);

      const batch = writeBatch(db);
      const collectionData = dataToImport[collectionName];
      let importedCount = 0;

      for (const docData of collectionData) {
        const { id, ...restOfData } = docData;
        if (!id) {
          console.warn(`[Import] Documento en "${collectionName}" sin ID. Omitiendo.`);
          continue;
        }
        const docRef = doc(db, collectionName, id);
        batch.set(docRef, deserializeDocument(restOfData));
        importedCount++;
      }

      await batch.commit();
      summary.push(`${importedCount} documentos importados a "${collectionName}".`);
      console.log(`[Import] ${importedCount} documentos importados exitosamente a ${collectionName}.`);

    } catch (error: any) {
      const errorMsg = `Error restaurando la colección "${collectionName}": ${error.message}`;
      console.error(errorMsg, error);
      errors.push(errorMsg);
      summary.push(`Fallo al restaurar "${collectionName}".`);
    }
  }
  return { success: errors.length === 0, errors, summary };
};

