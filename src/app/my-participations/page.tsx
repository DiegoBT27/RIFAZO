
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import type { Participation, ManagedUser } from '@/types';
import { Ticket, CalendarDays, AlertCircle, CheckCircle, Clock, ShoppingBag, Eye, Info, Loader2, UserCircle as UserCircleIcon } from 'lucide-react';
import { getParticipationsByUsername, getUserByUsername as getCreatorProfileByUsername } from '@/lib/firebase/firestoreService';

const UserProfileDialog = dynamic(() => import('@/components/shared/UserProfileDialog'), {
  loading: () => <div className="p-4 text-center">Cargando perfil...</div>,
  ssr: false
});

const statusIcons: Record<string, JSX.Element | null> = {
  pending: <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  confirmed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  rejected: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  unknown: <Info className="h-3.5 w-3.5 text-gray-500" />, // Fallback icon
};
const statusText: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
  unknown: 'Desconocido', // Fallback text
};
const statusVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: 'secondary',
  confirmed: 'default',
  rejected: 'destructive',
  unknown: 'outline', // Fallback variant
};


export default function MyParticipationsPage() {
  const { isLoggedIn, isLoading: authIsLoading, user } = useAuth();
  const router = useRouter();
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
            const currentStatusIcon = statusIcons[paymentStatusKey] || statusIcons.unknown;
            const currentStatusText = statusText[paymentStatusKey] || statusText.unknown;
            const currentStatusVariant = statusVariant[paymentStatusKey] || statusVariant.unknown;

            return (
            <Dialog key={participation.id}>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between">
                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
                  <CardTitle className="font-headline text-base sm:text-lg text-foreground line-clamp-2">{participation.raffleName}</CardTitle>
                   <Badge variant={currentStatusVariant} className="mt-1 w-fit text-xs py-1">
                    {currentStatusIcon}
                    <span className="ml-1.5">{currentStatusText}</span>
                  </Badge>
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
                    <Button variant="outline" size="sm" className="flex-grow text-xs h-8"><Eye className="mr-1.5 h-3.5 w-3.5"/> Detalles</Button>
                  </DialogTrigger>
                  {creatorProfile && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewProfile(creatorProfile)}
                      className="flex-grow text-xs h-8"
                    >
                      <Info className="mr-1.5 h-3.5 w-3.5"/> Ver Organizador
                    </Button>
                  )}
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
                    <p><strong>Estado del Pago:</strong> <Badge variant={currentStatusVariant} className="py-1">{currentStatusIcon} <span className="ml-1">{currentStatusText}</span></Badge></p>
                    {participation.participantName && <p><strong>Nombre:</strong> {participation.participantName} {participation.participantLastName}</p>}
                    {participation.participantIdCard && <p><strong>Cédula/ID:</strong> {participation.participantIdCard}</p>}
                    {participation.participantPhone && <p><strong>Teléfono:</strong> {participation.participantPhone}</p>}
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
