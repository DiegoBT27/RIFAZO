
'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ManagedUser } from '@/types';
import { AtSign, Info, MapPin, MessageSquareText, UserCircle, Zap, BadgeInfo, Phone, Briefcase, Building as BuildingIcon, Landmark } from 'lucide-react'; 
import { ScrollArea } from '../ui/scroll-area';

interface UserProfileDialogProps {
  userProfile: ManagedUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ userProfile, isOpen, onOpenChange }: UserProfileDialogProps) {
  if (!userProfile) return null;

  const getInitials = () => {
    if (userProfile.organizerType === 'company' && userProfile.companyName) {
        return userProfile.companyName.substring(0, 2).toUpperCase();
    }
    if (userProfile.organizerType === 'individual' && userProfile.fullName) {
      const names = userProfile.fullName.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return userProfile.fullName[0].toUpperCase();
    }
    return userProfile.publicAlias?.[0]?.toUpperCase() || userProfile.username?.[0]?.toUpperCase() || 'U';
  };
  
  const displayName = userProfile.organizerType === 'company' 
    ? userProfile.companyName 
    : (userProfile.organizerType === 'individual' ? userProfile.fullName : userProfile.publicAlias);

  const displaySubName = userProfile.organizerType === 'company' && userProfile.publicAlias && userProfile.publicAlias !== userProfile.companyName
    ? userProfile.publicAlias
    : (userProfile.organizerType === 'individual' && userProfile.publicAlias && userProfile.publicAlias !== userProfile.fullName ? userProfile.publicAlias : userProfile.username);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center sm:text-left mb-2">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 mb-3">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 text-2xl sm:text-3xl border-2 border-primary">
              <AvatarImage src={'https://placehold.co/128x128.png'} alt={displayName || userProfile.username} data-ai-hint="profile avatar placeholder" />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="mt-2 sm:mt-0 text-center sm:text-left">
              <DialogTitle className="font-headline text-xl sm:text-2xl text-primary">
                {displayName || userProfile.username}
              </DialogTitle>
              {displaySubName && displaySubName !== (displayName || userProfile.username) && <DialogDescription className="text-sm sm:text-base">{displaySubName}</DialogDescription>}
              <DialogDescription className="text-xs text-muted-foreground">
                Organizador de Rifas ({userProfile.role}) - {userProfile.organizerType === 'company' ? 'Empresa' : 'Individual'}
              </DialogDescription>
               {userProfile.organizerType === 'company' && userProfile.rif && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">RIF: {userProfile.rif}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3 -mr-2">
            <div className="space-y-3 text-xs sm:text-sm py-2">
            {userProfile.bio && (
                <div className="p-2.5 bg-secondary/30 rounded-md">
                    <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><Info className="h-4 w-4 mr-1.5 text-accent" /> Biografía</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{userProfile.bio}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {userProfile.email && (
                <div className="p-2.5 bg-secondary/30 rounded-md">
                    <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><AtSign className="h-4 w-4 mr-1.5 text-accent" /> Correo</h4>
                    <p className="text-muted-foreground">{userProfile.email}</p>
                </div>
                )}
                {userProfile.whatsappNumber && (
                <div className="p-2.5 bg-secondary/30 rounded-md">
                    <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><Phone className="h-4 w-4 mr-1.5 text-accent" /> WhatsApp</h4>
                    <p className="text-muted-foreground">{userProfile.whatsappNumber}</p>
                </div>
                )}
            </div>
            
            {(userProfile.locationState || userProfile.locationCity) && (
                <div className="p-2.5 bg-secondary/30 rounded-md">
                <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-accent" /> Ubicación</h4>
                <p className="text-muted-foreground">
                    {userProfile.locationCity}{userProfile.locationCity && userProfile.locationState ? ', ' : ''}{userProfile.locationState}
                </p>
                </div>
            )}

            {userProfile.adminPaymentMethodsInfo && (
                 <div className="p-2.5 bg-secondary/30 rounded-md">
                    <h4 className="font-semibold text-sm text-foreground mb-0.5 flex items-center"><Briefcase className="h-4 w-4 mr-1.5 text-accent" /> Métodos de Pago (General)</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{userProfile.adminPaymentMethodsInfo}</p>
                </div>
            )}
            
            <div className="p-2.5 bg-muted/50 rounded-md mt-3">
                <h4 className="font-semibold text-sm text-foreground mb-1 flex items-center"><BadgeInfo className="h-4 w-4 mr-1.5 text-primary" /> Confianza</h4>
                <p className="text-xs text-muted-foreground">
                    Verifica los detalles del organizador. RIFAZO no se hace responsable por las transacciones directas.
                    La función de calificación estará disponible próximamente.
                </p>
            </div>
            </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4 pt-3 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="text-xs">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    