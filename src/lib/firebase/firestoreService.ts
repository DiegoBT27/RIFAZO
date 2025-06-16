
import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Raffle, ManagedUser, Participation, RaffleResult } from '@/types';

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
  };

  const optionalFields: (keyof Omit<ManagedUser, 'id' | 'username' | 'password' | 'role'>)[] = [
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
    username: dataToSave.username,
    password: dataToSave.password, 
    role: dataToSave.role,
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
      
      if (value !== undefined) {
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

  // También eliminar resultados de rifa asociados
  const resultsQuery = query(raffleResultsCollection, where('raffleId', '==', raffleId));
  const resultsSnapshot = await getDocs(resultsQuery);
  resultsSnapshot.forEach(doc => {
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
