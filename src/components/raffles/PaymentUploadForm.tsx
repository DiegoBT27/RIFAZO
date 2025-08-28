
'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Hash, Loader2, MessageSquare, Key } from 'lucide-react';
import { Phone as PhoneIcon } from 'lucide-react';
import { User } from 'lucide-react';
import type { Participation, Raffle, ManagedUser } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addParticipation, getUserByField, addUser } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/contexts/AuthContext';


interface PaymentUploadFormProps {
  raffle: Raffle;
  selectedNumbers: number[];
  pricePerTicket: number;
  onPaymentSuccess: () => void;
}

const FALLBACK_ADMIN_WHATSAPP_NUMBER = "584141135956";


const generateTicketContent = (participation: Participation, raffle: Raffle, totalAmount: number): string => {
  const currencySymbol = raffle.currency === 'Bs' ? 'Bs' : '$';
  return `
RIFAZO - Comprobante de Participación
-------------------------------------
Rifa: ${participation.raffleName} (ID: ${participation.raffleId})
Organizador: ${raffle.creatorUsername || 'N/A'}
Usuario Comprador: ${participation.participantUsername || 'N/A'}
Participante (a nombre de): ${participation.participantName}
Cédula: ${participation.participantIdCard}
Teléfono: ${participation.participantPhone}
Números Seleccionados: ${participation.numbers.join(', ')}
Fecha de Compra: ${new Date(participation.purchaseDate).toLocaleString('es-VE')}
Total a pagar (a coordinar): ${currencySymbol}${totalAmount.toFixed(2)}
ID de Participación: ${participation.id}
Estado del Pago: ${participation.paymentStatus}
-------------------------------------
¡Gracias por participar! Guarda este comprobante.
Debes enviar tu comprobante de pago vía WhatsApp al organizador (${raffle.creatorUsername || 'RIFAZO'}) para confirmar tu participación.
Puedes verificar el estado de tu pago en "Mis Boletos".
`;
};

