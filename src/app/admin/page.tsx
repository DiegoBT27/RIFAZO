
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Users, PackageCheck, ListCollapse, DatabaseZap, HardDriveUpload, ShieldCheck as ShieldCheckIcon, Ticket as TicketIcon, SlidersHorizontal, BarChart2, AlertCircle } from 'lucide-react'; 
import { getPlanDetails } from '@/lib/config/plans';

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
  const planDetails = isAdmin ? getPlanDetails(user?.planActive ? user?.plan : null) : null;

  const cardsConfig = [
    {
      title: "Gestión de Rifas",
      description: isFounder ? 'Crea, visualiza, edita y elimina todas las rifas.' : 'Crea, visualiza, edita y elimina tus rifas.',
      href: "/admin/my-raffles",
      icon: <TicketIcon className="mr-2 h-6 w-6" />,
      roles: ['admin', 'founder'],
    },
    {
      title: "Gestionar Pagos",
      description: isFounder ? 'Confirma o rechaza pagos para todas las rifas.' : 'Confirma o rechaza pagos para tus rifas.',
      href: "/admin/payment-confirmation",
      icon: <PackageCheck className="mr-2 h-6 w-6" />,
      roles: ['admin', 'founder'],
    },
    {
      title: "Análisis de Rifas",
      description: isFounder ? 'Visualiza estadísticas y rendimiento de todas las rifas.' : 'Visualiza estadísticas (acceso según plan).',
      href: "/admin/raffle-analytics",
      icon: <BarChart2 className="mr-2 h-6 w-6" />,
      roles: ['admin', 'founder'], // Page handles plan-based access for admin
    },
    {
      title: "Copia de Seguridad",
      description: isFounder ? "Crea y restaura copias de seguridad de los datos." : "Crea copias de seguridad de tus datos (acceso según plan).",
      href: "/admin/backup-restore",
      icon: <HardDriveUpload className="mr-2 h-6 w-6" />,
      roles: ['admin', 'founder'], // Page handles plan-based access for admin
    },
    {
      title: "Gestionar Usuarios",
      description: "Añade, visualiza, edita o elimina usuarios y administradores.",
      href: "/admin/manage-users",
      icon: <Users className="mr-2 h-6 w-6" />,
      roles: ['founder'],
    },
    {
      title: "Gestionar Planes de Admins",
      description: "Asigna y administra los planes de suscripción para administradores.",
      href: "/admin/manage-admin-plans",
      icon: <ShieldCheckIcon className="mr-2 h-6 w-6" />,
      roles: ['founder'],
    },
    {
      title: "Registros de Actividad",
      description: "Visualiza acciones de administradores en la plataforma.",
      href: "/admin/activity-logs",
      icon: <ListCollapse className="mr-2 h-6 w-6" />,
      roles: ['founder'], // Only founder sees the card, page handles direct access
    },
    {
      title: "Herramientas de Desarrollo",
      description: "Funciones avanzadas para desarrollo y pruebas (Uso con precaución).",
      href: "/admin/dev-tools",
      icon: <SlidersHorizontal className="mr-2 h-6 w-6" />,
      roles: ['founder'],
    },
  ];
  
  const cardsToDisplay = cardsConfig.filter(card => 
    user?.role && card.roles.includes(user.role)
  );

  return (
    <div>
      <SectionTitle>
        {isFounder ? 'Panel de Fundador' : 'Panel de Administrador'}
      </SectionTitle>
      { user && (user.role === 'admin' && user.plan && !user.planActive && user.planEndDate && new Date(user.planEndDate) < new Date()) && (
        <Card className="mb-6 border-destructive bg-destructive/10">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center text-lg">
                    <AlertCircle className="mr-2 h-5 w-5" /> Plan Vencido
                </CardTitle>
                <CardDescription className="text-destructive/80">
                    Tu plan ({planDetails?.displayName || user.plan}) ha vencido. Algunas funcionalidades pueden estar limitadas o no disponibles. 
                    Por favor, <Link href="/plans" className="underline font-semibold">revisa los planes</Link> o contacta a soporte.
                </CardDescription>
            </CardHeader>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardsToDisplay.map((card) => (
            <Card key={card.href} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center text-primary">
                  {card.icon}
                  {card.title}
                </CardTitle>
                <CardDescription>
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={card.href} className="block w-full">
                  <Button className="w-full">
                    Ir a {card.title}
                  </Button>
                </Link>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}

