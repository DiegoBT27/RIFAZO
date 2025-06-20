
'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react'; // Import React
import type { Raffle, ManagedUser } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Ticket, DollarSign, Users, UserCircle, Trash2, AlertTriangle, Clock, ListChecks, Info as InfoIcon, Share2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface RaffleCardProps {
  raffle: Raffle;
  currentUser?: ManagedUser | null;
  onDeleteRaffle?: (raffleId: string) => void;
  creatorProfile?: ManagedUser;
  onViewProfile?: (profile: ManagedUser) => void;
}

const RaffleCard = React.memo(function RaffleCard({ raffle, currentUser, onDeleteRaffle, creatorProfile, onViewProfile }: RaffleCardProps) {
  const { toast } = useToast(); // Initialize toast
  const soldCount = raffle.effectiveSoldNumbers ? raffle.effectiveSoldNumbers.length : (raffle.soldNumbers?.length || 0);
  const availableTickets = raffle.totalNumbers - soldCount;

  const canDelete = currentUser && onDeleteRaffle &&
                    (
                      (currentUser.role === 'founder') ||
                      (currentUser.role === 'admin' && raffle.creatorUsername === currentUser.username)
                    );

  const canViewProfile = creatorProfile && onViewProfile;

  const drawDateObj = new Date(raffle.drawDate + 'T00:00:00-04:00');

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const raffleUrl = `${window.location.origin}/raffles/${raffle.id}`;
    const shareTitle = raffle.name;
    const shareText = `🎉 ¡No te pierdas esta oportunidad única en RIFAZO!
Participa en nuestra rifa y gana premios increíbles.
¡Corre, que los boletos vuelan! 🚀
👉 ${raffleUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: raffleUrl,
        });
        toast({ title: "Contenido compartido", description: "La rifa ha sido compartida con éxito." });
      } catch (error: any) {
        console.error("Error al compartir con Web Share API:", error);
        if (error.name === 'NotAllowedError') {
          toast({ title: "Error de Permiso", description: "No se pudo compartir. Revisa los permisos de tu navegador (HTTPS requerido).", variant: "destructive" });
        } else {
          toast({ title: "Error al compartir", description: "No se pudo compartir la rifa. Puedes copiar el enlace manualmente.", variant: "destructive" });
        }
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
      toast({ title: "Abriendo WhatsApp", description: "Prepara tu mensaje para compartir la rifa." });
    }
  };


  return (
    <Card className="flex flex-col h-full w-[21.25rem] shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
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
        <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2 sm:line-clamp-3">{raffle.description}</p>
        <div className="space-y-0.5 sm:space-y-1 text-xs">
          <div className="flex items-center">
            <DollarSign className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Precio: ${raffle.pricePerTicket}
          </div>
          <div className="flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-accent" />
            Sorteo: {drawDateObj.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          {raffle.lotteryName && (
            <div className="flex items-center">
              <ListChecks className="h-3.5 w-3.5 mr-1.5 text-accent" />
              Lotería: {raffle.lotteryName}
            </div>
          )}
          {raffle.drawTime && (
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-accent" />
              Hora: {raffle.drawTime}
            </div>
          )}
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
          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-xs sm:text-sm h-8 sm:h-9">
            Participar
            <Users className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
          className="flex-shrink-0"
          title="Compartir Rifa"
        >
          <Share2 />
        </Button>
        {canViewProfile && (
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onViewProfile(creatorProfile!);}}
            className="flex-shrink-0"
            title="Ver Perfil del Organizador"
          >
            <InfoIcon />
          </Button>
        )}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="flex-shrink-0" title="Eliminar Rifa">
                <Trash2 />
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
