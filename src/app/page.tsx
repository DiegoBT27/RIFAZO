
'use client';

import { useState, useEffect, useCallback } from 'react';
// Removed useRouter import as it's not directly used for redirection anymore for unauth users
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import RaffleCard from '@/components/raffles/RaffleCard';
import SectionTitle from '@/components/shared/SectionTitle';
import type { Raffle, Participation, ManagedUser } from '@/types';
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
import { getRaffles, getParticipations, deleteRaffleAndParticipations, getUsers as getUsersFromDB } from '@/lib/firebase/firestoreService';

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
  // const router = useRouter(); // No longer needed for unauth redirect
  const { toast } = useToast();
  const [allRaffles, setAllRaffles] = useState<Raffle[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, ManagedUser>>({});
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [isCreateRaffleDialogOpen, setIsCreateRaffleDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<ManagedUser | null>(null);
  const [rafflesRefreshKey, setRafflesRefreshKey] = useState(0);

  // Removed useEffect that redirected to /login if !isLoggedIn

  const loadRafflesAndData = useCallback(async () => {
    setPageIsLoading(true);
    try {
      // Fetch all necessary public data and conditionally user-specific data
      const rafflesFromDB = await getRaffles();
      const usersFromDB = await getUsersFromDB(); // For creator profiles, always attempt
      
      // Fetch all participations to accurately calculate sold numbers for public view.
      const participationsFromDB = await getParticipations();

      const profilesMap: Record<string, ManagedUser> = {};
      usersFromDB.forEach(u => { profilesMap[u.username] = u; });
      setCreatorProfiles(profilesMap);
      
      const rafflesWithDetails = rafflesFromDB.map(raffle => {
        const participationsForThisRaffle = participationsFromDB
          .filter(p => p.raffleId === raffle.id && p.paymentStatus !== 'rejected')
          .flatMap(p => p.numbers);
        
        const effectiveSoldNumbers = Array.from(new Set([...(raffle.soldNumbers || []), ...participationsForThisRaffle]));
        return { ...raffle, effectiveSoldNumbers };
      });
      
      setAllRaffles(rafflesWithDetails);
    } catch (error) {
      console.error("Error loading data from Firestore:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos de las rifas.", variant: "destructive" });
      setAllRaffles([]);
    } finally {
      setPageIsLoading(false);
    }
  }, [toast, rafflesRefreshKey]); 

  useEffect(() => {
    // Load data once auth state is resolved.
    // This ensures data is fetched initially regardless of login status.
    // It will also re-fetch if isLoggedIn or rafflesRefreshKey changes, handled by loadRafflesAndData's own dependencies.
    if (!authIsLoading) {
        loadRafflesAndData();
    }
  }, [authIsLoading, loadRafflesAndData]); // loadRafflesAndData itself depends on things like rafflesRefreshKey

  const handleDeleteRaffle = useCallback(async (raffleId: string) => {
    try {
      await deleteRaffleAndParticipations(raffleId);
      toast({
        title: "Rifa Eliminada",
        description: "La rifa y sus participaciones asociadas han sido eliminadas de Firestore.",
      });
      setRafflesRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting raffle from Firestore:", error);
      toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar la rifa de Firestore.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleViewProfile = useCallback((profile: ManagedUser) => {
    setSelectedCreatorProfile(profile);
    setIsProfileDialogOpen(true);
  }, []);

  // 1. Handle initial authentication loading state
  if (authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando sesión...</p>
      </div>
    );
  }
  
  // 2. Handle loading of page-specific data (raffles)
  // This runs if authIsLoading is false, regardless of isLoggedIn status.
  if (pageIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando rifas disponibles...</p>
      </div>
    );
  }
  
  // 4. Render page content
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentRaffles = allRaffles.filter(raffle => {
    const dateParts = raffle.drawDate.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const drawDate = new Date(year, month, day);
      drawDate.setHours(0, 0, 0, 0);
      return drawDate >= today;
    }
    return false;
  }).sort((a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime());
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <SectionTitle className="mb-0 flex-grow border-b-0 pb-0">Rifas Disponibles</SectionTitle>
        {isLoggedIn && (user?.role === 'admin' || user?.role === 'founder') && (
          <Dialog open={isCreateRaffleDialogOpen} onOpenChange={setIsCreateRaffleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
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

      {isLoggedIn && user && ( // Show welcome message only if logged in
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
      
      {currentRaffles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {currentRaffles.map((raffle) => {
            const creatorProfile = raffle.creatorUsername ? creatorProfiles[raffle.creatorUsername] : undefined;
            return (
              <RaffleCard
                key={raffle.id}
                raffle={raffle}
                currentUser={user} // Pass current user (can be null if not logged in)
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
          <p className="text-lg sm:text-xl font-semibold text-muted-foreground">No hay rifas disponibles en este momento.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isLoggedIn && (user?.role === 'admin' || user?.role === 'founder')
              ? '¡Crea una nueva rifa para empezar!'
              : 'Vuelve más tarde para ver más rifas.'}
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
    
