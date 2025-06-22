

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
  arrayUnion,
  arrayRemove,
  documentId
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

export const getUserByEmail = async (email: string): Promise<ManagedUser | null> => {
  if (!email || email.trim() === '') return null;
  const q = query(usersCollection, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as ManagedUser;
};

export const getUsersByUsernames = async (usernames: string[]): Promise<ManagedUser[]> => {
  if (usernames.length === 0) return [];
  const users: ManagedUser[] = [];
  const CHUNK_SIZE = 30; // Firestore 'in' query limit

  for (let i = 0; i < usernames.length; i += CHUNK_SIZE) {
    const chunk = usernames.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      const q = query(usersCollection, where('username', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() } as ManagedUser);
      });
    }
  }
  return users;
};


export const addUser = async (userData: Omit<ManagedUser, 'id'>): Promise<ManagedUser> => {
  // Server-side validation for duplicates
  const existingUserByUsername = await getUserByUsername(userData.username);
  if (existingUserByUsername) {
    throw new Error("El nombre de usuario ya existe.");
  }
  if (userData.email) {
    const existingUserByEmail = await getUserByEmail(userData.email);
    if (existingUserByEmail) {
      throw new Error("El correo electrónico ya está en uso.");
    }
  }

  const dataToSave: { [key: string]: any } = {
    username: userData.username,
    password: userData.password,
    role: userData.role || 'user',
    isBlocked: userData.isBlocked || false,
    sessionId: null,
    averageRating: 0,
    ratingCount: 0,
    plan: null,
    planActive: false,
    planStartDate: null,
    planEndDate: null,
    planAssignedBy: null,
    rafflesCreatedThisPeriod: 0,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    favoriteRaffleIds: userData.favoriteRaffleIds || [],
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

  const optionalFields: (keyof Omit<ManagedUser, 'id' | 'username' | 'password' | 'role' | 'isBlocked' | 'averageRating' | 'ratingCount' | 'plan' | 'planActive' | 'planStartDate' | 'planEndDate' | 'planAssignedBy' | 'rafflesCreatedThisPeriod' | 'sessionId' | 'failedLoginAttempts' | 'lockoutUntil' | 'favoriteRaffleIds'>)[] = [
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
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) {
    throw new Error("User to update not found.");
  }
  const oldUserData = userSnap.data() as ManagedUser;

  // Server-side validation for duplicates on edit
  if (userData.username && userData.username !== oldUserData.username) {
      const existingUser = await getUserByUsername(userData.username);
      if (existingUser) {
          throw new Error("El nombre de usuario ya existe.");
      }
  }
  if (userData.email && userData.email !== oldUserData.email) {
      const existingUser = await getUserByEmail(userData.email);
      if (existingUser) {
          throw new Error("El correo electrónico ya está en uso.");
      }
  }

  const isRename = userData.username && userData.username !== oldUserData.username;

  if (isRename) {
    const batch = writeBatch(db);
    const oldUsername = oldUserData.username;
    const newUsername = userData.username!;

    // 1. Update the user document itself with all the new data
    const finalUserData = { ...userData };
     // Also update publicAlias if it was matching the old username and not explicitly changed
    if (oldUserData.publicAlias === oldUsername && !finalUserData.publicAlias) {
      finalUserData.publicAlias = newUsername;
    }
    batch.update(userDocRef, finalUserData);

    // 2. Find and update all references to the old username
    const collectionsToUpdate = [
      { coll: rafflesCollection, field: 'creatorUsername' },
      { coll: participationsCollection, field: 'creatorUsername' },
      { coll: participationsCollection, field: 'participantUsername' },
      { coll: raffleResultsCollection, field: 'creatorUsername' },
      { coll: activityLogsCollection, field: 'adminUsername' },
      { coll: ratingsCollection, field: 'organizerUsername' },
      { coll: ratingsCollection, field: 'raterUsername' },
      { coll: usersCollection, field: 'planAssignedBy' },
    ];
    
    for (const { coll, field } of collectionsToUpdate) {
      const q = query(coll, where(field, '==', oldUsername));
      const snapshot = await getDocs(q);
      snapshot.forEach(docToUpdate => {
        batch.update(docToUpdate.ref, { [field]: newUsername });
      });
    }

    await batch.commit();

  } else {
    // Simple update, no rename
    await updateDoc(userDocRef, userData);
  }
};

export const deleteUser = async (userId: string, deleterUsername: string): Promise<void> => {
    const userToDeleteDocRef = doc(db, 'users', userId);
    const userToDeleteSnap = await getDoc(userToDeleteDocRef);

    if (!userToDeleteSnap.exists()) {
        throw new Error("User to delete not found.");
    }
    const userToDelete = { id: userToDeleteSnap.id, ...userToDeleteSnap.data() } as ManagedUser;

    const batch = writeBatch(db);

    // If the user is an admin, gather all associated documents for deletion
    if (userToDelete.role === 'admin' && userToDelete.username) {
        const rafflesQuery = query(rafflesCollection, where('creatorUsername', '==', userToDelete.username));
        const rafflesSnapshot = await getDocs(rafflesQuery);
        const raffleIdsToDelete = rafflesSnapshot.docs.map(d => d.id);
        
        if (raffleIdsToDelete.length > 0) {
            // Delete associated documents in chunks to stay within 'in' query limits
            const CHUNK_SIZE = 30;

            for (let i = 0; i < raffleIdsToDelete.length; i += CHUNK_SIZE) {
                const chunk = raffleIdsToDelete.slice(i, i + CHUNK_SIZE);
                if (chunk.length > 0) {
                    const collectionsToClean = [
                        { coll: participationsCollection, field: 'raffleId' },
                        { coll: raffleResultsCollection, field: 'raffleId' },
                        { coll: ratingsCollection, field: 'raffleId' }
                    ];

                    for (const { coll, field } of collectionsToClean) {
                        const q = query(coll, where(field, 'in', chunk));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(doc => batch.delete(doc.ref));
                    }
                    
                    // Remove these raffles from users' favorites
                    const usersWithFavoriteQuery = query(usersCollection, where('favoriteRaffleIds', 'array-contains-any', chunk));
                    const usersWithFavoriteSnapshot = await getDocs(usersWithFavoriteQuery);
                    usersWithFavoriteSnapshot.forEach(userDoc => {
                        batch.update(userDoc.ref, { favoriteRaffleIds: arrayRemove(...chunk) });
                    });
                }
            }

            // Log and delete the raffles themselves
            rafflesSnapshot.forEach(raffleDoc => {
                const logDocRef = doc(collection(db, 'activityLogs'));
                batch.set(logDocRef, {
                    adminUsername: deleterUsername,
                    actionType: 'RAFFLE_DELETED',
                    targetInfo: `Rifa ID: ${raffleDoc.id}`,
                    details: { raffleId: raffleDoc.id, raffleName: raffleDoc.data().name, deletedAsPartOfUserDeletion: userToDelete.username },
                    timestamp: serverTimestamp()
                });
                batch.delete(raffleDoc.ref);
            });
        }
    }

    // Log the user deletion itself
    const finalLogDocRef = doc(collection(db, 'activityLogs'));
    batch.set(finalLogDocRef, {
        adminUsername: deleterUsername,
        actionType: 'USER_DELETED',
        targetInfo: `Usuario: ${userToDelete.username}`,
        details: { userId: userToDelete.id, username: userToDelete.username, role: userToDelete.role },
        timestamp: serverTimestamp()
    });

    // Finally, delete the user document
    batch.delete(userToDeleteDocRef);
    
    // Commit the entire atomic operation
    await batch.commit();
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

export const resetUserLockout = async (userId: string, adminUsername: string): Promise<void> => {
  const userDoc = doc(db, 'users', userId);
  const userData = await getUserById(userId);
  if (!userData) throw new Error("User not found");

  await updateDoc(userDoc, {
    failedLoginAttempts: 0,
    lockoutUntil: null,
  });

  await addActivityLog({
    adminUsername: adminUsername,
    actionType: 'USER_ACCOUNT_UNLOCKED',
    targetInfo: `Usuario: ${userData.username}`,
    details: { userId: userId, username: userData.username }
  });
};

export const toggleRaffleFavorite = async (userId: string, raffleId: string): Promise<boolean> => {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }
  const userData = userDoc.data() as ManagedUser;
  const isCurrentlyFavorite = userData.favoriteRaffleIds?.includes(raffleId);

  if (isCurrentlyFavorite) {
    await updateDoc(userDocRef, {
      favoriteRaffleIds: arrayRemove(raffleId)
    });
    return false; // It's no longer a favorite
  } else {
    await updateDoc(userDocRef, {
      favoriteRaffleIds: arrayUnion(raffleId)
    });
    return true; // It is now a favorite
  }
};


// Raffle Functions
export const getRaffles = async (): Promise<Raffle[]> => {
  const snapshot = await getDocs(rafflesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Raffle));
};

