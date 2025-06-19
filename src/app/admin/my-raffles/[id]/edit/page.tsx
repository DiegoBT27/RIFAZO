
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
import { getPlanDetails } from '@/lib/config/plans';
import PlanLimitDialog from '@/components/admin/PlanLimitDialog';

export default function EditRafflePage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const raffleId = params?.id as string | undefined;
  const { toast } = useToast();

  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlanLimitDialogOpen, setIsPlanLimitDialogOpen] = useState(false);
  const [planLimitMessage, setPlanLimitMessage] = useState("editar rifas");

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
        const planDetails = getPlanDetails(user.planActive ? user.plan : null);

        let canAccessEditPage = false;
        if (isFounder) {
            canAccessEditPage = true;
        } else if (isAdminCreator) {
            if (planDetails.canEditRaffles === true) {
                 canAccessEditPage = true;
            } else if (planDetails.canEditRaffles === 'limited') {
                 if ((user.rafflesEditedThisPeriod || 0) < (planDetails.editRaffleLimit || Infinity)) {
                    canAccessEditPage = true;
                 } else {
                    setPlanLimitMessage(`editar más de ${planDetails.editRaffleLimit} rifas según tu plan`);
                 }
            } else { // canEditRaffles is false
                setPlanLimitMessage("editar rifas según tu plan actual");
            }
        }
        
        if (canAccessEditPage) {
          setRaffle(fetchedRaffle);
        } else {
          setAccessDenied(true);
          if (!isAdminCreator && user.role === 'admin') { // Admin trying to edit someone else's raffle
            toast({ title: "Acceso Denegado", description: "Solo puedes editar las rifas que tú creaste.", variant: "destructive" });
          } else if (isAdminCreator) { // Admin creator but plan doesn't allow or limit reached
             toast({ title: "Límite del Plan", description: `Tu plan no permite ${planLimitMessage}.`, variant: "destructive" });
          } else { // Other access denied reasons
            toast({ title: "Acceso Denegado", description: "No tienes permiso para editar esta rifa.", variant: "destructive" });
          }
          setIsPlanLimitDialogOpen(true); 
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
  }, [isLoggedIn, user, raffleId, toast, router, planLimitMessage]); // Added planLimitMessage

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
     if (isPlanLimitDialogOpen && accessDenied) {
        return (
            <>
             {/* Optional: Render a minimal background if needed while dialog is open */}
             <PlanLimitDialog
                isOpen={isPlanLimitDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsPlanLimitDialogOpen(isOpen);
                    if (!isOpen) router.replace('/admin/my-raffles'); 
                }}
                featureName={planLimitMessage}
             />
            </>
        );
     }
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold">
          {accessDenied ? "Acceso Denegado" : "Rifa no encontrada"}
        </p>
        <p className="text-muted-foreground">
          {accessDenied ? "No tienes permisos para editar esta rifa, tu plan no lo permite, o la rifa ya no existe." : "No se pudo cargar la rifa para editar."}
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
       <PlanLimitDialog
            isOpen={isPlanLimitDialogOpen && accessDenied} 
            onOpenChange={(isOpen) => {
                setIsPlanLimitDialogOpen(isOpen);
                if (!isOpen) router.replace('/admin/my-raffles'); 
            }}
            featureName={planLimitMessage}
        />
    </div>
  );
}
