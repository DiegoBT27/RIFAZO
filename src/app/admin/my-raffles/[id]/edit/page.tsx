
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Loader2, AlertCircle, Edit3 } from 'lucide-react';
import type { Raffle } from '@/types';
import { getRaffleById } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';
import EditRaffleForm from '@/components/admin/EditRaffleForm'; 

export default function EditRafflePage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const raffleId = params?.id as string | undefined;
  const { toast } = useToast();

  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchRaffleDetails = useCallback(async () => {
    if (!isLoggedIn || !user || !raffleId) {
      setPageIsLoading(false); 
      if (!raffleId && user && isLoggedIn) { 
          toast({ title: "Error", description: "ID de rifa no válido.", variant: "destructive" });
          router.replace('/admin/my-raffles');
      }
      return;
    }

    setPageIsLoading(true);
    setAccessDenied(false);
    try {
      const fetchedRaffle = await getRaffleById(raffleId);
      if (fetchedRaffle) {
        const isFounder = user.role === 'founder';
        const isAdminCreator = user.role === 'admin' && fetchedRaffle.creatorUsername === user.username;

        if (isFounder || isAdminCreator) {
          setRaffle(fetchedRaffle);
        } else {
          setAccessDenied(true);
          toast({ title: "Acceso Denegado", description: "No tienes permiso para editar esta rifa.", variant: "destructive" });
          router.replace('/admin/my-raffles');
        }
      } else {
        toast({ title: "No Encontrada", description: "La rifa que intentas editar no existe.", variant: "destructive" });
        router.replace('/admin/my-raffles');
      }
    } catch (error) {
      console.error("[EditRafflePage] Error loading raffle:", error);
      toast({ title: "Error", description: "No se pudo cargar la rifa.", variant: "destructive" });
    } finally {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, raffleId, toast, router]);

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'admin' && user?.role !== 'founder') {
        router.replace('/');
      } else if (raffleId) { 
        fetchRaffleDetails();
      } else {
        console.warn("[EditRafflePage] raffleId is undefined. Params object for debugging:", params);
        setPageIsLoading(false);
        toast({ title: "Error de Carga", description: "No se pudo obtener el ID de la rifa para editar.", variant: "destructive" });
        router.replace('/admin/my-raffles');
      }
    }
  }, [authIsLoading, isLoggedIn, user, router, fetchRaffleDetails, raffleId, toast]); 
  
  const handleFormSuccess = (updatedRaffle: Raffle) => {
    toast({
      title: "Rifa Actualizada",
      description: `La rifa "${updatedRaffle.name}" ha sido guardada exitosamente.`,
    });
    router.push('/admin/my-raffles'); 
  };

  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando datos de la rifa...</p>
      </div>
    );
  }

  if (!isLoggedIn || accessDenied || !raffle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold">
          {accessDenied ? "Acceso Denegado" : "Rifa no encontrada"}
        </p>
        <p className="text-muted-foreground">
          {accessDenied ? "No tienes permisos para editar esta rifa o la rifa no existe." : "No se pudo cargar la rifa para editar."}
        </p>
      </div>
    );
  }
  
  return (
    <div>
      <SectionTitle className="flex items-center">
        <Edit3 className="mr-3 h-7 w-7 text-primary" /> Editar Rifa: {raffle.name}
      </SectionTitle>
      <EditRaffleForm raffle={raffle} onSuccess={handleFormSuccess} />
    </div>
  );
}
