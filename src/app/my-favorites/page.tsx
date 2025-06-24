
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Inbox, Ticket as TicketIcon } from 'lucide-react';
import type { Raffle, ManagedUser } from '@/types';
import { getRafflesByIds, getUsersByUsernames, deleteRaffleAndParticipations } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';

const RaffleCard = dynamic(() => import('@/components/raffles/RaffleCard'), {
  loading: () => (
    <div className="flex flex-col h-full w-[21.25rem] shadow-lg rounded-lg p-4 space-y-4">
      <div className="bg-muted rounded h-[250px] animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse"></div>
        <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
      </div>
    </div>
  ),
  ssr: false,
});

const UserProfileDialog = dynamic(() => import('@/components/shared/UserProfileDialog'), {
  loading: () => <div className="p-4 text-center">Cargando perfil...</div>,
  ssr: false
});

export default function MyFavoritesPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [favoriteRaffles, setFavoriteRaffles] = useState<Raffle[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ManagedUser>>({});
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<ManagedUser | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!isLoggedIn || !user?.favoriteRaffleIds) {
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);

    try {
      if (user.favoriteRaffleIds.length === 0) {
        setFavoriteRaffles([]);
        setCreatorProfiles({});
        return;
      }
      
      const raffles = await getRafflesByIds(user.favoriteRaffleIds);
      setFavoriteRaffles(raffles);

      const creatorUsernames = [...new Set(raffles.map(r => r.creatorUsername).filter(Boolean) as string[])];
      if (creatorUsernames.length > 0) {
        const profiles = await getUsersByUsernames(creatorUsernames);
        const profilesMap: Record<string, ManagedUser> = {};
        profiles.forEach(u => { profilesMap[u.username] = u; });
        setCreatorProfiles(profilesMap);
      } else {
        setCreatorProfiles({});
      }

    } catch (error) {
      console.error("Error loading favorite raffles:", error);
      toast({
        title: "Error de Carga",
        description: "No se pudieron cargar tus rifas favoritas.",
        variant: "destructive",
      });
    } finally {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, toast]);

  useEffect(() => {
    if (!authIsLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, authIsLoading, router]);

  useEffect(() => {
    if (!authIsLoading && isLoggedIn) {
      fetchFavorites();
    }
  }, [authIsLoading, isLoggedIn, fetchFavorites, user?.favoriteRaffleIds]);

  const handleDeleteRaffle = useCallback(async (raffleId: string) => {
    if (!user) {
      toast({
        title: "Error de Autenticación",
        description: "No se pudo identificar al usuario para realizar esta acción.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteRaffleAndParticipations(raffleId, user);
      toast({
        title: "Rifa Eliminada",
        description: "La rifa y sus participaciones asociadas han sido eliminadas.",
      });
      fetchFavorites(); // Re-fetch to update the list
    } catch (error: any) {
      console.error("Error deleting raffle:", error);
      toast({
        title: "Error al Eliminar",
        description: error.message || "No se pudo eliminar la rifa.",
        variant: "destructive",
      });
    }
  }, [toast, fetchFavorites, user]);

  const handleViewProfile = useCallback((profile: ManagedUser) => {
    setSelectedCreatorProfile(profile);
    setIsProfileDialogOpen(true);
  }, []);

  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando tus rifas favoritas...</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Mis Rifas Favoritas</SectionTitle>
      {favoriteRaffles.length > 0 ? (
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
          {favoriteRaffles.map((raffle) => {
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
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Inbox className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">No tienes rifas favoritas.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Haz clic en la estrella <Star className="inline-block h-4 w-4 align-text-bottom" /> en cualquier rifa para añadirla aquí.
          </p>
          <Button asChild className="mt-4">
            <Link href="/"><TicketIcon className="mr-2 h-4 w-4" />Ver Rifas</Link>
          </Button>
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
