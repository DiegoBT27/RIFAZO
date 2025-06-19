
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Users, PackageCheck, ListCollapse, DatabaseZap, HardDriveUpload, ShieldCheck as ShieldCheckIcon, Ticket as TicketIcon, SlidersHorizontal, BarChart2 } from 'lucide-react'; 

export default function AdminDashboardPage() {
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

  if (authIsLoading || (!isLoggedIn && !(user?.role === 'admin' || user?.role === 'founder'))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isFounder = user?.role === 'founder';

  return (
    <div>
      <SectionTitle>
        {isFounder ? 'Panel de Fundador' : 'Panel de Administrador'}
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {(isFounder || isAdmin) && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <TicketIcon className="mr-2 h-6 w-6" />
                Gestión de Rifas
              </CardTitle>
              <CardDescription>
                {isFounder 
                  ? 'Crea, visualiza, edita y elimina todas las rifas de la plataforma.'
                  : 'Crea, visualiza, edita y elimina tus rifas creadas.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/my-raffles" className="block w-full">
                <Button className="w-full">
                  Ir a Gestión de Rifas
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {(isFounder || isAdmin) && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <PackageCheck className="mr-2 h-6 w-6" />
                Gestionar Pagos
              </CardTitle>
              <CardDescription>
                {isFounder 
                  ? 'Confirma o rechaza los pagos reportados por los usuarios para todas las rifas.'
                  : 'Confirma o rechaza los pagos reportados para tus rifas.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/payment-confirmation" className="block w-full">
                <Button className="w-full">
                  Ir a Confirmación de Pagos
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

         {(isFounder || isAdmin) && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <BarChart2 className="mr-2 h-6 w-6" />
                Análisis de Rifas
              </CardTitle>
              <CardDescription>
                Visualiza estadísticas y rendimiento de las rifas.
                {isAdmin && !isFounder && " (Solo tus rifas)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/raffle-analytics" className="block w-full">
                <Button className="w-full">
                  Ver Analíticas
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        
        {isFounder && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <Users className="mr-2 h-6 w-6" />
                Gestionar Usuarios
              </CardTitle>
              <CardDescription>
                 Añade, visualiza, edita o elimina usuarios y administradores de la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/manage-users" className="block w-full">
                <Button className="w-full">
                  Ir a Gestionar Usuarios
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        
        {isFounder && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <ShieldCheckIcon className="mr-2 h-6 w-6" />
                Gestionar Planes de Admins
              </CardTitle>
              <CardDescription>
                 Asigna y administra los planes de suscripción para los usuarios administradores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/manage-admin-plans" className="block w-full">
                <Button className="w-full">
                  Gestionar Planes
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isFounder && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <ListCollapse className="mr-2 h-6 w-6" />
                Registros de Actividad
              </CardTitle>
              <CardDescription>
                 Visualiza las acciones realizadas por los administradores en la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/activity-logs" className="block w-full">
                <Button className="w-full">
                  Ver Registros
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isFounder && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-primary">
                <HardDriveUpload className="mr-2 h-6 w-6" /> 
                Copia de Seguridad
              </CardTitle>
              <CardDescription>
                Crea y restaura copias de seguridad de los datos de la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/backup-restore" className="block w-full">
                <Button className="w-full">
                  Gestionar Copias
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
         
        {isFounder && (
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-1 lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center text-foreground"> 
                <SlidersHorizontal className="mr-2 h-6 w-6" /> 
                Herramientas de Desarrollo
              </CardTitle>
              <CardDescription>
                Funciones avanzadas para desarrollo y pruebas (Uso con precaución).
                Actualmente, la limpieza de datos está deshabilitada.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Link href="/admin/dev-tools" className="block w-full">
                <Button className="w-full" variant="outline">
                  Ir a Herramientas Dev
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