export const getRafflesByIds = async (ids: string[]): Promise<Raffle[]> => {
  if (ids.length === 0) return [];
  const raffles: Raffle[] = [];
  const CHUNK_SIZE = 30; // Firestore 'in' query limit

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      const q = query(rafflesCollection, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        raffles.push({ id: doc.id, ...doc.data() } as Raffle);
      });
    }
  }
  return raffles;
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
  if (!creator || !creator.id) {
    throw new Error("Información del creador inválida. No se puede crear la rifa.");
  }
  
  const creatorDocRef = doc(db, 'users', creator.id);

  return await runTransaction(db, async (transaction) => {
    const creatorDoc = await transaction.get(creatorDocRef);
    if (!creatorDoc.exists()) {
      throw new Error("El usuario creador no existe en la base de datos.");
    }

    const currentCreatorData = creatorDoc.data() as ManagedUser;
    
    // Server-side plan limit validation
    if (currentCreatorData.role !== 'founder') {
      const planDetails = getPlanDetails(currentCreatorData.planActive ? currentCreatorData.plan : null);
      const rafflesCreated = currentCreatorData.rafflesCreatedThisPeriod || 0;
      
      if (rafflesCreated >= planDetails.raffleLimit) {
        throw new Error(`Límite de creación de rifas (${planDetails.raffleLimit}) alcanzado para tu plan actual (${planDetails.displayName}).`);
      }
      if (raffleData.totalNumbers > planDetails.maxTicketsPerRaffle) {
          throw new Error(`El número de boletos (${raffleData.totalNumbers}) excede el límite de tu plan (${planDetails.maxTicketsPerRaffle}).`);
      }
      if ((raffleData.prizes?.length || 0) > 1 && !planDetails.includesMultiplePrizes) {
          throw new Error(`Tu plan actual no permite rifas con múltiples premios.`);
      }
    }

    // Create the new raffle
    const newRaffleData = { ...raffleData, soldNumbers: [], status: 'active' as const };
    const newRaffleDocRef = doc(collection(db, 'raffles')); // Create a new ref with a unique ID
    transaction.set(newRaffleDocRef, newRaffleData);
    
    const savedRaffle: Raffle = { id: newRaffleDocRef.id, ...newRaffleData };
    
    // Increment the user's raffle count
    if (currentCreatorData.role !== 'founder') {
      transaction.update(creatorDocRef, {
        rafflesCreatedThisPeriod: increment(1)
      });
    }

    // Add activity log
    const sanitizedPrizes = (savedRaffle.prizes || []).map(p => ({
      description: p.description,
      lotteryName: p.lotteryName || null,
      drawTime: p.drawTime || null,
    }));
    
    const logDocRef = doc(collection(db, 'activityLogs'));
    transaction.set(logDocRef, {
      adminUsername: creator.username,
      actionType: 'RAFFLE_CREATED',
      targetInfo: `Rifa: ${savedRaffle.name}`,
      timestamp: serverTimestamp(),
      details: {
        raffleId: savedRaffle.id,
        raffleName: savedRaffle.name,
        prizes: sanitizedPrizes,
      }
    });

    return savedRaffle;
  });
};


