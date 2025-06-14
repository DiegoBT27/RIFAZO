
'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, User, Hash, Phone as PhoneIcon, Loader2, MessageSquare, ImagePlus, UploadCloud } from 'lucide-react';
import type { Participation, Raffle } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addParticipation } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { buttonVariants } from '../ui/button';


interface PaymentUploadFormProps {
  raffle: Raffle;
  selectedNumbers: number[];
  pricePerTicket: number;
  onPaymentSuccess: () => void;
  creatorWhatsappNumber?: string;
}

const FALLBACK_ADMIN_WHATSAPP_NUMBER = "584141135956";


const generateTicketContent = (participation: Participation, raffle: Raffle, totalAmount: number): string => {
  return `
RIFAZO - Comprobante de Participación
-------------------------------------
Rifa: ${participation.raffleName} (ID: ${participation.raffleId})
Organizador: ${raffle.creatorUsername || 'N/A'}
Usuario Comprador: ${participation.participantUsername || 'N/A'}
Participante (a nombre de): ${participation.participantName} ${participation.participantLastName}
Cédula: ${participation.participantIdCard}
Teléfono: ${participation.participantPhone}
Números Seleccionados: ${participation.numbers.join(', ')}
Fecha de Compra: ${new Date(participation.purchaseDate).toLocaleString('es-VE')}
Total Pagado (a coordinar): $${totalAmount.toFixed(2)}
ID de Participación: ${participation.id}
Estado del Pago: ${participation.paymentStatus}
Notas: ${participation.paymentNotes || 'N/A'}
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


export default function PaymentUploadForm({ raffle, selectedNumbers, pricePerTicket, onPaymentSuccess, creatorWhatsappNumber }: PaymentUploadFormProps) {
  const [notes, setNotes] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantLastName, setParticipantLastName] = useState('');
  const [participantIdCard, setParticipantIdCard] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();


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
  const finalWhatsappNumber = creatorWhatsappNumber || FALLBACK_ADMIN_WHATSAPP_NUMBER;


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('[PaymentUploadForm] handleSubmit triggered.');
    setIsSubmitting(true);

    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al usuario. Por favor, vuelve a iniciar sesión.", variant: "destructive" });
      setIsSubmitting(false);
      console.log('[PaymentUploadForm] Auth error, submission aborted.');
      return;
    }

    if (selectedNumbersCount === 0 || !participantName || !participantLastName || !participantIdCard || !participantPhone) {
      toast({ title: "Error de Formulario", description: "Por favor, completa todos los campos requeridos.", variant: "destructive" });
      setIsSubmitting(false);
      console.log('[PaymentUploadForm] Form validation error, submission aborted.');
      return;
    }

    try {
      console.log('[PaymentUploadForm] Creating participation data...');
      const newParticipationData: Omit<Participation, 'id'> = {
        raffleId: raffle.id,
        raffleName: raffle.name,
        creatorUsername: raffle.creatorUsername,
        participantUsername: currentUser.username,
        numbers: selectedNumbers,
        paymentStatus: 'pending',
        purchaseDate: new Date().toISOString(),
        participantName,
        participantLastName,
        participantIdCard,
        participantPhone,
        paymentNotes: notes,
      };

      console.log('[PaymentUploadForm] Saving participation to Firestore...');
      const savedParticipation = await addParticipation(newParticipationData);
      console.log('[PaymentUploadForm] Participation saved with ID:', savedParticipation.id);
      
      onPaymentSuccess();
      console.log('[PaymentUploadForm] onPaymentSuccess callback executed.');
      
      downloadTicketTextFile({ ...newParticipationData, id: savedParticipation.id }, raffle, totalAmount);
      console.log('[PaymentUploadForm] Ticket text file download initiated.');
      
      toast({
        title: "Participación Registrada",
        description: `Se ha registrado tu participación. Se descargará un archivo con los detalles. A continuación, se abrirá WhatsApp para contactar al organizador: ${raffle.creatorUsername || 'RIFAZO'}.`,
        duration: 8000,
      });

      const whatsappMessage = `🎉 ¡Tu participación ha sido registrada con éxito!

📌 Rifa: ${raffle.name}
🏷️ A nombre de: ${participantName} ${participantLastName}
🆔 Cédula: ${participantIdCard}
📞 Teléfono: ${participantPhone}
🎟️ Número(s) seleccionado(s): ${selectedNumbers.join(', ')}
💰 Total a pagar: $${totalAmount.toFixed(2)}
📝 Notas adicionales: ${notes || 'Ninguna'}

💬 Quedo atento(a) a los datos de los métodos de pago seleccionados para completar mi participación.
`;
      const whatsappUrl = `https://wa.me/${finalWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
      
      console.log(`[PaymentUploadForm] Preparing to open WhatsApp (${finalWhatsappNumber}) and redirect.`);
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setTimeout(() => router.push('/my-participations'), 1500);
      }, 1000);


      setNotes('');
      setParticipantName('');
      setParticipantLastName('');
      setParticipantIdCard('');
      setParticipantPhone('');
      console.log('[PaymentUploadForm] Form fields reset.');

    } catch (error) {
      console.error("[PaymentUploadForm] Error in handleSubmit's try block:", error);
      toast({ title: "Error al Procesar", description: "No se pudo registrar tu participación. Intenta de nuevo.", variant: "destructive" });
    } finally {
      console.log('[PaymentUploadForm] handleSubmit finally block. Setting isSubmitting to false.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-card rounded-lg shadow-md border">
       <Alert variant="default" className="bg-primary/5 border-primary/20">
        <MessageSquare className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary text-sm font-semibold">Registra tu Participación</AlertTitle>
        <AlertDescription className="text-xs text-primary/80">
          Completa tus datos. Al finalizar, se generará un comprobante y se abrirá WhatsApp para que contactes al organizador y coordines el pago.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="participantName" className="block text-xs font-medium mb-0.5">Nombre (para el boleto)</Label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantName" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="Nombre en el boleto" required disabled={isSubmitting} className="pl-8 text-xs h-9" />
          </div>
        </div>
        <div>
          <Label htmlFor="participantLastName" className="block text-xs font-medium mb-0.5">Apellido (para el boleto)</Label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantLastName" value={participantLastName} onChange={(e) => setParticipantLastName(e.target.value)} placeholder="Apellido en el boleto" required disabled={isSubmitting} className="pl-8 text-xs h-9" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="participantIdCard" className="block text-xs font-medium mb-0.5">Cédula/ID (para el boleto)</Label>
          <div className="relative">
            <Hash className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="participantIdCard" value={participantIdCard} onChange={(e) => setParticipantIdCard(e.target.value)} placeholder="V-XXXXXXXX" required disabled={isSubmitting} className="pl-8 text-xs h-9" />
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
      
      <div>
        <Label htmlFor="notes" className="block text-xs font-medium mb-0.5">Notas Adicionales (Opcional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Banco desde el que pagarás, preferencia de contacto, etc." disabled={isSubmitting} className="text-xs min-h-[60px]" rows={2}/>
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-9 sm:h-10" disabled={selectedNumbersCount === 0 || !participantName || !participantLastName || !participantIdCard || !participantPhone || isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
        {isSubmitting ? 'Procesando...' : `Participar`}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-1.5 px-1">
         Al hacer clic en 'Participar', se abrirá WhatsApp para que envíes tu comprobante de pago al organizador ({raffle.creatorUsername || 'RIFAZO General'}) y coordines la confirmación. Se descargará un archivo de texto con los detalles de tu participación.
      </p>
      {selectedNumbersCount > 0 && (
         <p className="text-xs text-center text-muted-foreground -mt-0.5">Total a pagar (a coordinar con organizador): <span className="font-bold text-foreground">${totalAmount.toFixed(2)}</span></p>
      )}
    </form>
  );
}
