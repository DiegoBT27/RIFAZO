
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Loader2, ShieldCheck } from 'lucide-react';

const AdminPlanManagerClient = dynamic(() => import('@/components/admin/AdminPlanManagerClient'), {
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
      <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Cargando gestión de planes...</p>
    </div>
  ),
  ssr: false,
});

export default function ManageAdminPlansPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'founder') { 
        router.replace('/admin'); // Redirect non-founders to admin dashboard or home
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  if (authIsLoading || !isLoggedIn || user?.role !== 'founder') { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle className="flex items-center">
        <ShieldCheck className="mr-3 h-7 w-7 text-primary" />
        GESTIÓN DE PLANES
      </SectionTitle>
      <AdminPlanManagerClient />
    </div>
  );
}