export const updateRaffle = async (raffleId: string, raffleData: Partial<Raffle>, editor?: ManagedUser, updatedFields?: string[]): Promise<void> => {
  if (!editor || !editor.id) {
    let errorMessage = "Información del editor inválida para actualizar la rifa.";
    throw new Error(errorMessage);
  }
  
  const raffleDoc = doc(db, 'raffles', raffleId);
  const editorDoc = doc(db, 'users', editor.id);

  await runTransaction(db, async (transaction) => {
    const raffleToEditSnap = await transaction.get(raffleDoc);
    if (!raffleToEditSnap.exists()) {
      throw new Error("Rifa no encontrada para editar.");
    }
    const raffleToEdit = raffleToEditSnap.data() as Raffle;

    const editorSnap = await transaction.get(editorDoc);
    if (!editorSnap.exists()) {
        throw new Error("El usuario editor no existe.");
    }
    const currentEditorData = editorSnap.data() as ManagedUser;

    if (currentEditorData.role !== 'founder') {
      const planDetails = getPlanDetails(currentEditorData.planActive ? currentEditorData.plan : null);
      if (!planDetails.canEditRaffles) {
        throw new Error(`Tu plan actual (${planDetails.displayName}) no permite editar rifas.`);
      }
      if (raffleToEdit.creatorUsername !== currentEditorData.username) {
        throw new Error("No tienes permiso para editar esta rifa porque no eres el creador y no eres fundador.");
      }
      // Server-side validation for plan limits on edit
      if (raffleData.totalNumbers && raffleData.totalNumbers > planDetails.maxTicketsPerRaffle) {
        throw new Error(`El número de boletos (${raffleData.totalNumbers}) excede el límite de tu plan (${planDetails.maxTicketsPerRaffle}).`);
      }
      if (raffleData.prizes && raffleData.prizes.length > 1 && !planDetails.includesMultiplePrizes) {
        throw new Error(`Tu plan actual no permite rifas con múltiples premios.`);
      }
    }
    
    // Critical integrity check: cannot reduce totalNumbers below sold count
    if (raffleData.totalNumbers && raffleData.totalNumbers < raffleToEdit.totalNumbers) {
      const participationsQuery = query(participationsCollection, where('raffleId', '==', raffleId), where('paymentStatus', 'in', ['pending', 'confirmed']));
      const participationsSnap = await getDocs(participationsQuery);
      const soldTickets = participationsSnap.docs.reduce((acc, p) => acc + p.data().numbers.length, 0);
      if (raffleData.totalNumbers < soldTickets) {
        throw new Error(`No se puede reducir el total de números a ${raffleData.totalNumbers}, ya que hay ${soldTickets} boletos vendidos (incluyendo confirmados y pendientes).`);
      }
    }

    transaction.update(raffleDoc, raffleData);

    const logDetails: Record<string, any> = {
      raffleId: raffleId,
      raffleName: raffleData.name || raffleToEdit.name,
    };
    if (updatedFields && updatedFields.length > 0) {
      logDetails.updatedFields = updatedFields;
    }

    const logDocRef = doc(collection(db, 'activityLogs'));
    transaction.set(logDocRef, {
      adminUsername: editor.username,
      actionType: 'RAFFLE_EDITED',
      targetInfo: `Rifa: ${raffleData.name || raffleToEdit.name}`,
      timestamp: serverTimestamp(),
      details: logDetails,
    });
  });
};

