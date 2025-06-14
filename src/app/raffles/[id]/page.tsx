
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import type { Raffle, ManagedUser } from '@/types';
import NumberSelector from '@/components/raffles/NumberSelector';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign, Gift, Ticket as TicketIcon, Info, Loader2, CreditCard, Smartphone, PackageCheck, UserCircle, LogIn, Clock, ListChecks, AlertTriangle, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { getRaffleById, getParticipationsByRaffleId, getUserByUsername as getCreatorProfileByUsername } from '@/lib/firebase/firestoreService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const PaymentUploadForm = dynamic(() => import('@/components/raffles/PaymentUploadForm'), {
  loading: () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>,
  ssr: false
});

const FALLBACK_ADMIN_WHATSAPP_NUMBER = "584141135956";

export default function RaffleDetailsPage() {
  const { isLoggedIn, isLoading: authIsLoading, user: currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const params = useParams();
  const raffleId = params?.id as string | undefined; 

  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<ManagedUser | null>(null);
  const [effectiveSoldNumbers, setEffectiveSoldNumbers] = useState<number[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const fetchRaffleAndCreatorData = useCallback(async () => {
    if (!raffleId) {
      setRaffle(null);
      setCreatorProfile(null);
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    try {
      const foundRaffle = await getRaffleById(raffleId);
      setRaffle(foundRaffle);

      if (foundRaffle) {
        const participations = await getParticipationsByRaffleId(raffleId);
        const participationsForThisRaffle = participations
          .filter(p => p.paymentStatus !== 'rejected')
          .flatMap(p => p.numbers);

        const initialMockSoldNumbers = foundRaffle.soldNumbers || [];
        const combinedSoldNumbers = Array.from(new Set([...initialMockSoldNumbers, ...participationsForThisRaffle]));
        setEffectiveSoldNumbers(combinedSoldNumbers);

        if (foundRaffle.creatorUsername) {
          const profile = await getCreatorProfileByUsername(foundRaffle.creatorUsername);
          setCreatorProfile(profile);
        } else {
          setCreatorProfile(null);
        }

      } else {
        setEffectiveSoldNumbers([]);
        setCreatorProfile(null);
      }
    } catch (error) {
      console.error("[RaffleDetailsPage] Error loading raffle or creator data from Firestore:", error);
      setRaffle(null);
      setCreatorProfile(null);
    } finally {
      setPageIsLoading(false);
    }
  }, [raffleId]);


  useEffect(() => {
    if (raffleId) {
        fetchRaffleAndCreatorData();
    } else {
        console.warn("[RaffleDetailsPage] raffleId is undefined. Params object for debugging:", params);
        setPageIsLoading(false); 
    }
  }, [raffleId, fetchRaffleAndCreatorData]); 

  const handleSelectionChange = (numbers: number[]) => {
    setSelectedNumbers(numbers);
  };

  const handlePaymentSuccess = async () => {
    if (raffle && raffle.id) {
      try {
        const participations = await getParticipationsByRaffleId(raffle.id);
        const participationsForThisRaffle = participations
            .filter(p => p.paymentStatus !== 'rejected')
            .flatMap(p => p.numbers);
        const combinedSoldNumbers = Array.from(new Set([...(raffle.soldNumbers || []), ...participationsForThisRaffle]));
        setEffectiveSoldNumbers(combinedSoldNumbers);
        setSelectedNumbers([]);
      } catch (error) {
        console.error("[RaffleDetailsPage] Error refreshing participations after payment:", error);
      }
    }
  };

  const handleShare = async () => {
    if (!raffle) return;

    const raffleUrl = window.location.href;
    const shareTitle = raffle.name;
    const shareText = `¡Echa un vistazo a esta rifa: "${raffle.name}"! Premio: ${raffle.prize}. Participa aquí: ${raffleUrl}`;

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
          toast({ title: "Error al compartir", description: "No se pudo compartir la rifa usando la función nativa. Puedes copiar el enlace manually.", variant: "destructive" });
        }
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
      toast({ title: "Abriendo WhatsApp", description: "Prepara tu mensaje para compartir la rifa." });
    }
  };

  if (authIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando sesión...</p>
      </div>
    );
  }

  if (pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando detalles de la rifa...</p>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <SectionTitle className="text-xl sm:text-2xl">Rifa no Encontrada</SectionTitle>
        <p className="text-muted-foreground mb-6">
          La rifa que estás buscando no existe o ha sido eliminada.
        </p>
        <Button asChild>
          <Link href="/">Volver al Inicio</Link>
        </Button>
      </div>
    );
  }

  const availableTickets = raffle.totalNumbers - effectiveSoldNumbers.length;

  const drawDateObj = new Date(raffle.drawDate + 'T00:00:00-04:00');
  const formattedDrawDate = drawDateObj.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  let lotteryDisclaimer = raffle.lotteryName && raffle.drawTime ? `El número ganador corresponderá al primer premio del sorteo de ${raffle.lotteryName} del ${formattedDrawDate} a la(s) ${raffle.drawTime}.` : "";
  
  const creatorWhatsapp = creatorProfile?.whatsappNumber || FALLBACK_ADMIN_WHATSAPP_NUMBER;

  return (
    <div className="space-y-3 sm:space-y-4">
      <SectionTitle className="text-lg sm:text-xl">{raffle.name}</SectionTitle>
      <Card className="overflow-hidden shadow-lg sm:shadow-xl">
        <CardHeader className="p-0 relative">
          <Image
            src={raffle.image} alt={raffle.name} width={800} height={450}
            className="w-full h-48 sm:h-60 md:h-72 object-cover"
            data-ai-hint="raffle prize event" priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 sm:p-4 flex flex-col justify-end">
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline text-md sm:text-lg md:text-xl text-white line-clamp-2 flex-grow mr-2">{raffle.prize}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="text-white hover:bg-white/20 flex-shrink-0"
                title="Compartir Rifa"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-2.5 space-y-1.5 sm:space-y-2">
          <CardDescription className="text-xs sm:text-sm text-foreground">
            {raffle.description}
             {lotteryDisclaimer && <p className="mt-1 text-[0.65rem] sm:text-xs italic text-primary/90">{lotteryDisclaimer}</p>}
          </CardDescription>
          <Separator className="my-1 sm:my-1.5"/>
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 text-[0.7rem] sm:text-xs">
            <div className="flex items-center">
              <DollarSign className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
              Precio: <strong className="ml-1">${raffle.pricePerTicket.toFixed(2)}</strong>
            </div>
            <div className="flex items-center">
              <CalendarDays className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
              Sorteo: {formattedDrawDate}
            </div>
            <div className="flex items-center">
              <TicketIcon className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
              Disponibles: <strong className="ml-1">{availableTickets} / {raffle.totalNumbers}</strong>
            </div>
             {raffle.lotteryName && (
              <div className="flex items-center">
                <ListChecks className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                Lotería: {raffle.lotteryName}
              </div>
            )}
            {raffle.drawTime && (
              <div className="flex items-center col-span-2 sm:col-span-1">
                <Clock className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                Hora Sorteo: {raffle.drawTime}
              </div>
            )}
             {raffle.creatorUsername && (
                <div className="flex items-center text-xs text-muted-foreground col-span-2">
                  <UserCircle className="mr-1.5 h-3.5 w-3.5" />
                  Organizado por: <Badge variant="secondary" className="ml-1.5 text-xs">{creatorProfile?.publicAlias || raffle.creatorUsername}</Badge>
                </div>
              )}
          </div>
          <Separator className="my-1 sm:my-1.5"/>
          
          {raffle.acceptedPaymentMethods && raffle.acceptedPaymentMethods.length > 0 && (
            <div className="w-full text-xs pt-1 pb-2">
              <h4 className="text-xs sm:text-sm font-semibold mb-1.5 flex items-center text-foreground">
                <PackageCheck className="mr-1.5 h-3.5 w-3.5 text-accent"/> Métodos de Pago Aceptados
              </h4>
              <ul className="space-y-1 list-none pl-1 text-[0.7rem] sm:text-xs">
                {raffle.acceptedPaymentMethods.map(pm => (
                  <li key={pm.id} className="flex items-center text-muted-foreground">
                    <CreditCard className="mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent/80" />
                    {pm.name}
                  </li>
                ))}
              </ul>
               <p className="mt-1.5 text-[0.65rem] sm:text-xs italic text-primary/90">
                Nota: Al participar, se te redirigirá a WhatsApp para coordinar el pago directamente con el organizador.
              </p>
            </div>
          )}
          <Separator className="my-1 sm:my-1.5"/>
          
          {availableTickets > 0 ? (
            isLoggedIn ? (
              <>
                <NumberSelector
                  totalNumbers={raffle.totalNumbers}
                  soldNumbers={effectiveSoldNumbers}
                  pricePerTicket={raffle.pricePerTicket}
                  onSelectionChange={handleSelectionChange}
                />
                {selectedNumbers.length > 0 && raffle && raffle.id && raffle.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mt-3 sm:mt-4"
                  >
                    <PaymentUploadForm
                       raffle={raffle}
                       selectedNumbers={selectedNumbers}
                       pricePerTicket={raffle.pricePerTicket}
                       onPaymentSuccess={handlePaymentSuccess}
                       creatorWhatsappNumber={creatorWhatsapp}
                    />
                  </motion.div>
                )}
              </>
            ) : (
              <Alert variant="default" className="mt-3 sm:mt-4 bg-primary/10 border-primary/30">
                <LogIn className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary text-xs sm:text-sm">
                  Debes <Link href="/login" className="font-bold underline">iniciar sesión</Link> para seleccionar números y participar.
                </AlertDescription>
              </Alert>
            )
          ) : (
            <Alert variant="destructive" className="mt-3 sm:mt-4 text-center">
              <TicketIcon className="h-4 w-4" />
              <AlertDescription className="font-semibold text-sm sm:text-base">
                ¡Todos los boletos para esta rifa han sido vendidos!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    
