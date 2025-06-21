

'use client';

import type { ReactNode } from 'react';
import React, from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedUser } from '@/types';
import { initialPlatformUsers } from '@/lib/mock-data';
import { getUsers, getUserByUsername, addUser, updateUser, addActivityLog } from '@/lib/firebase/firestoreService';
import { PLAN_CONFIG } from '@/lib/config/plans'; 
import { differenceInDays } from 'date-fns'; 
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface LoginResult {
  success: boolean;
  reason?: 'blocked' | 'credentials_invalid' | 'account_locked' | 'user_not_found';
  lockoutMinutes?: number;
}

interface AuthContextType {
  user: ManagedUser | null;
  isLoggedIn: boolean;
  isLoading: boolean; 
  login: (usernameInput: string, passwordInput: string) => Promise<LoginResult>;
  logout: (options?: { sessionExpired?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const router = useRouter();

  const checkAndManagePlanStatus = async (currentUserData: ManagedUser): Promise<ManagedUser> => {
    let updatedUser = { ...currentUserData };
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // Check for plan expiration
    if (updatedUser.planActive && updatedUser.planEndDate) {
      const planEndDate = new Date(updatedUser.planEndDate);
      planEndDate.setHours(0,0,0,0); 
      if (planEndDate < today) {
        console.log(`[AuthContext] Plan for user '${updatedUser.username}' has expired. Deactivating.`);
        updatedUser = { 
            ...updatedUser, 
            planActive: false, 
            rafflesCreatedThisPeriod: 0, // Reset counter on expiration
            rafflesEditedThisPeriod: 0, // Reset counter on expiration
        };
        try {
          await updateUser(updatedUser.id, { 
            planActive: false, 
            rafflesCreatedThisPeriod: 0,
            rafflesEditedThisPeriod: 0,
          });
           await addActivityLog({
            adminUsername: 'system',
            actionType: 'ADMIN_PLAN_EXPIRED',
            targetInfo: `Admin: ${updatedUser.username}, Plan: ${updatedUser.plan || 'N/A'}`,
            details: { adminUserId: updatedUser.id, adminUsername: updatedUser.username, oldPlan: updatedUser.plan }
          });
        } catch (error) {
          console.error(`[AuthContext] Failed to update plan status for user '${updatedUser.username}':`, error);
        }
      } else {
        // Check if plan is expiring in 1 day
        const daysUntilExpiry = differenceInDays(planEndDate, today);
        if (daysUntilExpiry === 1) {
            const lastExpiringNotificationKey = `expNotif_${updatedUser.id}_${updatedUser.planEndDate}`;
            if (localStorage.getItem(lastExpiringNotificationKey) !== 'sent') {
                localStorage.setItem(lastExpiringNotificationKey, 'sent'); 
            }
        }
      }
    }

    // Check for scheduled plan activation
    if (!updatedUser.planActive && updatedUser.plan && updatedUser.planStartDate) {
      const planStartDate = new Date(updatedUser.planStartDate);
      planStartDate.setHours(0,0,0,0); 
      if (planStartDate <= today) { 
        let shouldActivate = true;
        if (updatedUser.planEndDate) {
            const planEndDate = new Date(updatedUser.planEndDate);
            planEndDate.setHours(0,0,0,0);
            if (planEndDate < today) {
                shouldActivate = false; 
                 console.log(`[AuthContext] Scheduled plan for '${updatedUser.username}' start date reached, but end date also passed. Plan remains inactive.`);
            }
        }

        if (shouldActivate) {
            console.log(`[AuthContext] Activating scheduled plan for user '${updatedUser.username}'.`);
            updatedUser = { 
                ...updatedUser, 
                planActive: true,
                rafflesCreatedThisPeriod: 0, // Reset counter on new activation
                rafflesEditedThisPeriod: 0, // Reset counter on new activation
            };
            try {
                await updateUser(updatedUser.id, { 
                    planActive: true,
                    rafflesCreatedThisPeriod: 0,
                    rafflesEditedThisPeriod: 0,
                });
                await addActivityLog({
                    adminUsername: 'system',
                    actionType: 'ADMIN_PLAN_ACTIVATED_SCHEDULED',
                    targetInfo: `Admin: ${updatedUser.username}, Plan: ${updatedUser.plan}`,
                    details: { adminUserId: updatedUser.id, adminUsername: updatedUser.username, planName: updatedUser.plan }
                });
            } catch (error) {
                console.error(`[AuthContext] Failed to activate scheduled plan for user '${updatedUser.username}':`, error);
            }
        }
      }
    }
    return updatedUser;
  };
  
  const logout = async (options?: { sessionExpired?: boolean }) => {
    console.log('[AuthContext] Logging out user.');
    const userToLogOut = user; // Capture user before state is cleared
    if (userToLogOut) {
      try {
        await updateUser(userToLogOut.id, { sessionId: null });
        await addActivityLog({
          adminUsername: userToLogOut.username,
          actionType: 'ADMIN_LOGOUT',
          targetInfo: `Usuario: ${userToLogOut.username}`,
          details: { reason: options?.sessionExpired ? 'session_expired' : 'user_initiated' }
        });
      } catch (error) {
          console.error("[AuthContext] Error during logout operations:", error);
      }
    }
    localStorage.removeItem('currentUser');
    setUser(null);
    setIsLoggedIn(false);
    
    const redirectPath = options?.sessionExpired 
        ? '/login?reason=session_expired' 
        : '/login';
    router.push(redirectPath);
  };

  const refreshUser = async () => {
    if (user?.username) {
      setIsLoading(true);
      try {
        const storedUserJSON = localStorage.getItem('currentUser');
        if (!storedUserJSON) {
            logout({ sessionExpired: true });
            return;
        }
        const localUser = JSON.parse(storedUserJSON) as ManagedUser;

        let dbUser = await getUserByUsername(user.username);
        if (dbUser) {
          if (dbUser.sessionId && dbUser.sessionId !== localUser.sessionId) {
            console.warn(`[AuthContext] Session expired during refresh for '${user.username}'. Logging out.`);
            logout({ sessionExpired: true });
            return; 
          }

          dbUser = await checkAndManagePlanStatus(dbUser);
          setUser(dbUser);
          localStorage.setItem('currentUser', JSON.stringify(dbUser));
        } else {
          logout();
        }
      } catch (error) {
        console.error("[AuthContext] Error refreshing user data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };


  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...');
      setIsLoading(true);
      let isAuthenticated = false;
      let currentUserState: ManagedUser | null = null;

      try {
        console.log('[AuthContext] Checking existing users in Firestore...');
        const existingUsers = await getUsers();
        console.log(`[AuthContext] Found ${existingUsers.length} existing users in Firestore.`);

        if (existingUsers.length === 0 && initialPlatformUsers.length > 0) {
          console.log('[AuthContext] No users in Firestore, attempting to seed initial users...');
          for (const initialUser of initialPlatformUsers) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...userData } = initialUser; 
            const userExists = await getUserByUsername(userData.username);
            if (!userExists) {
              console.log(`[AuthContext] Seeding user: ${userData.username}`);
              const fullInitialUser: Omit<ManagedUser, 'id'> = {
                ...userData,
                isBlocked: userData.isBlocked || false,
                plan: userData.plan || null,
                planActive: userData.planActive || false,
                planStartDate: userData.planStartDate || null,
                planEndDate: userData.planEndDate || null,
                planAssignedBy: userData.planAssignedBy || null,
                rafflesCreatedThisPeriod: userData.rafflesCreatedThisPeriod || 0,
                rafflesEditedThisPeriod: userData.rafflesEditedThisPeriod || 0, // Added
                averageRating: userData.averageRating || 0,
                ratingCount: userData.ratingCount || 0,
                failedLoginAttempts: 0,
                lockoutUntil: null,
              };
              await addUser(fullInitialUser); 
            } else {
              console.log(`[AuthContext] User ${userData.username} already exists in Firestore, skipping seed.`);
            }
          }
          console.log('[AuthContext] Initial users seeding process completed or users already present.');
        }

        const storedUserJSON = localStorage.getItem('currentUser');
        console.log('[AuthContext] localStorage currentUser (JSON):', storedUserJSON);
        if (storedUserJSON) {
          const parsedUser: ManagedUser = JSON.parse(storedUserJSON);
          console.log(`[AuthContext] Verifying user '${parsedUser.username}' from localStorage against Firestore...`);
          
          let dbUser = await getUserByUsername(parsedUser.username);
          console.log(`[AuthContext] Firestore user data for '${parsedUser.username}':`, dbUser);
          
          if (dbUser) { 
            if (dbUser.sessionId && dbUser.sessionId !== parsedUser.sessionId) {
              console.warn(`[AuthContext] Session ID mismatch for '${parsedUser.username}'. Local: ${parsedUser.sessionId}, DB: ${dbUser.sessionId}. This session is stale. Redirecting to login.`);
              localStorage.removeItem('currentUser');
              router.push('/login?reason=session_expired');
              setIsLoading(false);
              return;
            }

            if (dbUser.isBlocked === true) {
              console.warn(`[AuthContext] User '${parsedUser.username}' is blocked. Clearing session.`);
              localStorage.removeItem('currentUser');
            } else {
              dbUser = await checkAndManagePlanStatus(dbUser);
              
              currentUserState = dbUser;
              isAuthenticated = true;
              localStorage.setItem('currentUser', JSON.stringify(currentUserState));
              console.log(`[AuthContext] User '${currentUserState.username}' (Role: ${currentUserState.role}, Blocked: ${currentUserState.isBlocked}, Plan Active: ${currentUserState.planActive}) verified. Session is valid.`);
            }
          } else {
            console.warn(`[AuthContext] User '${parsedUser.username}' from localStorage not found in Firestore. Clearing session.`);
            localStorage.removeItem('currentUser');
          }
        } else {
          console.log('[AuthContext] No user session found in localStorage.');
        }
      } catch (error) {
        console.error("[AuthContext] CRITICAL ERROR during initial auth setup or user loading:", error);
        localStorage.removeItem('currentUser');
      } finally {
        setUser(currentUserState);
        setIsLoggedIn(isAuthenticated);
        setIsLoading(false);
        console.log(`[AuthContext] Authentication process finished. isLoading: false, isLoggedIn: ${isAuthenticated}, user:`, currentUserState);
      }
    };
    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const login = async (usernameInput: string, passwordInput: string): Promise<LoginResult> => {
    // setIsLoading(true); // This was the problem - removed
    try {
      const dbUser = await getUserByUsername(usernameInput);

      if (!dbUser) {
        console.warn(`[AuthContext] Login attempt for non-existent user: ${usernameInput}.`);
        return { success: false, reason: 'user_not_found' };
      }

      if (dbUser.lockoutUntil && new Date(dbUser.lockoutUntil) > new Date()) {
        const lockedUntilDate = new Date(dbUser.lockoutUntil);
        const minutesRemaining = Math.ceil((lockedUntilDate.getTime() - new Date().getTime()) / 60000);
        console.warn(`[AuthContext] Login attempt for locked account: ${usernameInput}. Locked for ${minutesRemaining} more minutes.`);
        return { success: false, reason: 'account_locked', lockoutMinutes: minutesRemaining };
      }

      if (dbUser.password === passwordInput) {
        if (dbUser.isBlocked) {
          console.warn(`[AuthContext] Login attempt for blocked user: ${usernameInput}.`);
          return { success: false, reason: 'blocked' };
        }

        if (dbUser.failedLoginAttempts > 0 || dbUser.lockoutUntil) {
          await updateUser(dbUser.id, { failedLoginAttempts: 0, lockoutUntil: null });
        }

        const newSessionId = crypto.randomUUID();
        await updateUser(dbUser.id, { sessionId: newSessionId });
        
        let finalUser = await checkAndManagePlanStatus({ ...dbUser, sessionId: newSessionId });

        localStorage.setItem('currentUser', JSON.stringify(finalUser));
        setUser(finalUser);
        setIsLoggedIn(true);

        await addActivityLog({
          adminUsername: finalUser.username,
          actionType: 'ADMIN_LOGIN',
          targetInfo: `Usuario: ${finalUser.username}`,
          details: { ipAddress: 'N/A', userAgent: 'N/A' }
        });

        if (finalUser.role === 'admin' || finalUser.role === 'founder') {
          router.push('/admin');
        } else {
          router.push('/');
        }
        return { success: true };
      } else {
        const newAttemptCount = (dbUser.failedLoginAttempts || 0) + 1;

        if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
          const lockoutUntilDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await updateUser(dbUser.id, {
            failedLoginAttempts: 0,
            lockoutUntil: lockoutUntilDate.toISOString()
          });
          console.warn(`[AuthContext] User ${usernameInput} locked for ${LOCKOUT_MINUTES} minutes.`);
          return { success: false, reason: 'account_locked', lockoutMinutes: LOCKOUT_MINUTES };
        } else {
          await updateUser(dbUser.id, { failedLoginAttempts: newAttemptCount });
          return { success: false, reason: 'credentials_invalid' };
        }
      }
    } catch (error) {
      console.error("[AuthContext] Error during login:", error);
      return { success: false, reason: 'credentials_invalid' };
    } /* finally { // This was the problem
      setIsLoading(false);
    } */
  };

  useEffect(() => {
    if (!user || !user.id || !isLoggedIn) {
      return; 
    }

    console.log(`[AuthContext] Setting up real-time listener for user: ${user.username} (ID: ${user.id})`);

    const userDocRef = doc(db, 'users', user.id);

    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      console.log(`[AuthContext] Real-time listener fired for user: ${user.username}`);
      if (snapshot.exists()) {
        const dbUser = snapshot.data() as ManagedUser;
        if (dbUser.sessionId && user.sessionId && dbUser.sessionId !== user.sessionId) {
          console.warn(`[AuthContext] Session ID mismatch detected by listener. DB: ${dbUser.sessionId}, Local: ${user.sessionId}. Logging out stale session.`);
          logout({ sessionExpired: true });
        }
      } else {
        console.warn(`[AuthContext] User document for ${user.username} was deleted. Logging out.`);
        logout({ sessionExpired: true });
      }
    }, (error) => {
      console.error("[AuthContext] Error in real-time listener:", error);
    });

    return () => {
      console.log(`[AuthContext] Cleaning up real-time listener for user: ${user.username}`);
      unsubscribe();
    };
  }, [user, isLoggedIn, logout]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
