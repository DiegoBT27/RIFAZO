
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, Edit, AlertCircle, Inbox, PackagePlus, Trash2, Trophy, CalendarCheck2, AlertTriangle, Phone, ShieldAlert } from 'lucide-react';
import type { Raffle } from '@/types';
import { getRaffles, deleteRaffleAndParticipations, addActivityLog, getRaffleById } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RegisterWinnerDialog from '@/components/admin/RegisterWinnerDialog';
import PlanLimitDialog from '@/components/admin/PlanLimitDialog';
import { getPlanDetails } from '@/lib/config/plans'; 

export default function MyRafflesPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [myRaffles, setMyRaffles] = useState<Raffle[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const [isWinnerDialogOpen, setIsWinnerDialogOpen] = useState(false);
  const [selectedRaffleForWinner, setSelectedRaffleForWinner] = useState<Raffle | null>(null);
  const [isPlanLimitDialogOpen, setIsPlanLimitDialogOpen] = useState(false);
  const [planLimitFeatureName, setPlanLimitFeatureName] = useState("esta acción");

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
      
      filteredRaffles.sort((a, b) => {
        const getStatusOrder = (status?: string) => {
          if (status === 'active' || status === 'pending_draw') return 1;
          if (status === 'completed') return 2;
          if (status === 'cancelled') return 3;
          return 4; 
        };
        const statusOrderA = getStatusOrder(a.status);
        const statusOrderB = getStatusOrder(b.status);
        if (statusOrderA !== statusOrderB) return statusOrderA - statusOrderB;
        return new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime();
      });
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

  const handleDeleteRaffleConfirm = async (raffleId: string) => {
    if (!user?.username) {
        toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
        return;
    }
    try {
      const raffleToDelete = await getRaffleById(raffleId); 
      await deleteRaffleAndParticipations(raffleId);
      
      if (raffleToDelete) {
        await addActivityLog({
            adminUsername: user.username,
            actionType: 'RAFFLE_DELETED',
            targetInfo: `Rifa ID: ${raffleId}, Nombre: ${raffleToDelete.name}`,
            details: { raffleId: raffleId, raffleName: raffleToDelete.name, creatorUsername: raffleToDelete.creatorUsername, prize: raffleToDelete.prize }
        });
      }

      toast({ title: "Rifa Eliminada", description: "La rifa y todos sus datos asociados han sido eliminados." });
      fetchMyRaffles(); 
    } catch (error) {
      console.error("Error deleting raffle:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la rifa.", variant: "destructive" });
    }
  };

  const handleOpenWinnerDialog = (raffle: Raffle) => {
    setSelectedRaffleForWinner(raffle);
    setIsWinnerDialogOpen(true);
  };
  
  const getRaffleStatusBadge = (raffle: Raffle) => {
    const drawDate = new Date(raffle.drawDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);

    if (raffle.status === 'completed') {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">Completada</Badge>;
    }
    if (raffle.status === 'cancelled') {
      return <Badge variant="destructive" className="text-xs">Cancelada</Badge>;
    }
    if (drawDate < today && (raffle.status === 'active' || raffle.status === 'pending_draw')) { 
      return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90 text-xs">Pendiente Sorteo</Badge>;
    }
    if (raffle.status === 'active') {
      return <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Activa</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Desconocido</Badge>;
  };

  const handleEditRaffleClick = (raffleId: string) => {
    if (!user) return;
    const isFounder = user.role === 'founder';
    const targetRaffle = myRaffles.find(r => r.id === raffleId);
    const isAdminCreator = user.role === 'admin' && targetRaffle?.creatorUsername === user.username;
    const planDetails = getPlanDetails(user.planActive ? user.plan : null);

    if (isFounder) {
        router.push(`/admin/my-raffles/${raffleId}/edit`);
        return;
    }
    
    if (isAdminCreator) {
        if (planDetails.canEditRaffles === true) {
            router.push(`/admin/my-raffles/${raffleId}/edit`);
            return;
        } else if (planDetails.canEditRaffles === 'limited') {
            if ((user.rafflesEditedThisPeriod || 0) < (planDetails.editRaffleLimit || Infinity)) {
                router.push(`/admin/my-raffles/${raffleId}/edit`);
                return;
            } else {
                setPlanLimitFeatureName(`editar más de ${planDetails.editRaffleLimit} rifas`);
                setIsPlanLimitDialogOpen(true);
                return;
            }
        }
    }
    
    // Default to plan limit dialog if not founder and no other condition met
    setPlanLimitFeatureName("editar rifas");
    setIsPlanLimitDialogOpen(true);
  };


  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando tus rifas...</p>
      </div>
    );
  }

  if (!isLoggedIn || (user?.role !== 'admin' && user?.role !== 'founder')) {
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
        {user?.role === 'founder' ? 'Gestionar Todas las Rifas' : 'Mis Rifas Creadas'}
      </SectionTitle>
      
      <div className="mb-6 flex justify-end">
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/admin/create-raffle">
            <PackagePlus className="mr-2 h-5 w-5" /> Crear Nueva Rifa
          </Link>
        </Button>
      </div>

      {myRaffles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myRaffles.map((raffle) => {
            const drawDateObj = new Date(raffle.drawDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0,0,0,0);
            const drawDateHasPassed = drawDateObj < today;
            
            const canRegisterWinner = (drawDateHasPassed || raffle.status === 'pending_draw') && raffle.status !== 'completed' && raffle.status !== 'cancelled';
            
            const isFounder = user?.role === 'founder';
            const isAdminCreator = user?.role === 'admin' && raffle.creatorUsername === user?.username;
            let canEditThisRaffle = false;
            const planDetails = getPlanDetails(user?.planActive ? user?.plan : null);

            if (isFounder) {
                canEditThisRaffle = true;
            } else if (isAdminCreator) {
                if (planDetails.canEditRaffles === true) {
                    canEditThisRaffle = true;
                } else if (planDetails.canEditRaffles === 'limited') {
                    canEditThisRaffle = (user?.rafflesEditedThisPeriod || 0) < (planDetails.editRaffleLimit || Infinity);
                }
            }
            if (raffle.status === 'completed' || raffle.status === 'cancelled') {
                canEditThisRaffle = false; // Cannot edit completed or cancelled raffles
            }


            const canDeleteRaffle = 
              (user?.role === 'founder') || 
              (user?.role === 'admin' && raffle.creatorUsername === user?.username && raffle.status !== 'completed' && raffle.status !== 'cancelled');


            return (
            <Card key={raffle.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg text-foreground line-clamp-2 flex-grow pr-2">{raffle.name}</CardTitle>
                    {getRaffleStatusBadge(raffle)}
                </div>
                <CardDescription className="text-xs">
                  Sorteo: {drawDateObj.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })} | 
                  Precio: ${raffle.pricePerTicket}
                </CardDescription>
                 {user?.role === 'founder' && raffle.creatorUsername && (
                    <CardDescription className="text-xs italic pt-0.5">
                        Creador: {raffle.creatorUsername}
                    </CardDescription>
                )}
                {raffle.status === 'completed' && (
                    <div className="text-xs mt-1.5 space-y-0.5">
                        <p className="font-medium text-green-700">
                            Nro. Ganador: {raffle.winningNumber != null ? String(raffle.winningNumber) : <span className="italic text-muted-foreground">Pendiente</span>}
                        </p>
                        {raffle.winningNumber != null ? (
                          <>
                            <p className="text-muted-foreground">
                                Ganador: {raffle.winnerName || <span className="italic">No registrado</span>}
                            </p>
                            <p className="text-muted-foreground flex items-center">
                                <Phone className="h-3 w-3 mr-1"/>
                                Tel: {raffle.winnerPhone || <span className="italic">No registrado</span>}
                            </p>
                          </>
                        ) : (
                            <p className="text-muted-foreground italic">Resultado pendiente de registro completo.</p>
                        )}
                    </div>
                )}
              </CardHeader>
              <CardContent className="pt-0 flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{raffle.description}</p>
              </CardContent>
              <CardFooter className="p-4 flex flex-col space-y-2">
                <div className="w-full flex space-x-2">
                    {canEditThisRaffle ? (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-xs h-8" 
                            onClick={() => handleEditRaffleClick(raffle.id)}
                        >
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                        </Button>
                    ) : (
                        // Show disabled button if admin creator but plan doesn't allow or limit reached, or if raffle is completed/cancelled
                        isAdminCreator && raffle.status !== 'completed' && raffle.status !== 'cancelled' &&
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" 
                                onClick={() => handleEditRaffleClick(raffle.id)} // Still call to trigger PlanLimitDialog
                                disabled={!isFounder && (!planDetails.canEditRaffles || (planDetails.canEditRaffles === 'limited' && (user?.rafflesEditedThisPeriod || 0) >= (planDetails.editRaffleLimit || Infinity)))}
                                title={
                                    (!planDetails.canEditRaffles || (planDetails.canEditRaffles === 'limited' && (user?.rafflesEditedThisPeriod || 0) >= (planDetails.editRaffleLimit || Infinity))) 
                                    ? "Límite de edición alcanzado o plan no lo permite." 
                                    : (raffle.status === 'completed' || raffle.status === 'cancelled' ? "No se puede editar una rifa finalizada." : "Editar")
                                }>
                            <ShieldAlert className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" /> Editar (Plan Req.)
                        </Button>
                    )}
                    {canRegisterWinner && (
                    <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => handleOpenWinnerDialog(raffle)}>
                        <Trophy className="mr-2 h-3.5 w-3.5" /> Registrar Ganador
                    </Button>
                    )}
                </div>
                {canDeleteRaffle && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full text-xs h-8 mt-2">
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar Rifa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2 h-5 w-5"/>¿Eliminar Rifa "{raffle.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente la rifa y todos sus datos asociados (participaciones, resultados). No se puede deshacer.
                          {raffle.status === 'completed' && user?.role === 'founder' && " Esta rifa ya está completada."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteRaffleConfirm(raffle.id)} className="bg-destructive hover:bg-destructive/90 text-xs h-8">
                          Sí, Eliminar Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                 {raffle.status === 'completed' && !canDeleteRaffle && user?.role === 'admin' && (
                  <p className="text-xs text-muted-foreground text-center pt-1">Las rifas completadas solo pueden ser eliminadas por un Fundador.</p>
                )}
              </CardFooter>
            </Card>
          )})}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Inbox className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            {user?.role === 'founder' ? 'No hay rifas en la plataforma.' : 'Aún no has creado ninguna rifa.'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ¡Haz clic en "Crear Nueva Rifa" para empezar!
          </p>
        </div>
      )}
      {selectedRaffleForWinner && (
        <RegisterWinnerDialog
          raffle={selectedRaffleForWinner}
          isOpen={isWinnerDialogOpen}
          onOpenChange={setIsWinnerDialogOpen}
          onSuccess={() => {
            fetchMyRaffles(); 
            setSelectedRaffleForWinner(null); 
          }}
        />
      )}
      <PlanLimitDialog 
        isOpen={isPlanLimitDialogOpen} 
        onOpenChange={setIsPlanLimitDialogOpen}
        featureName={planLimitFeatureName}
      />
    </div>
  );
}
