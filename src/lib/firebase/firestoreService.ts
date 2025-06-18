
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
} from 'firebase/firestore';
import type { Raffle, ManagedUser, Participation, RaffleResult, ActivityLog, Rating } from '@/types';
// initialPlatformUsers import removed as it's no longer used here

// Users Collection
const usersCollection = collection(db, 'users');

export const getUsers = async (): Promise<ManagedUser[]> => {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagedUser));
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
    averageRating: 0, // Initialize rating fields
    ratingCount: 0,   // Initialize rating fields
  };

  const optionalFields: (keyof Omit<ManagedUser, 'id' | 'username' | 'password' | 'role' | 'isBlocked' | 'averageRating' | 'ratingCount'>)[] = [
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
  // Construct the full ManagedUser object to return, including potentially undefined optional fields
  const savedUser: ManagedUser = {
    id: docRef.id,
    username: dataToSave.username,
    password: dataToSave.password, 
    role: dataToSave.role,
    isBlocked: dataToSave.isBlocked,
    organizerType: dataToSave.organizerType, 
    fullName: dataToSave.fullName,
    companyName: dataToSave.companyName,
    rif: dataToSave.rif,
    publicAlias: dataToSave.publicAlias,
    whatsappNumber: dataToSave.whatsappNumber,
    locationState: dataToSave.locationState,
    locationCity: dataToSave.locationCity,
    email: dataToSave.email,
    bio: dataToSave.bio,
    adminPaymentMethodsInfo: dataToSave.adminPaymentMethodsInfo,
    averageRating: dataToSave.averageRating,
    ratingCount: dataToSave.ratingCount,
  };
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
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        if (typedKey === 'password' && value === '') {
        } else {
          dataToUpdate[typedKey] = value;
        }
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

// Raffles Collection
const rafflesCollection = collection(db, 'raffles');

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

export const addRaffle = async (raffleData: Omit<Raffle, 'id' | 'soldNumbers' | 'effectiveSoldNumbers'>): Promise<Raffle> => {
  const newRaffleData = { ...raffleData, soldNumbers: [], status: 'active' as 'active' | 'pending_draw' | 'completed' | 'cancelled' }; 
  const docRef = await addDoc(rafflesCollection, newRaffleData);
  return { id: docRef.id, ...newRaffleData } as Raffle;
};

export const updateRaffle = async (raffleId: string, raffleData: Partial<Raffle>): Promise<void> => {
  const raffleDoc = doc(db, 'raffles', raffleId);
  await updateDoc(raffleDoc, raffleData);
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


// Participations Collection
const participationsCollection = collection(db, 'participations');

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
  return { id: docRef.id, ...participationData };
};

export const updateParticipation = async (participationId: string, participationData: Partial<Participation>): Promise<void> => {
  const participationDoc = doc(db, 'participations', participationId);
  await updateDoc(participationDoc, participationData);
};

export const deleteParticipation = async (participationId: string): Promise<void> => {
  const participationDoc = doc(db, 'participations', participationId);
  await deleteDoc(participationDoc);
};

// RaffleResults Collection
const raffleResultsCollection = collection(db, 'raffleResults');

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

// ActivityLogs Collection
const activityLogsCollection = collection(db, 'activityLogs');

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

export const getActivityLogs = async (limitCount: number = 100): Promise<ActivityLog[]> => {
  const q = query(activityLogsCollection, orderBy('timestamp', 'desc'), limit(limitCount));
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

// Ratings Collection
const ratingsCollection = collection(db, 'ratings');

export const addRating = async (ratingData: Omit<Rating, 'id' | 'createdAt'>): Promise<Rating> => {
  const newRatingData = { ...ratingData, createdAt: serverTimestamp() };
  const docRef = await addDoc(ratingsCollection, newRatingData);

  // Update organizer's average rating and count
  const organizerUser = await getUserByUsername(ratingData.organizerUsername);
  if (organizerUser) {
    const allOrganizerRatingsSnapshot = await getDocs(query(ratingsCollection, where('organizerUsername', '==', ratingData.organizerUsername)));
    const ratingsCount = allOrganizerRatingsSnapshot.size;
    let totalStars = 0;
    allOrganizerRatingsSnapshot.forEach(doc => {
      totalStars += (doc.data() as Rating).ratingStars;
    });
    const averageRating = ratingsCount > 0 ? parseFloat((totalStars / ratingsCount).toFixed(1)) : 0;

    await updateUser(organizerUser.id, { averageRating, ratingCount: ratingsCount });
  }
  
  // Update the participation document to mark that this raffle has been rated by this user
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


  return { id: docRef.id, ...newRatingData } as Rating;
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


// --- Backup and Restore ---

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

// Function clearAllTestDataFromFirestore removed per user request in previous interaction.
// If it needs to be re-added, its definition would go here.

