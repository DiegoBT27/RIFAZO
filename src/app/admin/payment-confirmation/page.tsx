
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
  console.log('[PaymentManagementPage] Component rendering...'); 
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[PaymentManagementPage] useEffect triggered. authIsLoading:', authIsLoading, 'isLoggedIn:', isLoggedIn, 'user:', user); 
    if (!authIsLoading) {
      if (!isLoggedIn) {
        console.log('[PaymentManagementPage] Not logged in, redirecting to /login'); 
        router.replace('/login');
      } else if (user?.role !== 'founder' && user?.role !== 'admin') { 
        console.log('[PaymentManagementPage] User role not founder or admin, redirecting to /'); 
        router.replace('/');
      } else {
        console.log('[PaymentManagementPage] Access granted.'); 
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  if (authIsLoading || !isLoggedIn || (user?.role !== 'founder' && user?.role !== 'admin')) { 
    console.log('[PaymentManagementPage] Showing loading/access denied screen. authIsLoading:', authIsLoading, 'isLoggedIn:', isLoggedIn, 'user:', user); 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  console.log('[PaymentManagementPage] Rendering payment manager.'); 
  return (
    <div>
      <SectionTitle>Gestionar Confirmaciones de Pago</SectionTitle>
      <AdminPaymentManager />
    </div>
  );
}
