
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedUser } from '@/types';
import { initialPlatformUsers } from '@/lib/mock-data';
import { getUsers, getUserByUsername, addUser } from '@/lib/firebase/firestoreService';

interface User {
  username: string;
  role: 'admin' | 'user' | 'founder' | null;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean; // This is specifically for the auth process itself
  login: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Auth loading state
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...');
      setIsLoading(true);
      let isAuthenticated = false;
      let currentUserState: User | null = null;

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
              await addUser(userData);
            } else {
              console.log(`[AuthContext] User ${userData.username} already exists in Firestore, skipping seed.`);
            }
          }
          console.log('[AuthContext] Initial users seeding process completed or users already present.');
        }

        const storedUserJSON = localStorage.getItem('currentUser');
        console.log('[AuthContext] localStorage currentUser (JSON):', storedUserJSON);
        if (storedUserJSON) {
          const parsedUser: User = JSON.parse(storedUserJSON);
          console.log(`[AuthContext] Verifying user '${parsedUser.username}' from localStorage against Firestore...`);
          
          const dbUser = await getUserByUsername(parsedUser.username);
          console.log(`[AuthContext] Firestore user data for '${parsedUser.username}':`, dbUser);
          
          if (dbUser && dbUser.role === parsedUser.role) { // Validate role consistency
            currentUserState = { username: dbUser.username, role: dbUser.role };
            isAuthenticated = true;
            console.log(`[AuthContext] User '${currentUserState.username}' (Role: ${currentUserState.role}) verified. Session is valid.`);
          } else {
            console.warn(`[AuthContext] User '${parsedUser.username}' from localStorage is stale or role mismatch with Firestore. DB role: ${dbUser?.role}, LS role: ${parsedUser.role}. Clearing session.`);
            localStorage.removeItem('currentUser');
          }
        } else {
          console.log('[AuthContext] No user session found in localStorage.');
        }
      } catch (error) {
        console.error("[AuthContext] CRITICAL ERROR during initial auth setup or user loading:", error);
        // Ensure localStorage is cleared on any error during this critical phase
        localStorage.removeItem('currentUser');
        // State will be updated in finally
      } finally {
        setUser(currentUserState);
        setIsLoggedIn(isAuthenticated);
        setIsLoading(false);
        console.log(`[AuthContext] Authentication process finished. isLoading: false, isLoggedIn: ${isAuthenticated}, user:`, currentUserState);
      }
    };
    initializeAuth();
  }, []); // Empty dependency array ensures this runs once on mount

  const login = async (usernameInput: string, passwordInput: string): Promise<boolean> => {
    console.log(`[AuthContext] Attempting login for user: ${usernameInput}`);
    // setIsLoading(true); // Not strictly needed here as login page handles its own loading state
    try {
      const dbUser = await getUserByUsername(usernameInput);
      console.log(`[AuthContext] User data from Firestore for login attempt of '${usernameInput}':`, dbUser);

      if (dbUser && dbUser.password === passwordInput) {
        const userData: User = { username: dbUser.username, role: dbUser.role };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
        // setIsLoading(false);
        console.log(`[AuthContext] Login successful for ${usernameInput}. Role: ${userData.role}. Redirecting...`);
        if (userData.role === 'admin' || userData.role === 'founder') {
          router.push('/admin');
        } else {
          router.push('/');
        }
        return true;
      } else {
         console.warn(`[AuthContext] Login failed for ${usernameInput}. User not found or password incorrect.`);
      }
    } catch (error) {
      console.error("[AuthContext] Error during login:", error);
    }
    
    // Ensure states are cleared if login fails
    localStorage.removeItem('currentUser');
    setUser(null);
    setIsLoggedIn(false);
    // setIsLoading(false);
    return false;
  };

  const logout = () => {
    console.log('[AuthContext] Logging out user.');
    localStorage.removeItem('currentUser');
    setUser(null);
    setIsLoggedIn(false);
    router.push('/login'); // Ensure redirection to login page
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isLoading, login, logout }}>
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

