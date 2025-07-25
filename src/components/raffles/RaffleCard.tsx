
'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react'; // Import React
import type { Raffle, ManagedUser } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Ticket, DollarSign, Users, UserCircle, Trash2, AlertTriangle, Clock, ListChecks, Info as InfoIcon, Share2, Star, Gift } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface RaffleCardProps {
  raffle: Raffle;
  currentUser?: ManagedUser | null;
  onDeleteRaffle?: (raffleId: string) => void;
  creatorProfile?: ManagedUser;
  onViewProfile?: (profile: ManagedUser) => void;
}

const RaffleCard = React.memo(function RaffleCard({ raffle, currentUser, onDeleteRaffle, creatorProfile, onViewProfile }: RaffleCardProps) {
  const { toast } = useToast();
  const auth = useAuth();
  const soldCount = raffle.soldTicketsCount || 0;
  const availableTickets = raffle.totalNumbers - soldCount;

  const canDelete = currentUser && onDeleteRaffle &&
                    (
                      (currentUser.role === 'founder') ||
                      (currentUser.role === 'admin' && raffle.creatorUsername === currentUser.username)
                    );

  const canViewProfile = creatorProfile && onViewProfile;

  const drawDateObj = new Date(raffle.drawDate + 'T00:00:00Z');
  
  const currencySymbol = raffle.currency === 'Bs' ? 'Bs' : '$';

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (!raffle) return;

    const raffleUrl = `${window.location.origin}/raffles/${raffle.id}`;
    const shareTitle = `¡Participa en la rifa "${raffle.name}"!`;
    const firstPrize = raffle.prizes?.[0]?.description || "premios increíbles";
    const drawDate = new Date(raffle.drawDate + 'T00:00:00Z').toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const price = raffle.pricePerTicket.toFixed(2);
    
    const newShareText = `🎉 ¡Participa ya, Rifa activa!\n` +
                         `🎁 ${firstPrize}\n` +
                         `🎫 ${currencySymbol}${price} | 📅 Sorteo: ${drawDate}\n\n` +
                         `Entra en el Link y participa 👉 ${raffleUrl}`;

    const shareData = {
      title: shareTitle,
      text: newShareText,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(newShareText)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.error("Could not use Web Share API, falling back to WhatsApp.", error);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(newShareText)}`;
        window.open(whatsappUrl, '_blank');
      }
    }
  };

  const isFavorite = currentUser?.favoriteRaffleIds?.includes(raffle.id);

  const handleToggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) {
        toast({
            title: "Inicia Sesión",
            description: "Debes iniciar sesión para añadir rifas a tus favoritos.",
            variant: "destructive"
        });
        return;
    }
    await auth.toggleFavoriteRaffle(raffle.id);
    toast({
        title: isFavorite ? "Eliminada de Favoritos" : "Añadida a Favoritos",
        description: `La rifa "${raffle.name}" ${isFavorite ? 'ha sido eliminada de' : 'ha sido añadida a'} tus favoritos.`,
    });
  };

  return (
    <Card className="flex flex-col h-full w-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Image
          src={raffle.image}
          alt={raffle.name}
          width={640}
          height={500}
          className="rounded-t-lg object-cover w-full h-[300px] md:h-[250px]"
          data-ai-hint="raffle prize product"
        />
      </CardHeader>
      <CardContent className="flex-grow p-3 sm:p-4 pt-1.5 sm:pt-2">
        <CardTitle className="font-headline text-md sm:text-lg my-2 sm:my-2.5 line-clamp-2">{raffle.name}</CardTitle>
        <div className="space-y-1 my-2">
            <div className="flex items-center text-xs font-semibold text-muted-foreground">
              <Gift className="h-4 w-4 mr-1.5 text-accent" />
              Premios
            </div>
            <ul className="list-decimal list-inside text-xs sm:text-sm text-foreground pl-3 space-y-0.5">
                {(raffle.prizes || []).map((prize, index) => (
                    <li key={index} className="line-clamp-1">{prize.description}</li>
                ))}
            </ul>
        </div>
        <Separator className="my-2 bg-muted-foreground/10" />
        <div className="space-y-0.5 sm:space-y-1 text-xs">
          <div className="flex items-center">
            <DollarSign className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Precio: {currencySymbol}{raffle.pricePerTicket.toFixed(2)}
          </div>
          <div className="flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Fecha Sorteo: {drawDateObj.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
          </div>
           <div className="flex items-center">
            <Ticket className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Boletos disponibles: {availableTickets} / {raffle.totalNumbers}
          </div>
          {raffle.creatorUsername && (
            <div className="flex items-center">
              <UserCircle className="h-3.5 w-3.5 mr-1.5 text-accent" />
              Por: {raffle.creatorUsername}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 flex items-center gap-1.5 sm:gap-2">
        <Link href={`/raffles/${raffle.id}`} className="flex-grow">
          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-xs sm:text-sm h-8">
            Participar
            <Users className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
        
        {currentUser && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleFavorite}
            className="h-8 w-8 flex-shrink-0 group"
            title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Star className={cn("h-4 w-4 transition-colors group-hover:text-accent-foreground", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="h-8 w-8 flex-shrink-0"
          title="Compartir Rifa"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        {canViewProfile && (
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onViewProfile(creatorProfile!);}}
            className="h-8 w-8 flex-shrink-0"
            title="Ver Perfil del Organizador"
          >
            <InfoIcon className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-8 w-8 flex-shrink-0" title="Eliminar Rifa">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center text-md sm:text-lg"><AlertTriangle className="text-destructive mr-2 h-4 sm:h-5 w-4 sm:h-5"/>¿Eliminar esta rifa?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs sm:text-sm">
                  Estás a punto de eliminar la rifa "{raffle.name}". Esta acción no se puede deshacer.
                  Se eliminarán la rifa y todas las participaciones asociadas (boletos comprados).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs h-8 px-3">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if(onDeleteRaffle) onDeleteRaffle(raffle.id);}} className="bg-destructive hover:bg-destructive/90 text-xs h-8 px-3">
                  Sí, Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
});

export default RaffleCard;
