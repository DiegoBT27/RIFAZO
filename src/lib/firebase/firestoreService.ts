

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
  documentId,
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

const getUserByField = async (fieldName: keyof ManagedUser, value: string): Promise<ManagedUser | null> => {
  if (!value || value.trim() === '') return null;
  const q = query(usersCollection, where(fieldName, '==', value));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ManagedUser;
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
  if (await getUserByUsername(userData.username)) {
    throw new Error("El nombre de usuario ya existe.");
  }
  if (userData.email && await getUserByEmail(userData.email)) {
    throw new Error("El correo electrónico ya está en uso.");
  }
  if (userData.idCardNumber && await getUserByField('idCardNumber', userData.idCardNumber)) {
    throw new Error("La cédula de identidad ya está registrada.");
  }
  if (userData.rif && await getUserByField('rif', userData.rif)) {
    throw new Error("El RIF ya está registrado.");
  }
   if (userData.publicAlias && await getUserByField('publicAlias', userData.publicAlias)) {
    throw new Error("El alias público ya está en uso.");
  }
  if (userData.whatsappNumber && await getUserByField('whatsappNumber', userData.whatsappNumber)) {
    throw new Error("El número de WhatsApp ya está registrado.");
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
    'email', 'bio', 'adminPaymentMethodsInfo', 'idCardImageUri', 'commercialName', 'offeredPaymentMethods', 'commitmentAgreed', 'guaranteeAgreed', 'fraudPolicyAgreed', 'termsAgreed', 'infoIsTruthfulAgreed', 'finalTermsAgreed', 'digitalSignature', 'idCardNumber'
  ];

  optionalFields.forEach(field => {
    if (userData[field] !== undefined) {
      dataToSave[field] = userData[field];
    }
  });

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
      const existingUserByEmail = await getUserByEmail(userData.email);
      // Allow update if the found email belongs to the same user (can happen in some race conditions or data states)
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
          throw new Error("El correo electrónico ya está en uso.");
      }
  }

  // --- START: INTELLIGENT ROLE CHANGE LOGIC ---
  const isBeingPromoted = (oldUserData.role === 'user' || oldUserData.role === 'pending_approval') && (userData.role === 'admin' || userData.role === 'founder');
  const isBeingDemoted = oldUserData.role !== 'user' && userData.role === 'user';


  if (isBeingPromoted) {
    const freePlanDetails = PLAN_CONFIG['free'];
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + freePlanDetails.durationDays);

    userData.plan = 'free';
    userData.planActive = true;
    userData.planStartDate = startDate.toISOString();
    userData.planEndDate = endDate.toISOString();
    userData.planAssignedBy = 'system_upgrade';
    userData.rafflesCreatedThisPeriod = 0;
  } else if (isBeingDemoted) {
    // Clear plan data
    userData.plan = null;
    userData.planActive = false;
    userData.planStartDate = null;
    userData.planEndDate = null;
    userData.planAssignedBy = null;
    userData.rafflesCreatedThisPeriod = 0;

    // Clear organizer profile data to maintain data integrity
    userData.organizerType = null;
    userData.fullName = null;
    userData.companyName = null;
    userData.rif = null;
    userData.publicAlias = null;
    userData.whatsappNumber = null;
    userData.locationState = null;
    userData.locationCity = null;
    userData.email = null; 
    userData.bio = null;
    userData.adminPaymentMethodsInfo = null;
    userData.averageRating = 0;
    userData.ratingCount = 0;
  }
  // --- END: INTELLIGENT ROLE CHANGE LOGIC ---


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

    await runTransaction(db, async (transaction) => {
        const userToDeleteSnap = await transaction.get(userToDeleteDocRef);
        if (!userToDeleteSnap.exists()) {
            throw new Error("User to delete not found.");
        }
        const userToDelete = { id: userToDeleteSnap.id, ...userToDeleteSnap.data() } as ManagedUser;

        const rafflesToUpdateTickets: Record<string, number> = {};
        const rafflesToUpdateConfirmed: Record<string, number> = {};

        // 1. Find all participations by this user to determine which raffles need their counts updated.
        const participationsQuery = query(participationsCollection, where('participantUsername', '==', userToDelete.username));
        const participationsSnapshot = await getDocs(participationsQuery);
        
        for (const docSnap of participationsSnapshot.docs) {
            const p = docSnap.data() as Participation;
            if (p.paymentStatus === 'confirmed') {
                rafflesToUpdateTickets[p.raffleId] = (rafflesToUpdateTickets[p.raffleId] || 0) + p.numbers.length;
                rafflesToUpdateConfirmed[p.raffleId] = (rafflesToUpdateConfirmed[p.raffleId] || 0) + 1;
            }
            transaction.delete(docSnap.ref); // Delete the participation document
        }

        // 2. Decrement the counters for each affected raffle
        for (const raffleId in rafflesToUpdateTickets) {
            const ticketDecrement = rafflesToUpdateTickets[raffleId];
            const confirmedDecrement = rafflesToUpdateConfirmed[raffleId] || 0;
            if (ticketDecrement > 0) {
                const raffleRef = doc(db, 'raffles', raffleId);
                const raffleSnap = await transaction.get(raffleRef);
                if (raffleSnap.exists()) {
                  transaction.update(raffleRef, { 
                    soldTicketsCount: increment(-ticketDecrement),
                    confirmedPaymentsCount: increment(-confirmedDecrement)
                  });
                }
            }
        }

        // 3. Delete all ratings submitted by this user
        const ratingsQuery = query(ratingsCollection, where('raterUsername', '==', userToDelete.username));
        const ratingsSnapshot = await getDocs(ratingsQuery);
        ratingsSnapshot.forEach(docSnap => transaction.delete(docSnap.ref));

        // 4. If the user is an admin, delete all their created content
        if (userToDelete.role === 'admin' || userToDelete.role === 'founder') {
            const adminRafflesQuery = query(rafflesCollection, where('creatorUsername', '==', userToDelete.username));
            const adminRafflesSnapshot = await getDocs(adminRafflesQuery);
            const raffleIdsToDelete = adminRafflesSnapshot.docs.map(d => d.id);
            
            if (raffleIdsToDelete.length > 0) {
                const CHUNK_SIZE = 30; // Firestore 'in' query limit for array-contains-any
                for (let i = 0; i < raffleIdsToDelete.length; i += CHUNK_SIZE) {
                    const chunk = raffleIdsToDelete.slice(i, i + CHUNK_SIZE);
                    if (chunk.length === 0) continue;
                    
                    const collectionsToClean = [
                        { coll: participationsCollection, field: 'raffleId' },
                        { coll: raffleResultsCollection, field: 'raffleId' },
                        { coll: ratingsCollection, field: 'raffleId' }
                    ];

                    for (const { coll, field } of collectionsToClean) {
                        const q = query(coll, where(field, 'in', chunk));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(docSnap => transaction.delete(docSnap.ref));
                    }

                    const usersWithFavoriteQuery = query(usersCollection, where('favoriteRaffleIds', 'array-contains-any', chunk));
                    const usersWithFavoriteSnapshot = await getDocs(usersWithFavoriteQuery);
                    usersWithFavoriteSnapshot.forEach(userDoc => {
                        transaction.update(userDoc.ref, { favoriteRaffleIds: arrayRemove(...chunk) });
                    });
                }
                adminRafflesSnapshot.forEach(raffleDoc => transaction.delete(raffleDoc.ref));
            }
        }
        
        // 5. Log the user deletion
        const finalLogDocRef = doc(collection(db, 'activityLogs'));
        transaction.set(finalLogDocRef, {
            adminUsername: deleterUsername,
            actionType: 'USER_DELETED',
            targetInfo: `Usuario: ${userToDelete.username}`,
            details: { 
                userId: userToDelete.id, 
                username: userToDelete.username, 
                role: userToDelete.role,
                participationsDeleted: participationsSnapshot.size,
                ratingsDeleted: ratingsSnapshot.size
            },
            timestamp: serverTimestamp()
        });

        // 6. Finally, delete the user document itself
        transaction.delete(userToDeleteDocRef);
    });
};



