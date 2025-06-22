
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Loader2 } from 'lucide-react';

const AdminPaymentManager = dynamic(() => import('@/components/admin/PaymentConfirmationClient'), {
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
      <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Cargando confirmaciones...</p>
    </div>
  ),
  ssr: false,
});

export default function PaymentManagementPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'founder' && user?.role !== 'admin') { 
        router.replace('/');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  if (authIsLoading || !isLoggedIn || (user?.role !== 'founder' && user?.role !== 'admin')) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Gestionar Pagos</SectionTitle>
      <AdminPaymentManager />
    </div>
  );
}

