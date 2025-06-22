
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Participation, Raffle, ActivityLogActionType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, XCircle, Inbox, BadgeEuro, CalendarDays, Ticket, Users, Trash2, AlertTriangle, UserCircle as UserIcon, Phone as PhoneIcon, Hash as HashIcon, Info as InfoIconLucide, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { getParticipations, getRaffles, updateParticipation, deleteParticipation as deleteParticipationFromDB, addActivityLog, getParticipationsByRaffleIds } from '@/lib/firebase/firestoreService';

export default function AdminPaymentManager() {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [allRafflesMap, setAllRafflesMap] = useState<Record<string, Raffle>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
  
  const [submittingStates, setSubmittingStates] = useState<Record<string, boolean>>({});

  const setActionSubmitting = (key: string, state: boolean) => {
    setSubmittingStates(prev => ({ ...prev, [key]: state }));
  };

  const fetchAllDataForAdmin = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const loadedRaffles = await getRaffles();

      const rafflesMap: Record<string, Raffle> = {};
      loadedRaffles.forEach(r => { rafflesMap[r.id] = r; });
      setAllRafflesMap(rafflesMap);

      let participationsToProcess: Participation[];

      if (currentUser.role === 'founder') {
        participationsToProcess = await getParticipations();
      } else if (currentUser.role === 'admin' && currentUser.username) {
        const adminRaffleIds = loadedRaffles
          .filter(raffle => raffle.creatorUsername === currentUser.username)
          .map(raffle => raffle.id);
        
        if (adminRaffleIds.length > 0) {
          participationsToProcess = await getParticipationsByRaffleIds(adminRaffleIds);
        } else {
          participationsToProcess = [];
        }
      } else {
        participationsToProcess = [];
      }
      
      participationsToProcess.sort((a, b) => {
        if (a.paymentStatus === 'pending' && b.paymentStatus !== 'pending') return -1;
        if (a.paymentStatus !== 'pending' && b.paymentStatus === 'pending') return 1;
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      });
      setParticipations(participationsToProcess);

    } catch (error) {
      console.error("Error loading data from Firestore:", error);
      toast({ title: "Error", description: "No se pudieron cargar datos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchAllDataForAdmin();
  }, [fetchAllDataForAdmin]);

  const updateParticipationStatusInDB = async (participation: Participation, newStatus: 'confirmed' | 'rejected') => {
    const actionKey = `${participation.id}_${newStatus}`;
    if (submittingStates[actionKey] || !currentUser?.username) return;

    setActionSubmitting(actionKey, true);

    try {
      const oldStatus = participation.paymentStatus;
      await updateParticipation(participation.id, { paymentStatus: newStatus });
      
      const logActionType: ActivityLogActionType = newStatus === 'confirmed' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REJECTED';
      await addActivityLog({
        adminUsername: currentUser.username,
        actionType: logActionType,
        targetInfo: `Participación ID: ${participation.id} para Rifa: ${participation.raffleName}`,
        details: { 
          participationId: participation.id,
          raffleId: participation.raffleId,
          raffleName: participation.raffleName,
          participantName: `${participation.participantName} ${participation.participantLastName}`,
          numbers: participation.numbers.join(', '),
          oldStatus,
          newStatus,
        }
      });
      
      // Optimistic UI Update
      setParticipations(prev => 
        prev.map(p => p.id === participation.id ? { ...p, paymentStatus: newStatus } : p)
      );

      toast({ title: `Pago ${newStatus === 'confirmed' ? 'Confirmado' : 'Rechazado'}`, description: `El estado del pago ha sido actualizado.` });
    } catch (error) {
      console.error("Error updating participation status in Firestore:", error);
      toast({ title: "Error", description: "No se pudo actualizar el estado del pago.", variant: "destructive" });
    } finally {
      setActionSubmitting(actionKey, false);
    }
  };

  const handleDeleteParticipationConfirm = async (participationId: string) => {
    const deleteKey = `${participationId}_delete`;
    if (submittingStates[deleteKey] || !currentUser?.username) return;
    
    setActionSubmitting(deleteKey, true);

    try {
      const participationToDelete = participations.find(p => p.id === participationId);
      await deleteParticipationFromDB(participationId);

      if (participationToDelete) {
        await addActivityLog({
            adminUsername: currentUser.username,
            actionType: 'PARTICIPATION_DELETED',
            targetInfo: `Participación ID: ${participationId} de Rifa: ${participationToDelete.raffleName}`,
            details: { 
                participationId: participationToDelete.id,
                raffleId: participationToDelete.raffleId,
                raffleName: participationToDelete.raffleName,
                participantName: `${participationToDelete.participantName} ${participationToDelete.participantLastName}`,
                numbers: participationToDelete.numbers.join(', '),
                statusWhenDeleted: participationToDelete.paymentStatus,
            }
        });
      }

      // Optimistic UI Update
      setParticipations(prev => prev.filter(p => p.id !== participationId));
      
      toast({ title: "Participación Eliminada", description: "El registro de participación ha sido eliminado." });
    } catch (error) {
      console.error("Error deleting participation from Firestore:", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar la participación.", variant: "destructive" });
    } finally {
      setActionSubmitting(deleteKey, false);
    }
  };
  
  const getRaffleCreatorUsername = (raffleId: string): string | undefined => {
    return allRafflesMap[raffleId]?.creatorUsername;
  };

  const handleViewProof = (proofUrl: string) => {
    setSelectedProofUrl(proofUrl);
    setIsProofDialogOpen(true);
  };


  if (isLoading || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando datos de pagos...</p>
      </div>
    );
  }

  const pendingParticipations = participations.filter(p => p.paymentStatus === 'pending');
  const processedParticipations = participations.filter(p => p.paymentStatus !== 'pending');

  const renderParticipationDetails = (p: Participation, showActions: boolean = true) => {
    const raffle = allRafflesMap[p.raffleId];
    const creatorUsername = getRaffleCreatorUsername(p.raffleId);

    const confirmKey = `${p.id}_confirmed`;
    const rejectKey = `${p.id}_rejected`;
    const deleteKey = `${p.id}_delete`;

    return (
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
        <div className="text-xs sm:text-sm space-y-1.5 flex-grow">
          <p>
            <strong className="font-semibold text-foreground">{raffle?.name || 'Rifa Desconocida'}</strong> por <Badge variant="outline" className="text-xs">{creatorUsername || 'N/A'}</Badge>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-1">
              <p className="flex items-center"><UserIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> {p.participantName} {p.participantLastName}</p>
              <p className="flex items-center"><HashIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> CI: {p.participantIdCard}</p>
              <p className="flex items-center"><PhoneIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> {p.participantPhone}</p>
              <p className="flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Boletos: {p.numbers.join(', ')}</p>
              <p className="flex items-center col-span-1 md:col-span-2"><CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Fecha Compra: {new Date(p.purchaseDate).toLocaleString('es-VE', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
          </div>
          {p.paymentNotes && (
            <p className="text-xs italic text-muted-foreground mt-1">Notas del pago: {p.paymentNotes}</p>
          )}
        </div>
        {showActions && (
        <div className="mt-3 md:mt-0 md:ml-4 flex items-center sm:items-start gap-2 flex-shrink-0">
          <Button 
            size="icon" 
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 w-8" 
            onClick={() => updateParticipationStatusInDB(p, 'confirmed')} 
            title="Confirmar Pago"
            disabled={submittingStates[confirmKey]}
          >
            {submittingStates[confirmKey] ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
          </Button>
          <Button 
            size="icon" 
            variant="destructive" 
            className="h-8 w-8" 
            onClick={() => updateParticipationStatusInDB(p, 'rejected')} 
            title="Rechazar Pago"
            disabled={submittingStates[rejectKey]}
          >
            {submittingStates[rejectKey] ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" title="Eliminar Registro" disabled={submittingStates[deleteKey]}>
                {submittingStates[deleteKey] ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2"/>¿Eliminar este registro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará permanentemente el registro de participación de {p.participantName} {p.participantLastName} para la rifa "{allRafflesMap[p.raffleId]?.name || 'Desconocida'}". Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDeleteParticipationConfirm(p.id)} 
                  className="bg-destructive hover:bg-destructive/90 text-xs h-8"
                  disabled={submittingStates[deleteKey]}
                >Sí, Eliminar Registro</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl sm:text-2xl flex items-center">
            <BadgeEuro className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary"/> Pagos Pendientes
            <Badge variant="secondary" className="ml-2">{pendingParticipations.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Revisa y procesa los pagos reportados por los usuarios que están pendientes de confirmación.
            {currentUser.role === 'admin' && " Solo verás los pagos correspondientes a las rifas que tú creaste."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingParticipations.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {pendingParticipations.map((p) => (
                <Card key={p.id} className="bg-secondary/30 p-3 sm:p-4">
                  {renderParticipationDetails(p)}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">No hay pagos pendientes.</p>
              <p className="text-sm text-muted-foreground mt-1">Todos los pagos reportados han sido procesados o no hay participaciones pendientes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {processedParticipations.length > 0 && (
        <Card className="shadow-lg mt-6 sm:mt-8">
          <CardHeader>
            <CardTitle className="font-headline text-xl sm:text-2xl flex items-center">
              <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary"/> Pagos Ya Procesados
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Historial de pagos que ya han sido confirmados o rechazados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {processedParticipations.map(p => {
               const deleteKeyProcessed = `${p.id}_delete_processed`;
               return (
                <Card key={p.id} className={`p-3 sm:p-4 border-l-4 ${p.paymentStatus === 'confirmed' ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'}`}>
                  <div className="flex flex-col md:flex-row justify-between md:items-start">
                    {renderParticipationDetails(p, false)} {/* No actions for processed */}
                    <div className="mt-3 md:mt-0 md:ml-4 flex items-center gap-2 flex-shrink-0">
                      {p.paymentStatus === 'confirmed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" title="Confirmado" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" title="Rechazado" />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-7 w-7" title="Eliminar Registro" disabled={submittingStates[deleteKeyProcessed]}>
                            {submittingStates[deleteKeyProcessed] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5"/>}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2"/>¿Eliminar este registro procesado?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a eliminar el registro de {p.participantName} ({p.paymentStatus}) para la rifa "{allRafflesMap[p.raffleId]?.name || 'Desconocida'}". Esto es permanente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteParticipationConfirm(p.id)} 
                                className="bg-destructive hover:bg-destructive/90 text-xs h-8"
                                disabled={submittingStates[deleteKeyProcessed]} 
                              >Sí, Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
               );
            })}
          </CardContent>
        </Card>
      )}
       {(currentUser.role === 'admin' && participations.length === 0 && !isLoading) && (
         <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-8">
            <InfoIconLucide className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
            <p className="text-lg font-semibold text-muted-foreground">No hay participaciones para tus rifas.</p>
            <p className="text-sm text-muted-foreground mt-1">Cuando los usuarios participen en las rifas que creaste, aparecerán aquí para su gestión.</p>
        </div>
       )}
    </div>
  );
}
