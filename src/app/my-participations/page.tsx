
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import type { Participation, ManagedUser } from '@/types';
import { Ticket, CalendarDays, AlertCircle, CheckCircle, Clock, ShoppingBag, Eye, Info, Loader2, UserCircle as UserCircleIcon, MessageSquare } from 'lucide-react';
import { getParticipationsByUsername, getUserByUsername as getCreatorProfileByUsername } from '@/lib/firebase/firestoreService';
import { Badge } from '@/components/ui/badge'; 
import { useToast } from '@/hooks/use-toast';

const UserProfileDialog = dynamic(() => import('@/components/shared/UserProfileDialog'), {
  loading: () => <div className="p-4 text-center">Cargando perfil...</div>,
  ssr: false
});

const FALLBACK_ADMIN_WHATSAPP_NUMBER = "584141135956";

const statusIcons: Record<string, { icon: JSX.Element; color: string; title: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-500', title: 'Pendiente' },
  confirmed: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500', title: 'Confirmado' },
  rejected: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-500', title: 'Rechazado' },
  unknown: { icon: <Info className="h-4 w-4" />, color: 'text-gray-500', title: 'Desconocido' },
};

const statusTextForDialog: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  unknown: 'Desconocido',
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
  const [creatorProfilesMap, setCreatorProfilesMap] = useState<Record<string, ManagedUser>>({});
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<ManagedUser | null>(null);

  useEffect(() => {
    if (!authIsLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, authIsLoading, router]);

  const fetchMyParticipations = useCallback(async () => {
    if (isLoggedIn && user?.username) {
      setPageIsLoading(true);
      try {
        const loadedParticipations = await getParticipationsByUsername(user.username);
        
        const uniqueCreatorUsernames = Array.from(new Set(loadedParticipations.map(p => p.creatorUsername).filter(Boolean))) as string[];
        const profiles: Record<string, ManagedUser> = {};
        for (const username of uniqueCreatorUsernames) {
            const profile = await getCreatorProfileByUsername(username);
            if (profile) profiles[username] = profile;
        }
        setCreatorProfilesMap(profiles);
        
        loadedParticipations.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setParticipations(loadedParticipations);
      } catch (error) {
        console.error("[MyParticipationsPage] Error loading participations from Firestore:", error);
        setParticipations([]);
      } finally {
        setPageIsLoading(false);
      }
    } else if (!authIsLoading) {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, authIsLoading]);

  useEffect(() => {
    fetchMyParticipations();
  }, [fetchMyParticipations]);

  const handleViewProfile = useCallback((profile: ManagedUser) => {
    setSelectedCreatorProfile(profile);
    setIsProfileDialogOpen(true);
  }, []);

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
            const paymentStatusKey = participation.paymentStatus as keyof typeof statusIcons;
            const statusDisplay = statusIcons[paymentStatusKey] || statusIcons.unknown;
            
            const currentStatusTextForDialog = statusTextForDialog[paymentStatusKey] || statusTextForDialog.unknown;
            const currentStatusVariantForDialog = statusVariantForDialog[paymentStatusKey] || statusVariantForDialog.unknown;

            return (
            <Dialog key={participation.id}>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-base sm:text-lg text-foreground line-clamp-2 flex-grow pr-2">{participation.raffleName}</CardTitle>
                    <span title={statusDisplay.title} className={`flex-shrink-0 ${statusDisplay.color}`}>
                      {React.cloneElement(statusDisplay.icon, { className: "h-5 w-5"})}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-1.5 sm:pt-2 space-y-1 text-xs">
                  <p className="flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Números: <span className="font-semibold ml-1">{participation.numbers.join(', ')}</span></p>
                  <p className="flex items-center"><CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Fecha: <span className="font-semibold ml-1">{new Date(participation.purchaseDate).toLocaleDateString('es-VE')}</span></p>
                  {participation.participantName && (
                    <p className="flex items-center"><UserCircleIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> A nombre de: <span className="font-semibold ml-1">{participation.participantName} {participation.participantLastName}</span></p>
                  )}
                  {creatorProfile && (
                    <p className="flex items-center"><ShoppingBag className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> De: <span className="font-semibold ml-1">{creatorProfile.publicAlias || creatorProfile.username}</span></p>
                  )}
                </CardContent>
                <CardFooter className="p-3 sm:p-4 flex gap-2">
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8"><Eye className="mr-1.5 h-3.5 w-3.5"/> Detalles</Button>
                  </DialogTrigger>
                  {creatorProfile && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleViewProfile(creatorProfile)}
                      className="h-8 w-8"
                      title="Ver Perfil del Organizador"
                    >
                      <Info className="h-4 w-4"/>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleResendWhatsappMessage(participation)}
                    className="h-8 w-8"
                    title="Contactar Organizador por WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4"/>
                  </Button>
                </CardFooter>
              </Card>
              <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle className="font-headline text-lg">Detalles de tu Boleto</DialogTitle>
                    <DialogDescription>
                      Información sobre tu participación en la rifa "{participation.raffleName}".
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-2 text-sm">
                    <p><strong>Rifa:</strong> {participation.raffleName}</p>
                    <p><strong>Números:</strong> {participation.numbers.join(', ')}</p>
                    <p><strong>Fecha de Compra:</strong> {new Date(participation.purchaseDate).toLocaleString('es-VE')}</p>
                    <p><strong>Estado del Pago:</strong> <Badge variant={currentStatusVariantForDialog} className="py-1"> {React.cloneElement(statusIcons[paymentStatusKey]?.icon || statusIcons.unknown.icon, {className:"h-3.5 w-3.5"})} <span className="ml-1">{currentStatusTextForDialog}</span></Badge></p>
                    {creatorProfile && <p><strong>Organizador:</strong> {creatorProfile.publicAlias || creatorProfile.username}</p>}
                  </div>
                  <DialogFooter>
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
    </div>
  );
}

