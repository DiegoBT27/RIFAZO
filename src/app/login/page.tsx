
'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { isLoggedIn, isLoading: authIsLoading, user } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    console.log('[LoginPage] useEffect triggered. authIsLoading:', authIsLoading, 'isLoggedIn:', isLoggedIn, 'user:', user);
    if (!authIsLoading && isLoggedIn) {
      console.log('[LoginPage] User IS logged in and auth loading finished. Attempting redirect...');
      if (user?.role === 'founder' || user?.role === 'admin') {
        router.replace('/admin');
        console.log('[LoginPage] Redirecting to /admin');
      } else {
        router.replace('/');
        console.log('[LoginPage] Redirecting to /');
      }
    } else if (!authIsLoading && !isLoggedIn) {
      console.log('[LoginPage] User is NOT logged in and auth loading finished. No redirection needed from useEffect.');
    } else if (authIsLoading) {
      console.log('[LoginPage] Auth is still loading. No redirection from useEffect yet.');
    }
  }, [isLoggedIn, authIsLoading, user, router]);

  if (authIsLoading) { 
    console.log('[LoginPage] Rendering loader because authIsLoading is true.');
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (isLoggedIn) { // authIsLoading is false here
    console.log('[LoginPage] Rendering redirecting message because isLoggedIn is true (and authIsLoading is false).');
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  // authIsLoading is false and isLoggedIn is false here
  console.log('[LoginPage] Rendering LoginForm.');
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
      <LoginForm />
    </div>
  );
}
