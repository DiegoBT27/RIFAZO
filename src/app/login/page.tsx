
'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext'; 
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


export default function LoginPage() {
  const { isLoggedIn, isLoading: authIsLoading, user } = useAuth(); 
  const router = useRouter();
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('reason') === 'session_expired') {
          setSessionExpiredMessage("Otra sesión fue iniciada con esta cuenta. Por seguridad, tu sesión ha sido cerrada.");
          
          const newUrl = window.location.pathname;
          window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
    }

    if (!authIsLoading && isLoggedIn) {
      if (user?.role === 'founder' || user?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    }
  }, [isLoggedIn, authIsLoading, user, router]);

  if (authIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (isLoggedIn) { // authIsLoading is false here
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
      </div>
    );
  }

  // authIsLoading is false and isLoggedIn is false here
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
       {sessionExpiredMessage && (
        <Alert variant="destructive" className="mb-6 max-w-md w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sesión Expirada</AlertTitle>
          <AlertDescription>
            {sessionExpiredMessage}
          </AlertDescription>
        </Alert>
      )}
      <LoginForm />
    </div>
  );
}
