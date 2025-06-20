
'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import type { Participation, ManagedUser, Raffle, AcceptedPaymentMethod, Rating } from '@/types'; // Added Rating
import { Ticket, CalendarDays, AlertCircle, CheckCircle, Clock, ShoppingBag, Eye, Info, Loader2, UserCircle as UserCircleIcon, MessageSquare, CreditCard, ListChecks, Trophy, Gift, Phone as PhoneIcon, Star as StarIcon } from 'lucide-react'; // Added StarIcon
import { getParticipationsByUsername, getUserByUsername as getCreatorProfileByUsername, getRaffleById, checkIfUserRatedRaffle } from '@/lib/firebase/firestoreService'; // Added checkIfUserRatedRaffle
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const UserProfileDialog = dynamic(() => import('@/components/shared/UserProfileDialog'), {
  loading: () => <div className="p-4 text-center">Cargando perfil...</div>,
  ssr: false
});

const RateOrganizerDialog = dynamic(() => import('@/components/ratings/RateOrganizerDialog'), {
  loading: () => <div className="p-4 text-center">Cargando formulario de calificación...</div>,
  ssr: false
});

const FALLBACK_ADMIN_WHATSAPP_NUMBER = "584141135956";

const statusIcons: Record<string, { icon: JSX.Element; color: string; title: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-500', title: 'Pendiente de Confirmación por el Organizador' },
  confirmed: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500', title: 'Pago Confirmado' },
  rejected: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500', title: 'Pago Rechazado por el Organizador' },
  unknown: { icon: <Info className="h-4 w-4" />, color: 'text-gray-500', title: 'Estado Desconocido' },
};

const statusTextForDialog: Record<string, string> = {
  pending: 'Pago Pendiente',
  confirmed: 'Pago Confirmado',
  rejected: 'Pago Rechazado por el Organizador (Contacta al organizador)',
  unknown: 'Estado del Pago Desconocido',
};
const statusVariantForDialog: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: 'secondary',
  confirmed: 'default',
  rejected: 'destructive',
  unknown: 'outline',
};