export const assignPlanToAdmin = async (
  adminUserId: string,
  planName: PlanName,
  assignerUsername: string,
  customStartDate?: Date | string | null
): Promise<void> => {
  const adminUserDocRef = doc(db, 'users', adminUserId);

  await runTransaction(db, async (transaction) => {
    const adminDoc = await transaction.get(adminUserDocRef);
    if (!adminDoc.exists()) {
      throw new Error("Usuario administrador no encontrado para asignarle un plan.");
    }
    const currentAdminData = adminDoc.data() as ManagedUser;

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

    let counterShouldBeReset = false;
    // Condition 1: Is it a new, different plan?
    if (currentAdminData.plan !== planName) {
        counterShouldBeReset = true;
    } else if (currentAdminData.planEndDate) {
        // Condition 2: Is it the same plan, but the old one has expired? (This is a renewal)
        const oldEndDate = new Date(currentAdminData.planEndDate);
        oldEndDate.setHours(0,0,0,0);
        if (oldEndDate < today) {
            counterShouldBeReset = true; // It's a renewal of an expired plan
        }
    } else if (!currentAdminData.plan) {
        // Condition 3: The user had no plan before.
        counterShouldBeReset = true;
    }


    const planData: Partial<ManagedUser> = {
      plan: planName,
      planActive: !isScheduled,
      planStartDate: effectiveStartDate.toISOString(),
      planEndDate: endDate.toISOString(),
      planAssignedBy: assignerUsername,
    };
    
    if (counterShouldBeReset) {
      planData.rafflesCreatedThisPeriod = 0;
    }

    transaction.update(adminUserDocRef, planData);

    const logDocRef = doc(collection(db, 'activityLogs'));
    transaction.set(logDocRef, {
      adminUsername: assignerUsername,
      actionType: isScheduled ? 'ADMIN_PLAN_SCHEDULED' : 'ADMIN_PLAN_ASSIGNED',
      targetInfo: `Admin: ${currentAdminData.username}, Plan: ${planDetails.displayName}`,
      timestamp: serverTimestamp(),
      details: {
        adminUserId,
        adminUsername: currentAdminData.username,
        planName: planDetails.displayName,
        planStartDate: planData.planStartDate,
        planEndDate: planData.planEndDate,
        isScheduled,
        counterWasReset: counterShouldBeReset
      }
    });
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
  const batch = writeBatch(db);
  let hasUpdates = false;
  const now = new Date();

  const snapshot = await getDocs(rafflesCollection);
  const raffles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Raffle));

  // Lazy publishing logic
  for (const raffle of raffles) {
    if (raffle.status === 'scheduled' && raffle.publicationDate && new Date(raffle.publicationDate) <= now) {
      const raffleDocRef = doc(db, 'raffles', raffle.id);
      batch.update(raffleDocRef, { status: 'active' });
      hasUpdates = true;
      raffle.status = 'active'; // Also update in-memory object
    }
  }

  if (hasUpdates) {
    await batch.commit();
  }

  return raffles;
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

export const addRaffle = async (raffleData: Omit<Raffle, 'id' | 'soldTicketsCount' | 'confirmedPaymentsCount'>, creator: ManagedUser): Promise<Raffle> => {
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
    const newRaffleData = { ...raffleData, soldTicketsCount: 0, confirmedPaymentsCount: 0 };
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
  const raffleDoc = doc(db, 'raffles', raffleId);

  // If no editor is provided, just perform a simple update without logging or validation.
  // This is used for system-level updates like registering a winner.
  if (!editor) {
    await updateDoc(raffleDoc, raffleData);
    return;
  }
  
  // If an editor is provided, run the full validation and logging transaction.
  if (!editor.id) {
    throw new Error("Información del editor inválida para actualizar la rifa.");
  }
  const editorDoc = doc(db, 'users', editor.id);

  // Pre-transaction validation for reducing totalNumbers
  // This check is performed outside the main transaction to allow for a query.
  // While there's a small race condition window, it's a critical safeguard.
  const raffleToEditSnapForValidation = await getDoc(raffleDoc);
  if (!raffleToEditSnapForValidation.exists()) {
    throw new Error("Rifa no encontrada para editar.");
  }
  const raffleToEditForValidation = raffleToEditSnapForValidation.data() as Raffle;
  
  if (raffleData.totalNumbers && raffleData.totalNumbers < raffleToEditForValidation.totalNumbers) {
    const participationsQuery = query(participationsCollection, where('raffleId', '==', raffleId), where('paymentStatus', 'in', ['pending', 'confirmed']));
    const participationsSnap = await getDocs(participationsQuery);
    const soldAndPendingTicketsCount = participationsSnap.docs.reduce((count, pDoc) => {
        const pData = pDoc.data() as Participation;
        return count + (pData.numbers?.length || 0);
    }, 0);
    
    if (raffleData.totalNumbers < soldAndPendingTicketsCount) {
      throw new Error(`No se puede reducir el total de números a ${raffleData.totalNumbers}, ya que hay ${soldAndPendingTicketsCount} boletos vendidos (confirmados y pendientes).`);
    }
  }

  await runTransaction(db, async (transaction) => {
    // Re-read the raffle doc inside the transaction to ensure we have the latest data
    const raffleToEditSnap = await transaction.get(raffleDoc);
    if (!raffleToEditSnap.exists()) {
      // This should ideally not happen if the pre-check passed, but it's a safeguard.
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
      if (raffleData.totalNumbers && raffleData.totalNumbers > planDetails.maxTicketsPerRaffle) {
        throw new Error(`El número de boletos (${raffleData.totalNumbers}) excede el límite de tu plan (${planDetails.maxTicketsPerRaffle}).`);
      }
      if (raffleData.prizes && raffleData.prizes.length > 1 && !planDetails.includesMultiplePrizes) {
        throw new Error(`Tu plan actual no permite rifas con múltiples premios.`);
      }
    }
    
    transaction.update(raffleDoc, raffleData);

    if (updatedFields && updatedFields.length > 0) {
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
    }
  });
};

export const deleteRaffleAndParticipations = async (raffleId: string, currentUser: ManagedUser): Promise<void> => {
  const raffleDocRef = doc(db, 'raffles', raffleId);

  await runTransaction(db, async (transaction) => {
    const raffleDoc = await transaction.get(raffleDocRef);

    if (!raffleDoc.exists()) {
      throw new Error("Raffle not found.");
    }
    const raffleData = raffleDoc.data() as Raffle;

    // Business logic validation INSIDE the transaction for atomicity
    if (currentUser.role === 'admin') {
      if (raffleData.creatorUsername !== currentUser.username) {
        throw new Error("Permission denied: You can only delete your own raffles.");
      }
      if (raffleData.status === 'completed') {
        throw new Error("Permission denied: Admins cannot delete completed raffles.");
      }
      if (raffleData.confirmedPaymentsCount > 0) {
        throw new Error("No se puede eliminar una rifa que ya tiene pagos confirmados.");
      }
    }

    // Because queries are not allowed in transactions, we have to do these reads first
    // This part is not atomic with the delete, but it's the best we can do without cloud functions
    const participationsQuery = query(participationsCollection, where('raffleId', '==', raffleId));
    const participationsSnapshot = await getDocs(participationsQuery);
    
    const resultsQuery = query(raffleResultsCollection, where('raffleId', '==', raffleId));
    const resultsSnapshot = await getDocs(resultsQuery);

    const ratingsQuery = query(ratingsCollection, where('raffleId', '==', raffleId));
    const ratingsSnapshot = await getDocs(ratingsQuery);

    const usersWithFavoriteQuery = query(usersCollection, where('favoriteRaffleIds', 'array-contains', raffleId));
    const usersWithFavoriteSnapshot = await getDocs(usersWithFavoriteQuery);

    // Now perform the writes within the transaction
    transaction.delete(raffleDocRef);
    participationsSnapshot.forEach(doc => transaction.delete(doc.ref));
    resultsSnapshot.forEach(doc => transaction.delete(doc.ref));
    ratingsSnapshot.forEach(doc => transaction.delete(doc.ref));
    usersWithFavoriteSnapshot.forEach(userDoc => {
      transaction.update(userDoc.ref, { favoriteRaffleIds: arrayRemove(raffleId) });
    });
  });

  // Log activity after successful transaction
  await addActivityLog({
    adminUsername: currentUser.username,
    actionType: 'RAFFLE_DELETED',
    targetInfo: `Rifa ID: ${raffleId}`,
    details: { raffleId: raffleId, raffleName: 'N/A' } // Name might not be available
  });
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
  const raffleDocRef = doc(db, 'raffles', participationData.raffleId);

  return await runTransaction(db, async (transaction) => {
    // 1. Get current state of the raffle
    const raffleDoc = await transaction.get(raffleDocRef);
    if (!raffleDoc.exists()) {
      throw new Error("La rifa ya no está disponible.");
    }
    
    // 2. Check if the selected numbers are still available
    const participationsQuery = query(participationsCollection, where('raffleId', '==', participationData.raffleId));
    const participationsSnapshot = await getDocs(participationsQuery);
    const existingNumbers = participationsSnapshot.docs
      .flatMap(doc => (doc.data() as Participation).numbers);
      
    const conflictNumber = participationData.numbers.find(num => existingNumbers.includes(num));
    if (conflictNumber) {
      throw new Error(`El número ${conflictNumber} ya no está disponible. Por favor, selecciona otro.`);
    }

    // 3. If all numbers are available, create the new participation document
    const newParticipationRef = doc(collection(db, 'participations'));
    transaction.set(newParticipationRef, participationData);
    
    // 4. Return the new participation object with its ID
    return { id: newParticipationRef.id, ...participationData };
  });
};

export const updateParticipation = async (participationId: string, participationData: Partial<Participation>): Promise<void> => {
  const participationDocRef = doc(db, 'participations', participationId);

  await runTransaction(db, async (transaction) => {
    const participationDoc = await transaction.get(participationDocRef);
    if (!participationDoc.exists()) {
      throw new Error("Participation not found.");
    }

    const oldParticipationData = participationDoc.data() as Participation;
    const oldStatus = oldParticipationData.paymentStatus;
    const newStatus = participationData.paymentStatus;
    
    if (oldStatus !== newStatus) {
      const raffleDocRef = doc(db, 'raffles', oldParticipationData.raffleId);
      const ticketCount = oldParticipationData.numbers.length;
      
      let soldTicketsIncrement = 0;
      let confirmedPaymentsIncrement = 0;

      if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
        soldTicketsIncrement = ticketCount;
        confirmedPaymentsIncrement = 1;
      } else if (oldStatus === 'confirmed' && newStatus !== 'confirmed') {
        soldTicketsIncrement = -ticketCount;
        confirmedPaymentsIncrement = -1;
      }

      if (soldTicketsIncrement !== 0 || confirmedPaymentsIncrement !== 0) {
        transaction.update(raffleDocRef, { 
          soldTicketsCount: increment(soldTicketsIncrement),
          confirmedPaymentsCount: increment(confirmedPaymentsIncrement),
        });
      }
    }
    
    transaction.update(participationDocRef, participationData);
  });
};

