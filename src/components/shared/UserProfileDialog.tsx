
'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ManagedUser, Rating } from '@/types';
import { Info, MapPin, ThumbsUp, Loader2, BadgeInfo } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { getUserByUsername, getRatingsByOrganizerUsername } from '@/lib/firebase/firestoreService';
import StarRatingDisplay from '../ratings/StarRatingDisplay';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfileDialogProps {
  userProfile: ManagedUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ userProfile: initialProfile, isOpen, onOpenChange }: UserProfileDialogProps) {
  const [profileData, setProfileData] = useState<ManagedUser | null>(initialProfile);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);

  const fetchData = useCallback(async () => {
    if (!initialProfile?.username) {
      setProfileData(initialProfile); // Could be null
      setRatings([]);
      setIsLoadingProfile(false);
      setIsLoadingRatings(false);
      return;
    }

    setIsLoadingProfile(true);
    setIsLoadingRatings(true);

    try {
      // Fetch the latest profile data
      const updatedProfile = await getUserByUsername(initialProfile.username);
      setProfileData(updatedProfile || initialProfile); // Use updated or fallback to initial

      // Fetch ratings only if the profile is an admin or founder
      if (updatedProfile && (updatedProfile.role === 'admin' || updatedProfile.role === 'founder')) {
        let fetchedRatings = await getRatingsByOrganizerUsername(updatedProfile.username);
        fetchedRatings.sort((a, b) => {
            // Ensure createdAt is a valid Date object before getTime
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return dateB - dateA; // Sort by most recent first
        });
        setRatings(fetchedRatings);
      } else {
        setRatings([]); // Clear ratings if not admin/founder
      }
    } catch (error) {
      console.error("Error fetching profile data or ratings:", error);
      setProfileData(initialProfile); // Fallback to initial on error
      setRatings([]);
    } finally {
      setIsLoadingProfile(false);
      setIsLoadingRatings(false);
    }
  }, [initialProfile]);

  useEffect(() => {
    if (isOpen && initialProfile) {
      fetchData();
    } else if (!isOpen) {
      // Optionally reset state when dialog closes to ensure fresh data next time
      // setProfileData(null);
      // setRatings([]);
    }
  }, [isOpen, initialProfile, fetchData]);


  const getInitials = () => {
    if (!profileData) return 'U';
    if (profileData.organizerType === 'company' && profileData.companyName) {
        return profileData.companyName.substring(0, 2).toUpperCase();
    }
    if (profileData.organizerType === 'individual' && profileData.fullName) {
      const names = profileData.fullName.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return profileData.fullName[0].toUpperCase();
    }
    return profileData.publicAlias?.[0]?.toUpperCase() || profileData.username?.[0]?.toUpperCase() || 'U';
  };

  const displayName = profileData?.organizerType === 'company'
    ? profileData.companyName
    : (profileData?.organizerType === 'individual' ? profileData.fullName : profileData?.publicAlias);

  const displaySubName = profileData?.organizerType === 'company' && profileData.publicAlias && profileData.publicAlias !== profileData.companyName
    ? profileData.publicAlias
    : (profileData?.organizerType === 'individual' && profileData.publicAlias && profileData.publicAlias !== profileData.fullName ? profileData.publicAlias : profileData?.username);

  const averageRating = profileData?.averageRating || 0;
  const ratingCount = profileData?.ratingCount || 0;

  if (!initialProfile && isOpen) { // Handles case where dialog is opened without a valid initialProfile
      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Error de Perfil</DialogTitle>
                    <DialogDescription>No se ha proporcionado un perfil para mostrar.</DialogDescription>
                </DialogHeader>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-3 sm:gap-4">
            {isLoadingProfile || !profileData ? (
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            ) : (
              <Avatar className="h-12 w-12 text-base border-2 border-primary flex-shrink-0">
                <AvatarImage src={profileData.publicAlias || undefined} alt={displayName || profileData?.username || 'avatar'} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            )}

            <div className="flex flex-col flex-grow min-w-0">
              <DialogTitle className="font-headline text-lg leading-tight text-primary break-words">
                {isLoadingProfile || !profileData ? "Cargando Perfil..." : (displayName || (profileData?.username) || 'Perfil del Organizador')}
              </DialogTitle>
              
              {!isLoadingProfile && profileData && (
                <>
                  {displaySubName && displaySubName !== (displayName || profileData.username) && (
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5 break-words">
                      {displaySubName}
                    </DialogDescription>
                  )}
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Organizador de Rifas ({profileData.role}) - {profileData.organizerType === 'company' ? 'Empresa' : 'Individual'}
                  </DialogDescription>
                  {profileData.organizerType === 'company' && profileData.rif && (
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">RIF: {profileData.rif}</DialogDescription>
                  )}
                  {(profileData.role === 'admin' || profileData.role === 'founder') && (
                    <div className="flex items-center mt-1.5">
                      <StarRatingDisplay rating={averageRating} size={16} />
                      <span className="ml-1.5 text-xs text-muted-foreground">({ratingCount} {ratingCount === 1 ? 'calificación' : 'calificaciones'})</span>
                    </div>
                  )}
                </>
              )}
              {isLoadingProfile && (
                  <div className="space-y-1 mt-1">
                    <Skeleton className="h-3 w-28" /> 
                    <Skeleton className="h-3 w-32" /> 
                    <Skeleton className="h-4 w-20 mt-1" /> 
                  </div>
                )}
            </div>
          </div>
        </DialogHeader>

        {profileData && !isLoadingProfile && (
          <ScrollArea className="max-h-[50vh] pr-3 -mr-2"> 
              <div className="space-y-3 py-2">
              {profileData.bio && (
                  <div className="p-2.5 bg-secondary/30 rounded-md">
                      <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><Info className="h-4 w-4 mr-1.5 text-accent" /> Biografía</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs">{profileData.bio}</p>
                  </div>
              )}
              
              {(profileData.locationState || profileData.locationCity) && (
                  <div className="p-2.5 bg-secondary/30 rounded-md">
                  <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-accent" /> Ubicación</h4>
                  <p className="text-muted-foreground text-xs">
                      {profileData.locationCity}{profileData.locationCity && profileData.locationState ? ', ' : ''}{profileData.locationState}
                  </p>
                  </div>
              )}

              {profileData.adminPaymentMethodsInfo && (
                   <div className="p-2.5 bg-secondary/30 rounded-md">
                      <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><Info className="h-4 w-4 mr-1.5 text-accent" /> Métodos de Pago (General)</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs">{profileData.adminPaymentMethodsInfo}</p>
                  </div>
              )}

              {(profileData.role === 'admin' || profileData.role === 'founder') && (
                <div className="p-2.5 bg-secondary/30 rounded-md">
                  <h4 className="font-semibold text-sm text-foreground mb-1.5 flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-1.5 text-accent" /> Calificaciones de Usuarios
                  </h4>
                  {isLoadingRatings ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground text-xs italic">Cargando calificaciones...</span>
                    </div>
                  ) : ratings.length > 0 ? (
                    <ScrollArea className="max-h-[200px] overflow-y-auto pr-1 simple-scrollbar">
                      <div className="space-y-2">
                        {ratings.map((rating) => (
                          <div key={rating.id} className="p-2 border rounded-md bg-background/70">
                            <div className="flex justify-between items-center mb-0.5">
                              <StarRatingDisplay rating={rating.ratingStars} size={14} />
                              <span className="text-muted-foreground text-[0.65rem]">
                                {rating.createdAt instanceof Date && !isNaN(rating.createdAt.getTime()) ? formatDistanceToNow(rating.createdAt, { addSuffix: true, locale: es }) : 'Fecha inválida'}
                              </span>
                            </div>
                             {rating.comment && (
                               <p className="text-muted-foreground italic mt-0.5 text-xs">{rating.comment}</p>
                             )}
                            <p className="text-muted-foreground/80 text-[0.65rem] mt-0.5">
                              - {rating.raterUsername} (Rifa: <span className="italic">{rating.raffleName}</span>)
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">Este organizador aún no tiene calificaciones.</p>
                  )}
                </div>
              )}
              
              <div className="p-2.5 bg-muted/50 rounded-md mt-3">
                  <h4 className="font-semibold text-sm text-foreground mb-1 flex items-center"><BadgeInfo className="h-4 w-4 mr-1.5 text-primary" /> Confianza</h4>
                  <p className="text-xs text-muted-foreground">
                      Verifica los detalles del organizador. RIFAZO no se hace responsable por las transacciones directas.
                  </p>
              </div>
              </div>
          </ScrollArea>
        )}

        {!profileData && !isLoadingProfile && ( 
           <div className="text-center py-4">
                <p className="text-muted-foreground">No se pudo cargar la información del perfil.</p>
           </div>
        )}
        
        <DialogFooter className="mt-4 pt-3 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="text-xs">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
        
