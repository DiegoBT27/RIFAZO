
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, Edit, AlertCircle, Inbox, PackagePlus } from 'lucide-react';
import type { Raffle } from '@/types';
import { getRaffles } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';

export default function MyRafflesPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [myRaffles, setMyRaffles] = useState<Raffle[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'admin' && user?.role !== 'founder') {
        router.replace('/');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const fetchMyRaffles = useCallback(async () => {
    if (!isLoggedIn || !user || (user.role !== 'admin' && user.role !== 'founder')) {
      setPageIsLoading(false);
      return;
    }

    setPageIsLoading(true);
    try {
      const allRaffles = await getRaffles();
      let filteredRaffles: Raffle[];

      if (user.role === 'founder') {
        filteredRaffles = allRaffles;
      } else if (user.role === 'admin' && user.username) {
        filteredRaffles = allRaffles.filter(raffle => raffle.creatorUsername === user.username);
      } else {
        filteredRaffles = [];
      }
      
      filteredRaffles.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
      setMyRaffles(filteredRaffles);
    } catch (error) {
      console.error("[MyRafflesPage] Error loading raffles from Firestore:", error);
      toast({ title: "Error", description: "No se pudieron cargar tus rifas.", variant: "destructive" });
      setMyRaffles([]);
    } finally {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, toast]);

  useEffect(() => {
    if (!authIsLoading && isLoggedIn) {
      fetchMyRaffles();
    }
  }, [authIsLoading, isLoggedIn, fetchMyRaffles]);

  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando tus rifas...</p>
      </div>
    );
  }

  if (!isLoggedIn || (user?.role !== 'admin' && user?.role !== 'founder')) {
     // This case should ideally be caught by the useEffect redirect, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold">Acceso Denegado</p>
        <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>
        {user.role === 'founder' ? 'Gestionar Todas las Rifas' : 'Mis Rifas Creadas'}
      </SectionTitle>
      
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/admin/create-raffle">
            <PackagePlus className="mr-2 h-5 w-5" /> Crear Nueva Rifa
          </Link>
        </Button>
      </div>

      {myRaffles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myRaffles.map((raffle) => (
            <Card key={raffle.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline text-lg text-foreground line-clamp-2">{raffle.name}</CardTitle>
                <CardDescription className="text-xs">
                  Sorteo: {new Date(raffle.drawDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })} | 
                  Precio: ${raffle.pricePerTicket}
                </CardDescription>
                 {user?.role === 'founder' && raffle.creatorUsername && (
                    <CardDescription className="text-xs italic pt-0.5">
                        Creador: {raffle.creatorUsername}
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3">{raffle.description}</p>
              </CardContent>
              <CardFooter className="p-4">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/admin/my-raffles/${raffle.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Editar Rifa
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Inbox className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            {user.role === 'founder' ? 'No hay rifas en la plataforma.' : 'Aún no has creado ninguna rifa.'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ¡Haz clic en "Crear Nueva Rifa" para empezar!
          </p>
        </div>
      )}
    </div>
  );
}