export const deleteParticipation = async (participationId: string): Promise<void> => {
  const participationDocRef = doc(db, 'participations', participationId);

  await runTransaction(db, async (transaction) => {
    const participationDoc = await transaction.get(participationDocRef);
    if (!participationDoc.exists()) {
        return;
    }
    const participationData = participationDoc.data() as Participation;

    if (participationData.paymentStatus === 'confirmed') {
      const raffleDocRef = doc(db, 'raffles', participationData.raffleId);
      const ticketCount = participationData.numbers.length;
      transaction.update(raffleDocRef, { 
        soldTicketsCount: increment(-ticketCount),
        confirmedPaymentsCount: increment(-1)
      });
    }
    
    transaction.delete(participationDocRef);
  });
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
      errors.push(errorMsg);
      summary.push(`Fallo al restaurar "${collectionName}".`);
    }
  }
  return { success: errors.length === 0, errors, summary };
};

export const clearAllTestDataFromFirestore = async (): Promise<{ summary: string[], errors: string[] }> => {
  const summary: string[] = [];
  const errors: string[] = [];
  
  const collectionsToClear = [
    'participations', 
    'raffleResults',
    'activityLogs', 
    'ratings',
    'raffles',
    'users' // 'users' should be last
  ];

  for (const collectionName of collectionsToClear) {
    try {
      const deletedCount = await deleteAllDocumentsInCollection(collectionName);
      summary.push(`Se eliminaron ${deletedCount} documentos de la colección "${collectionName}".`);
    } catch (error: any) {
      const errorMsg = `Error limpiando la colección "${collectionName}": ${error.message}`;
      errors.push(errorMsg);
      summary.push(`Fallo al limpiar "${collectionName}".`);
    }
  }

  return { summary, errors };
};