export const deleteRaffleAndParticipations = async (raffleId: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Delete the raffle document
  const raffleDoc = doc(db, 'raffles', raffleId);
  batch.delete(raffleDoc);

  // 2. Delete all associated participations
  const participationsQuery = query(participationsCollection, where('raffleId', '==', raffleId));
  const participationsSnapshot = await getDocs(participationsQuery);
  participationsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 3. Delete all associated results
  const resultsQuery = query(raffleResultsCollection, where('raffleId', '==', raffleId));
  const resultsSnapshot = await getDocs(resultsQuery);
  resultsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 4. Delete all associated ratings
  const ratingsQuery = query(ratingsCollection, where('raffleId', '==', raffleId));
  const ratingsSnapshot = await getDocs(ratingsQuery);
  ratingsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // 5. Find users who have this raffle as a favorite and remove it
  const usersWithFavoriteQuery = query(usersCollection, where('favoriteRaffleIds', 'array-contains', raffleId));
  const usersWithFavoriteSnapshot = await getDocs(usersWithFavoriteQuery);
  usersWithFavoriteSnapshot.forEach(userDoc => {
    const userRef = doc(db, 'users', userDoc.id);
    batch.update(userRef, {
      favoriteRaffleIds: arrayRemove(raffleId)
    });
  });

  // Commit all batched writes
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

export const getParticipationsByRaffleIds = async (raffleIds: string[]): Promise<Participation[]> => {
  if (raffleIds.length === 0) return [];
  const participations: Participation[] = [];
  const CHUNK_SIZE = 30; // Firestore 'in' query limit

  for (let i = 0; i < raffleIds.length; i += CHUNK_SIZE) {
    const chunk = raffleIds.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      const q = query(participationsCollection, where('raffleId', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        participations.push({ id: doc.id, ...doc.data() } as Participation);
      });
    }
  }
  return participations;
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
  
  const batch = writeBatch(db);

  // 1. Update the organizer's average rating
  if (organizerUser && organizerUser.id) {
    const organizerUserRef = doc(db, "users", organizerUser.id);
    batch.update(organizerUserRef, {
      averageRating: increment((ratingData.ratingStars - (organizerUser.averageRating || 0)) / ((organizerUser.ratingCount || 0) + 1)),
      ratingCount: increment(1),
    });
  }
  
  // 2. Mark the participation as rated
  const participationsQuery = query(
    participationsCollection,
    where('raffleId', '==', ratingData.raffleId),
    where('participantUsername', '==', ratingData.raterUsername)
  );
  const participationsSnapshot = await getDocs(participationsQuery);
  if (!participationsSnapshot.empty) {
    const participationDocToUpdate = participationsSnapshot.docs[0];
    batch.update(participationDocToUpdate.ref, { userHasRatedOrganizerForRaffle: true });
  }

  await batch.commit();

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

export const getRatingsByRaterUsername = async (raterUsername: string): Promise<Rating[]> => {
  const q = query(ratingsCollection, where('raterUsername', '==', raterUsername));
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

export const exportFirestoreCollections = async (
  collectionNames: string[],
  forAdminUsername?: string
): Promise<Record<string, any[]>> => {
  const data: Record<string, any[]> = {};
  let adminRaffleIds: string[] = [];

  if (forAdminUsername) {
    // 1. Fetch admin's own raffles
    const rafflesQuery = query(collection(db, 'raffles'), where('creatorUsername', '==', forAdminUsername));
    const rafflesSnapshot = await getDocs(rafflesQuery);
    if (!rafflesSnapshot.empty) {
      data['raffles'] = rafflesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...serializeDocument(doc.data()),
      }));
      adminRaffleIds = rafflesSnapshot.docs.map(doc => doc.id);
    } else {
      data['raffles'] = [];
    }
  }

  for (const collectionName of collectionNames) {
    if (forAdminUsername) {
      if (collectionName === 'raffles') continue; // Already handled
      if (collectionName === 'users') continue; // Admins cannot backup users collection

      let items: any[] = [];
      const CHUNK_SIZE = 30; // Firestore 'in' query limit

      switch (collectionName) {
        case 'participations':
          if (adminRaffleIds.length > 0) {
            for (let i = 0; i < adminRaffleIds.length; i += CHUNK_SIZE) {
              const chunk = adminRaffleIds.slice(i, i + CHUNK_SIZE);
              if (chunk.length > 0) {
                const participationsQuery = query(collection(db, 'participations'), where('raffleId', 'in', chunk));
                const snapshot = await getDocs(participationsQuery);
                snapshot.docs.forEach(doc => {
                  items.push({ id: doc.id, ...serializeDocument(doc.data()) });
                });
              }
            }
          }
          data[collectionName] = items;
          break;
        case 'raffleResults':
          if (adminRaffleIds.length > 0) {
            for (let i = 0; i < adminRaffleIds.length; i += CHUNK_SIZE) {
              const chunk = adminRaffleIds.slice(i, i + CHUNK_SIZE);
              if (chunk.length > 0) {
                const resultsQuery = query(collection(db, 'raffleResults'), where('raffleId', 'in', chunk));
                const snapshot = await getDocs(resultsQuery);
                snapshot.docs.forEach(doc => {
                  items.push({ id: doc.id, ...serializeDocument(doc.data()) });
                });
              }
            }
          }
          data[collectionName] = items;
          break;
        case 'activityLogs':
          const activityLogsQuery = query(collection(db, 'activityLogs'), where('adminUsername', '==', forAdminUsername));
          const activityLogsSnapshot = await getDocs(activityLogsQuery);
          data[collectionName] = activityLogsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...serializeDocument(doc.data()),
          }));
          break;
        default:
          data[collectionName] = [];
      }
    } else { // Founder backup - backup all specified collections
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      data[collectionName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...serializeDocument(doc.data()),
      }));
    }
  }
  return data;
};


