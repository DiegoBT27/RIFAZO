
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import RaffleCard from '@/components/raffles/RaffleCard';
import SectionTitle from '@/components/shared/SectionTitle';
import type { Raffle, ManagedUser } from '@/types';
import { Loader2, Inbox, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getRaffles, deleteRaffleAndParticipations, getUsersByUsernames } from '@/lib/firebase/firestoreService';

const CreateRaffleForm = dynamic(() => import('@/components/admin/CreateRaffleForm'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>,
  ssr: false
});

const UserProfileDialog = dynamic(() => import('@/components/shared/UserProfileDialog'), {
  loading: () => <div className="p-4 text-center">Cargando perfil...</div>,
  ssr: false
});

export default function HomePage() {
  const { isLoggedIn, isLoading: authIsLoading, user } = useAuth();
  const { toast } = useToast();
  
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ManagedUser>>({});
  const [pageIsLoading, setPageIsLoading] = useState(true);
  
  const [isCreateRaffleDialogOpen, setIsCreateRaffleDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<ManagedUser | null>(null);
  const [rafflesRefreshKey, setRafflesRefreshKey] = useState(0);

  const fetchRafflesAndProfiles = useCallback(async () => {
    setPageIsLoading(true);
    try {
      const allRaffles = await getRaffles();
      const activeRaffles = allRaffles.filter(r => r.status === 'active');
      setRaffles(activeRaffles);

      const creatorUsernames = [...new Set(
        activeRaffles
          .map(r => r.creatorUsername)
          .filter(Boolean) as string[]
      )];
      
      if (creatorUsernames.length > 0) {
        const usersFromDB = await getUsersByUsernames(creatorUsernames);
        const newProfilesMap: Record<string, ManagedUser> = {};
        usersFromDB.forEach(u => { newProfilesMap[u.username] = u; });
        setCreatorProfiles(newProfilesMap);
      }

    } catch (error) {
      console.error("Error loading raffles:", error);
      toast({ title: "Error", description: "No se pudieron cargar las rifas.", variant: "destructive" });
    } finally {
      setPageIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authIsLoading) {
      fetchRafflesAndProfiles();
    }
  }, [authIsLoading, rafflesRefreshKey, fetchRafflesAndProfiles]);

  
  const handleDeleteRaffle = useCallback(async (raffleId: string) => {
    try {
      if (!user) throw new Error("Authentication required.");
      await deleteRaffleAndParticipations(raffleId, user);
      toast({
        title: "Rifa Eliminada",
        description: "La rifa ha sido eliminada.",
      });
      setRaffles(prevRaffles => prevRaffles.filter(r => r.id !== raffleId));
    } catch (error: any) {
      console.error("Error deleting raffle from Firestore:", error);
      toast({
        title: "Error al Eliminar",
        description: error.message || "No se pudo eliminar la rifa de Firestore.",
        variant: "destructive",
      });
    }
  }, [toast, user]);

  const handleViewProfile = useCallback((profile: ManagedUser) => {
    setSelectedCreatorProfile(profile);
    setIsProfileDialogOpen(true);
  }, []);

  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{authIsLoading ? "Verificando sesión..." : "Cargando rifas disponibles..."}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <SectionTitle className="mb-0 flex-grow border-b-0 pb-0 uppercase">
          <span className="text-primary">Rifas</span>
          <span> Disponibles</span>
        </SectionTitle>
        {isLoggedIn && (user?.role === 'admin' || user?.role === 'founder') && (
          <Dialog open={isCreateRaffleDialogOpen} onOpenChange={setIsCreateRaffleDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs sm:text-sm h-9 w-full sm:w-auto flex-shrink-0">
                <PlusCircle className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Crear Rifa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader className="mb-3 sm:mb-4">
                <DialogTitle className="text-lg sm:text-xl">Crear Nueva Rifa</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Completa el formulario para lanzar una nueva rifa. Se guardará en Firestore.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] w-full p-0.5 sm:p-1">
                <CreateRaffleForm onSuccess={(createdRaffle) => {
                  setIsCreateRaffleDialogOpen(false);
                  setRafflesRefreshKey(prev => prev + 1);
                }} />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoggedIn && user && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-secondary/30 rounded-lg shadow">
          <p className="text-sm sm:text-base font-medium text-foreground">
            ¡Bienvenido de nuevo, <span className="font-bold text-primary">{user.username}</span>!
          </p>
          <p className="text-xs text-muted-foreground">
            Tu rol actual es: <Badge variant="outline" className="text-xs">{user.role}</Badge>.
            {user.role === 'founder' && " Tienes acceso total a la plataforma."}
            {user.role === 'admin' && " Puedes crear y gestionar tus rifas, y confirmar pagos."}
            {user.role === 'user' && " Explora las rifas disponibles y participa."}
          </p>
        </div>
      )}
      
      {raffles.length > 0 ? (
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
          {raffles.map((raffle) => {
            const creatorProfile = raffle.creatorUsername ? creatorProfiles[raffle.creatorUsername] : undefined;
            return (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                currentUser={user}
                onDeleteRaffle={handleDeleteRaffle}
                creatorProfile={creatorProfile}
                onViewProfile={handleViewProfile}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Inbox className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/70 mb-3 sm:mb-4" />
          <p className="text-lg sm:text-xl font-semibold text-muted-foreground">
            No hay rifas disponibles en este momento.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isLoggedIn && (user?.role === 'admin' || user?.role === 'founder')
              ? '¡Crea o programa una nueva rifa para empezar!'
              : 'Vuelve más tarde para ver nuevas rifas.'}
          </p>
        </div>
      )}
      
      <UserProfileDialog
        userProfile={selectedCreatorProfile}
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
}
