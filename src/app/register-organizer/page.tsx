
'use client';

import RegisterOrganizerForm from '@/components/auth/RegisterOrganizerForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import SectionTitle from '@/components/shared/SectionTitle';

export default function RegisterOrganizerPage() {
  const { isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading && isLoggedIn) {
      router.replace('/'); 
    }
  }, [isLoggedIn, authIsLoading, router]);

  if (authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8">
      <SectionTitle className="text-center mb-2">Solicitud para Organizadores</SectionTitle>
      <p className="text-muted-foreground text-center text-sm mb-6 max-w-lg">
        Completa este formulario para solicitar tu cuenta de organizador. Un administrador revisará tu solicitud.
      </p>
      <RegisterOrganizerForm />
    </div>
  );
}