const downloadTicketTextFile = (participation: Participation, raffle: Raffle, totalAmount: number) => {
  const content = generateTicketContent(participation, raffle, totalAmount);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `rifazo_boleto_${participation.raffleName.replace(/\s+/g, '_')}_${participation.id.substring(0,6)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};


export default function PaymentUploadForm({ raffle, selectedNumbers, pricePerTicket, onPaymentSuccess }: PaymentUploadFormProps) {
  const [participantName, setParticipantName] = useState('');
  const [participantIdCard, setParticipantIdCard] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser, login } = useAuth();


  if (!raffle || !raffle.id || !raffle.name) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                No se pudo cargar la información de la rifa para el formulario de pago.
            </AlertDescription>
        </Alert>
    );
  }

  const selectedNumbersCount = selectedNumbers.length;
  const totalAmount = selectedNumbersCount * pricePerTicket;
  const currencySymbol = raffle.currency === 'Bs' ? 'Bs' : '$';

  const isMinTicketsMet = !raffle.minTicketsPerPurchase || selectedNumbersCount >= raffle.minTicketsPerPurchase;
  const isMaxTicketsMet = !raffle.maxTicketsPerPurchase || selectedNumbersCount <= raffle.maxTicketsPerPurchase;
  const isSelectionValid = isMinTicketsMet && isMaxTicketsMet;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (selectedNumbersCount === 0 || !participantName || !participantIdCard || !participantPhone) {
      toast({ title: "Error de Formulario", description: "Por favor, completa todos los campos requeridos.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    if (!isSelectionValid) {
       toast({ title: "Error de Límites", description: "La cantidad de boletos seleccionados no cumple con los límites de la rifa.", variant: "destructive" });
       setIsSubmitting(false);
       return;
    }

    let effectiveUser = currentUser;
    let isNewUser = false;

    try {
      if (!currentUser) {
        let existingUser = await getUserByField('idCardNumber', participantIdCard);
        
        if (existingUser && existingUser.password) {
          toast({
            title: "Usuario Existente",
            description: `Ya existe una cuenta asociada a la cédula ${participantIdCard}. Por favor, inicia sesión para continuar.`,
            variant: "destructive",
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }

        if (!existingUser) {
           const newUserPartial: Omit<ManagedUser, 'id'> = {
              username: participantIdCard,
              // No password is set here
              role: 'user',
              isBlocked: false,
              favoriteRaffleIds: [],
              idCardNumber: participantIdCard,
              fullName: participantName,
              whatsappNumber: participantPhone,
          };
          existingUser = await addUser(newUserPartial);
          isNewUser = true;
        }
        effectiveUser = existingUser;
      }

      if (!effectiveUser) {
        throw new Error("No se pudo determinar el usuario para la participación.");
      }

      const newParticipationData: Omit<Participation, 'id' | 'participantLastName'> = {
        raffleId: raffle.id,
        raffleName: raffle.name,
        creatorUsername: raffle.creatorUsername,
        participantUsername: effectiveUser.username,
        numbers: selectedNumbers,
        paymentStatus: 'pending',
        purchaseDate: new Date().toISOString(),
        participantName: participantName,
        participantIdCard,
        participantPhone,
      };

      const savedParticipation = await addParticipation(newParticipationData);
      
      onPaymentSuccess();
      
      downloadTicketTextFile({ ...newParticipationData, id: savedParticipation.id }, raffle, totalAmount);
      
      let toastDescription = `Se ha registrado tu participación. Se descargará un archivo con los detalles. A continuación, se abrirá WhatsApp para contactar al organizador: ${raffle.creatorUsername || 'RIFAZO'}.`;

      if (isNewUser) {
        toastDescription = `¡Bienvenido a RIFAZO! Tu cuenta ha sido creada. Tu usuario es tu Cédula. La próxima vez que inicies sesión, podrás establecer tu contraseña. ${toastDescription}`;
      }

      toast({
        title: "Participación Registrada",
        description: toastDescription,
        duration: 10000,
      });

      let finalWhatsappNumber = FALLBACK_ADMIN_WHATSAPP_NUMBER;
      if (raffle.creatorUsername) {
          const creatorProfile = await getUserByField('username', raffle.creatorUsername);
          finalWhatsappNumber = creatorProfile?.whatsappNumber || FALLBACK_ADMIN_WHATSAPP_NUMBER;
      }

      const whatsappMessage = `🎉 ¡Hola! He registrado mi participación en la rifa "${raffle.name}".

*A nombre de:* ${participantName}
*Cédula:* ${participantIdCard}
*Número(s):* ${selectedNumbers.join(', ')}
*Total a pagar:* ${currencySymbol}${totalAmount.toFixed(2)}

Por favor, envíame los datos para realizar el pago. ¡Gracias!
`;
      const whatsappUrl = `https://wa.me/${finalWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setTimeout(() => router.push('/my-participations'), 1500);
      }, 1000);

      setParticipantName('');
      setParticipantIdCard('');
      setParticipantPhone('');

    } catch (error: any) {
      console.error("[PaymentUploadForm] Error in handleSubmit's try block:", error);
      if (error.message.includes("ya no está disponible")) {
         toast({
              title: "Número no disponible",
              description: error.message,
              variant: "destructive",
          });
          onPaymentSuccess(); // Refresh numbers
      } else {
         toast({ title: "Error al Procesar", description: error.message || "No se pudo registrar tu participación. Intenta de nuevo.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-card rounded-lg shadow-md border">
       <Alert variant="default" className="bg-primary/5 border-primary/20">
        <MessageSquare className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary text-sm font-semibold">Registra tu Participación</AlertTitle>
        {!currentUser ? (
          <AlertDescription className="text-xs text-primary/80">
             Al ser tu primera vez, tu Cédula será tu nombre de usuario. Podrás establecer tu contraseña en tu primer inicio de sesión.
          </AlertDescription>
        ) : (
          <AlertDescription className="text-xs text-primary/80">
            Completa tus datos. Al finalizar, se generará un comprobante y se abrirá WhatsApp para que contactes al organizador y coordines el pago.
          </AlertDescription>
        )}
      </Alert>

        <div>
          <Label htmlFor="participantName" className="block text-xs font-medium mb-0.5">Nombre Completo (para el boleto)</Label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantName" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="Nombre y Apellido" required disabled={isSubmitting} className="pl-8 text-xs h-9" />
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="participantIdCard" className="block text-xs font-medium mb-0.5">Cédula/ID (será tu usuario)</Label>
          <div className="relative">
            <Hash className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantIdCard" value={participantIdCard} onChange={(e) => setParticipantIdCard(e.target.value)} placeholder="V-XXXXXXXX" required disabled={isSubmitting || !!currentUser} className="pl-8 text-xs h-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="participantPhone" className="block text-xs font-medium mb-0.5">Teléfono (para el boleto)</Label>
          <div className="relative">
            <PhoneIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantPhone" type="tel" value={participantPhone} onChange={(e) => setParticipantPhone(e.target.value)} placeholder="04XX-XXXXXXX" required disabled={isSubmitting} className="pl-8 text-xs h-9" />
          </div>
        </div>
      </div>
      
      <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm h-9 sm:h-10" disabled={selectedNumbersCount === 0 || !participantName || !participantIdCard || !participantPhone || isSubmitting || !isSelectionValid}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
        {isSubmitting ? 'Procesando...' : `Participar`}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-1.5 px-1">
         Al hacer clic en 'Participar', se abrirá WhatsApp para que envíes tu comprobante de pago al organizador (${raffle.creatorUsername || 'RIFAZO General'}) y coordines la confirmación. Se descargará un archivo de texto con los detalles de tu participación.
      </p>
      {selectedNumbersCount > 0 && (
         <p className="text-xs text-center text-muted-foreground -mt-0.5">Total a pagar (a coordinar con organizador): <span className="font-bold text-foreground">{currencySymbol}${totalAmount.toFixed(2)}</span></p>
      )}
    </form>
  );
}
