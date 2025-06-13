
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import CreateRaffleForm from '@/components/admin/CreateRaffleForm';
import { Loader2 } from 'lucide-react';

export default function CreateRafflePage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (!(user?.role === 'admin' || user?.role === 'founder')) { 
        router.replace('/');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  if (authIsLoading || !isLoggedIn || !(user?.role === 'admin' || user?.role === 'founder')) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }
  return (
    <div>
      <SectionTitle>Crear Nueva Rifa</SectionTitle>
      <CreateRaffleForm />
    </div>
  );
}