export default function MyParticipationsPage() {
  const { isLoggedIn, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [rafflesMap, setRafflesMap] = useState<Record<string, Raffle>>({});
  const [creatorProfilesMap, setCreatorProfilesMap] = useState<Record<string, ManagedUser>>({});
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<ManagedUser | null>(null);

  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{raffleId: string, raffleName: string, organizerUsername: string} | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);


  useEffect(() => {
    if (!authIsLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, authIsLoading, router]);

  const fetchMyParticipations = useCallback(async () => {
    if (isLoggedIn && user?.username) {
      setPageIsLoading(true);
      try {
        let loadedParticipations = await getParticipationsByUsername(user.username);

        const uniqueCreatorUsernames = Array.from(new Set(loadedParticipations.map(p => p.creatorUsername).filter(Boolean))) as string[];
        const profiles: Record<string, ManagedUser> = {};
        for (const username of uniqueCreatorUsernames) {
            const profile = await getCreatorProfileByUsername(username);
            if (profile) profiles[username] = profile;
        }
        setCreatorProfilesMap(profiles);

        const uniqueRaffleIds = Array.from(new Set(loadedParticipations.map(p => p.raffleId)));
        const currentRafflesMap: Record<string, Raffle> = {};
        for (const raffleId of uniqueRaffleIds) {
          const raffleDetail = await getRaffleById(raffleId);
          if (raffleDetail) {
            currentRafflesMap[raffleId] = raffleDetail;
          } else {
            console.warn(`[MyParticipationsPage] Raffle with ID ${raffleId} not found for a participation.`);
          }
        }
        setRafflesMap(currentRafflesMap);

        // Check if user has rated for each completed and confirmed participation
        loadedParticipations = await Promise.all(loadedParticipations.map(async (p) => {
          const raffle = currentRafflesMap[p.raffleId];
          if (p.paymentStatus === 'confirmed' && raffle?.status === 'completed' && raffle.creatorUsername && user.username) {
            const hasRated = await checkIfUserRatedRaffle(user.username, p.raffleId);
            return { ...p, userHasRatedOrganizerForRaffle: hasRated };
          }
          return { ...p, userHasRatedOrganizerForRaffle: false }; // Default or not applicable
        }));


        loadedParticipations.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setParticipations(loadedParticipations);
      } catch (error) {
        console.error("[MyParticipationsPage] Error loading participations or raffle details from Firestore:", error);
        toast({ title: "Error de Carga", description: "No se pudieron cargar tus participaciones.", variant: "destructive" });
        setParticipations([]);
      } finally {
        setPageIsLoading(false);
      }
    } else if (!authIsLoading) {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user?.username, authIsLoading, toast, refreshKey]); // Added refreshKey

  useEffect(() => {
    fetchMyParticipations();
  }, [fetchMyParticipations]);

  const handleViewProfile = useCallback((profile: ManagedUser) => {
    setSelectedCreatorProfile(profile);
    setIsProfileDialogOpen(true);
  }, []);

  const handleOpenRatingDialog = (raffleId: string, raffleName: string, organizerUsername: string) => {
    setRatingTarget({raffleId, raffleName, organizerUsername});
    setIsRatingDialogOpen(true);
  };

  const handleRatingSubmitted = () => {
    // Trigger a re-fetch of participations to update the "userHasRated" status
    setRefreshKey(prev => prev + 1);
  };


  const handleResendWhatsappMessage = (participation: Participation) => {
    const creatorProfile = participation.creatorUsername ? creatorProfilesMap[participation.creatorUsername] : undefined;
    const organizerWhatsapp = creatorProfile?.whatsappNumber || FALLBACK_ADMIN_WHATSAPP_NUMBER;
    const organizerName = creatorProfile?.publicAlias || participation.creatorUsername || 'Organizador';

    const message = `¡Hola ${organizerName}! Estoy contactándote sobre mi participación registrada:

Rifa: ${participation.raffleName}
A nombre de: ${participation.participantName} ${participation.participantLastName}
Números: ${participation.numbers.join(', ')}
Registrado el: ${new Date(participation.purchaseDate).toLocaleDateString('es-VE')}

Me gustaría coordinar/confirmar el pago. ¡Gracias!
ID de Participación: ${participation.id}`;

    const whatsappUrl = `https://wa.me/${organizerWhatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast({
      title: "Abriendo WhatsApp",
      description: `Se preparó un mensaje para ${organizerName}.`,
    });
  };


  if (authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando sesión...</p>
      </div>
    );
  }

  if (!isLoggedIn && !authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirigiendo a inicio de sesión...</p>
      </div>
    );
  }

  if (pageIsLoading && isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando mis participaciones...</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Mis Boletos Comprados</SectionTitle>
      {participations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {participations.map((participation) => {
            const creatorProfile = participation.creatorUsername ? creatorProfilesMap[participation.creatorUsername] : undefined;
            const participationRaffle = rafflesMap[participation.raffleId];
            const paymentStatusKey = participation.paymentStatus as keyof typeof statusIcons;
            const statusDisplay = statusIcons[paymentStatusKey] || statusIcons.unknown;

            const currentStatusTextForDialog = statusTextForDialog[paymentStatusKey] || statusTextForDialog.unknown;
            const currentStatusVariantForDialog = statusVariantForDialog[paymentStatusKey] || statusVariantForDialog.unknown;

            const isRaffleCompleted = participationRaffle?.status === 'completed';
            const isWinner = isRaffleCompleted && 
                             participationRaffle.winningNumber != null && 
                             participation.numbers.includes(participationRaffle.winningNumber!);
            const winningNumberStr = participationRaffle?.winningNumber != null ? String(participationRaffle.winningNumber) : '';

            const canRate = participation.paymentStatus === 'confirmed' && 
                            isRaffleCompleted && 
                            participationRaffle.creatorUsername && 
                            !participation.userHasRatedOrganizerForRaffle;
            
            return (
            <Dialog key={participation.id}>
              <DialogTrigger asChild>
                <Card className={cn(
                  "shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between cursor-pointer",
                  isWinner && "border-2 border-green-500 bg-green-500/10",
                  isRaffleCompleted && !isWinner && "border-red-500/30 bg-red-500/10"
                )}>
                  <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-base sm:text-lg text-foreground line-clamp-2 flex-grow pr-2">{participationRaffle?.name || participation.raffleName}</CardTitle>
                      <span title={statusDisplay.title} className={`flex-shrink-0 ${statusDisplay.color}`}>
                        {React.cloneElement(statusDisplay.icon, { className: "h-5 w-5"})}
                      </span>
                    </div>
                    {isWinner && (
                      <Badge variant="default" className="mt-1.5 bg-green-600 hover:bg-green-700 text-green-50 py-1 text-xs sm:text-sm w-fit">
                        <Trophy className="mr-1.5 h-4 w-4" /> ¡BOLETO GANADOR!
                      </Badge>
                    )}
                    {isRaffleCompleted && !isWinner && participationRaffle.winningNumber != null && (
                      <Badge variant="outline" className="mt-1.5 border-red-500/70 text-red-600/90 py-1 text-xs sm:text-sm w-fit">
                        <AlertCircle className="mr-1.5 h-4 w-4" /> Nro. Ganador: {winningNumberStr}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-1.5 sm:pt-2 space-y-1 text-xs">
                    <p className="flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Números: <span className="font-semibold ml-1">{participation.numbers.map(n => String(n)).join(', ')}</span></p>
                    <p className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Fecha: <span className="font-semibold ml-1">{new Date(participation.purchaseDate).toLocaleDateString('es-VE')}</span></p>
                    {participation.participantName && (
                      <p className="flex items-center"><UserCircleIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> A nombre de: <span className="font-semibold ml-1">{participation.participantName} {participation.participantLastName}</span></p>
                    )}
                    {creatorProfile && (
                      <p className="flex items-center"><ShoppingBag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> De: <span className="font-semibold ml-1">{creatorProfile.publicAlias || creatorProfile.username}</span></p>
                    )}
                     {isRaffleCompleted && participationRaffle.winningNumber != null && (
                        <p className={cn(
                            "mt-1.5 pt-1.5 border-t border-dashed text-xs",
                            isWinner ? "text-green-700 font-semibold" : "text-muted-foreground"
                        )}>
                            {isWinner ? (
                                `¡Ganaste! Tu número ${winningNumberStr} es el ganador del premio: ${participationRaffle.prize}.`
                            ) : (
                                `Sorteo finalizado. El número ganador fue ${winningNumberStr}.`
                            )}
                        </p>
                    )}
                    {isRaffleCompleted && participation.userHasRatedOrganizerForRaffle && (
                       <p className="text-xs text-green-600 italic mt-1.5">¡Gracias por tu calificación!</p>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 sm:p-4 flex items-center justify-end gap-2">
                     <Button variant="outline" size="sm" className="flex-1 text-xs h-8"><Eye className="mr-1.5 h-3.5 w-3.5"/> Ver Detalles</Button>
                     {creatorProfile && (
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleViewProfile(creatorProfile);}}
                        className="h-8 w-8"
                        title="Ver Perfil del Organizador"
                      >
                        <Info className="h-4 w-4"/>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleResendWhatsappMessage(participation);}}
                      className="h-8 w-8"
                      title="Contactar Organizador por WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4"/>
                    </Button>
                     {canRate && participationRaffle.creatorUsername && (
                       <Button
                        variant="default"
                        size="icon"
                        className="h-8 w-8 bg-yellow-500 hover:bg-yellow-600 text-white"
                        onClick={(e) => {
                           e.stopPropagation(); 
                           handleOpenRatingDialog(participation.raffleId, participationRaffle.name, participationRaffle.creatorUsername!);
                        }}
                        title="Calificar Organizador"
                      >
                        <StarIcon className="h-4 w-4"/>
                      </Button>
                     )}
                  </CardFooter>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle className="font-headline text-lg">Detalles de tu Boleto</DialogTitle>
                    <DialogDescription>
                      Información sobre tu participación en la rifa "{participationRaffle?.name || participation.raffleName}".
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-2">
                    <div className="py-4 space-y-2 text-sm">
                      <p><strong>Rifa:</strong> {participationRaffle?.name || participation.raffleName}</p>
                      <p><strong>Números:</strong> {participation.numbers.map(n => String(n)).join(', ')}</p>
                      <p><strong>Fecha de Compra:</strong> {new Date(participation.purchaseDate).toLocaleString('es-VE')}</p>
                      <p><strong>Estado del Pago:</strong> <Badge variant={currentStatusVariantForDialog} className="py-1"> {React.cloneElement(statusIcons[paymentStatusKey]?.icon || statusIcons.unknown.icon, {className:"h-3.5 w-3.5"})} <span className="ml-1">{currentStatusTextForDialog}</span></Badge></p>
                      {creatorProfile && <p><strong>Organizador:</strong> {creatorProfile.publicAlias || creatorProfile.username}</p>}
                      
                      {participationRaffle?.lotteryName && (
                        <p className="flex items-center">
                          <ListChecks className="mr-1.5 h-4 w-4 text-muted-foreground" />
                          <strong>Método de Rifa:</strong> <span className="ml-1">{participationRaffle.lotteryName}</span>
                        </p>
                      )}
                       {participationRaffle?.drawDate && (
                        <p className="flex items-center">
                          <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" />
                          <strong>Fecha del Sorteo:</strong> <span className="ml-1">{new Date(participationRaffle.drawDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </p>
                      )}
                      {participationRaffle?.drawTime && (
                        <p className="flex items-center">
                          <Clock className="mr-1.5 h-4 w-4 text-muted-foreground" />
                          <strong>Hora del Sorteo:</strong> <span className="ml-1">{participationRaffle.drawTime}</span>
                        </p>
                      )}
                      {participation.paymentNotes && <p><strong>Notas Adicionales del Comprador:</strong> {participation.paymentNotes}</p>}

                      {isRaffleCompleted && participationRaffle.winningNumber != null && (
                        <div className={cn(
                            "mt-3 p-3 rounded-md border space-y-0.5",
                            isWinner ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"
                        )}>
                            <h4 className={cn(
                                "font-semibold text-sm flex items-center mb-1",
                                isWinner ? "text-green-700" : "text-red-700"
                            )}>
                                {isWinner ? <Trophy className="h-4 w-4 mr-1.5" /> : <Gift className="h-4 w-4 mr-1.5" />}
                                Resultado del Sorteo
                            </h4>
                            {isWinner ? (
                                <>
                                  <p className="text-green-700">¡Felicidades! Tu número <strong>{winningNumberStr}</strong> fue el ganador.</p>
                                  <p className="text-muted-foreground">Premio: {participationRaffle.prize}</p>
                                  <p className="text-muted-foreground">Nombre Registrado: {participationRaffle.winnerName || <span className="italic">No registrado</span>}</p>
                                  <p className="text-muted-foreground flex items-center"><PhoneIcon className="h-3.5 w-3.5 mr-1"/> Tel. Contacto: {participationRaffle.winnerPhone || <span className="italic">No registrado</span>}</p>
                                </>
                            ) : (
                                <>
                                  <p className="text-red-700">El sorteo ha finalizado. El número ganador fue: <strong>{winningNumberStr}</strong>.</p>
                                  <p className="text-muted-foreground">Lamentablemente, tus números no resultaron ganadores esta vez.</p>
                                  <p className="text-muted-foreground">Premio de la rifa: {participationRaffle.prize}</p>
                                  <p className="text-muted-foreground">Ganador: {participationRaffle.winnerName || <span className="italic">No registrado</span>}</p>
                                  <p className="text-muted-foreground flex items-center"><PhoneIcon className="h-3.5 w-3.5 mr-1"/>Tel. Ganador: {participationRaffle.winnerPhone || <span className="italic">No registrado</span>}</p>
                                </>
                            )}
                        </div>
                      )}


                      <div className="mt-3 border-t pt-3">
                        <h4 className="font-semibold text-sm text-foreground mb-1.5">Instrucciones de Pago del Organizador:</h4>
                        {participationRaffle?.acceptedPaymentMethods && participationRaffle.acceptedPaymentMethods.length > 0 && (
                          <>
                            <ul className="space-y-1.5 text-xs mb-2">
                              {participationRaffle.acceptedPaymentMethods.map(pm => (
                                <li key={pm.id} className="p-2 bg-muted/30 rounded-md border border-muted-foreground/20">
                                  <p className="font-medium text-foreground flex items-center">
                                    <CreditCard className="h-4 w-4 mr-1.5 text-primary"/> {pm.name}
                                  </p>
                                  {pm.adminProvidedDetails && (
                                    <p className="text-muted-foreground text-xs mt-0.5 ml-5 whitespace-pre-wrap">{pm.adminProvidedDetails}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {creatorProfile?.adminPaymentMethodsInfo && (
                          <div className="mt-2.5 pt-2.5 border-t border-muted-foreground/20">
                             <h5 className="font-medium text-xs text-foreground mb-1">Información General de Pago Adicional:</h5>
                             <p className="text-muted-foreground whitespace-pre-wrap text-xs">{creatorProfile.adminPaymentMethodsInfo}</p>
                          </div>
                        )}
                        <p className="text-muted-foreground italic text-xs mt-2">
                              Por favor, contacta al organizador ({creatorProfile?.publicAlias || participation.creatorUsername || 'RIFAZO'}) vía WhatsApp para coordinar y confirmar tu pago.
                        </p>
                        {(!participationRaffle?.acceptedPaymentMethods || participationRaffle.acceptedPaymentMethods.length === 0) && !creatorProfile?.adminPaymentMethodsInfo && (
                           <p className="text-muted-foreground italic text-xs mt-2">El organizador no ha especificado métodos de pago ni información general. Contacta directamente para coordinar.</p>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="pt-3 border-t">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" size="sm">Cerrar</Button>
                    </DialogClose>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
          )})}
        </div>
      ) : (
         <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
            <p className="text-xl font-semibold text-muted-foreground">Aún no has comprado boletos.</p>
            <p className="text-sm text-muted-foreground mt-1">Explora las rifas disponibles y participa para ganar.</p>
            <Button asChild className="mt-4">
              <Link href="/">Ver Rifas</Link>
            </Button>
          </div>
      )}
      {selectedCreatorProfile && (
        <UserProfileDialog
          userProfile={selectedCreatorProfile}
          isOpen={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
        />
      )}
      {ratingTarget && (
        <RateOrganizerDialog
          raffleId={ratingTarget.raffleId}
          raffleName={ratingTarget.raffleName}
          organizerUsername={ratingTarget.organizerUsername}
          isOpen={isRatingDialogOpen}
          onOpenChange={setIsRatingDialogOpen}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
}