const deleteAllDocumentsInCollection = async (collectionName: string): Promise<number> => {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  let deletedCount = 0;
  snapshot.docs.forEach(doc => {
    // CRITICAL SAFETY NET: Do not delete the 'fundador' user.
    if (collectionName === 'users' && doc.data().username === 'fundador') {
      return;
    }
    batch.delete(doc.ref);
    deletedCount++;
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
      summary.push(msg);
      continue;
    }

    try {
      const deletedCount = await deleteAllDocumentsInCollection(collectionName);
      summary.push(`${deletedCount} documentos eliminados de "${collectionName}".`);

      const batch = writeBatch(db);
      const collectionData = dataToImport[collectionName];
      let importedCount = 0;

      for (const docData of collectionData) {
        const { id, ...restOfData } = docData;
        if (!id) {
          continue;
        }
        const docRef = doc(db, collectionName, id);
        batch.set(docRef, deserializeDocument(restOfData));
        importedCount++;
      }

      await batch.commit();
      summary.push(`${importedCount} documentos importados a "${collectionName}".`);

    } catch (error: any) {
      const errorMsg = `Error restaurando la colección "${collectionName}": ${error.message}`;
      console.error(errorMsg, error);
      errors.push(errorMsg);
      summary.push(`Fallo al restaurar "${collectionName}".`);
    }
  }
  return { success: errors.length === 0, errors, summary };
};
