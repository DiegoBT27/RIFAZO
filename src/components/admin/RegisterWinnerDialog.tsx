
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Raffle, RaffleResult, Participation } from '@/types';
import { Loader2, Trophy, UserCheck, Phone } from 'lucide-react';
import { updateRaffle, addRaffleResult, getParticipationsByRaffleId, addActivityLog } from '@/lib/firebase/firestoreService';

const registerWinnerSchema = z.object({
  winningNumber: z.coerce
    .number({ invalid_type_error: "Debe ser un número." })
    .int({ message: "Debe ser un número entero." })
    .min(1, { message: "El número ganador debe ser al menos 1." }),
  winnerName: z.string().optional(),
  winnerPhone: z.string().max(25, "Máximo 25 caracteres.").optional(),
});

type RegisterWinnerFormValues = z.infer<typeof registerWinnerSchema>;

interface RegisterWinnerDialogProps {
  raffle: Raffle;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RegisterWinnerDialog({ raffle, isOpen, onOpenChange, onSuccess }: RegisterWinnerDialogProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegisterWinnerFormValues>({
    resolver: zodResolver(registerWinnerSchema),
    defaultValues: {
      winningNumber: undefined,
      winnerName: '',
      winnerPhone: '',
    }
  });

  const onSubmit: SubmitHandler<RegisterWinnerFormValues> = async (data) => {
    setIsSubmitting(true);
    if (!currentUser || !currentUser.username) { // Added direct check for currentUser
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al usuario.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    try {
      if (data.winningNumber > raffle.totalNumbers) {
        toast({
          title: "Error de Validación",
          description: `El número ganador (${data.winningNumber}) no puede ser mayor que el total de números de la rifa (${raffle.totalNumbers}).`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      let finalWinnerName = data.winnerName;
      let finalWinnerPhone = data.winnerPhone;

      if ((!finalWinnerName || finalWinnerName.trim() === '') && data.winningNumber != null) {
        try {
          const participations = await getParticipationsByRaffleId(raffle.id);
          const winningParticipation = participations.find(p =>
            p.paymentStatus === 'confirmed' && 
            p.numbers.includes(data.winningNumber!)
          );

          if (winningParticipation) {
            if ((!finalWinnerName || finalWinnerName.trim() === '') && (winningParticipation.participantName || winningParticipation.participantLastName)) {
                 finalWinnerName = `${winningParticipation.participantName || ''} ${winningParticipation.participantLastName || ''}`.trim();
            }
            if ((!finalWinnerPhone || finalWinnerPhone.trim() === '') && winningParticipation.participantPhone) {
                finalWinnerPhone = winningParticipation.participantPhone;
            }
          }
        } catch (searchError) {
          console.error("Error searching for winning participation details:", searchError);
        }
      }
      
      const raffleUpdateData: Partial<Raffle> = {
        winningNumber: data.winningNumber,
        winnerName: finalWinnerName || null,
        winnerPhone: finalWinnerPhone || null,
        status: 'completed',
      };
      await updateRaffle(raffle.id, raffleUpdateData, currentUser); // Pass currentUser as editor

      const resultData: Omit<RaffleResult, 'id'> = {
        raffleId: raffle.id,
        raffleName: raffle.name,
        winningNumber: data.winningNumber,
        winnerName: finalWinnerName || null,
        winnerPhone: finalWinnerPhone || null,
        drawDate: raffle.drawDate,
        prize: raffle.prize,
        creatorUsername: raffle.creatorUsername,
      };
      await addRaffleResult(resultData);

      await addActivityLog({
        adminUsername: currentUser.username,
        actionType: 'WINNER_REGISTERED',
        targetInfo: `Rifa: ${raffle.name}`,
        details: { 
          raffleId: raffle.id, 
          raffleName: raffle.name,
          winningNumber: data.winningNumber,
          winnerName: finalWinnerName,
          winnerPhone: finalWinnerPhone
        }
      });

      toast({
        title: "Ganador Registrado",
        description: `Se ha registrado el número ganador para la rifa "${raffle.name}".`,
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error registering winner:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ganador.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-lg">Registrar Ganador para: {raffle.name}</DialogTitle>
          <DialogDescription>
            Ingresa el número ganador. El nombre y teléfono son opcionales (se intentarán autocompletar si se dejan vacíos).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="winningNumber">Número Ganador</Label>
            <Input
              id="winningNumber"
              type="number"
              {...register("winningNumber")}
              placeholder={`Entre 1 y ${raffle.totalNumbers}`}
              disabled={isSubmitting}
            />
            {errors.winningNumber && <p className="text-sm text-destructive mt-1">{errors.winningNumber.message}</p>}
          </div>
          <div>
            <Label htmlFor="winnerName">Nombre del Ganador (Opcional)</Label>
            <Input
              id="winnerName"
              {...register("winnerName")}
              placeholder="Ej: María Pérez (o dejar vacío para autocompletar)"
              disabled={isSubmitting}
            />
            {errors.winnerName && <p className="text-sm text-destructive mt-1">{errors.winnerName.message}</p>}
          </div>
          <div>
            <Label htmlFor="winnerPhone">Teléfono del Ganador (Opcional)</Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="winnerPhone"
                type="tel"
                {...register("winnerPhone")}
                placeholder="Ej: 0414-1234567 (o dejar vacío para autocompletar)"
                disabled={isSubmitting}
                className="pl-8"
              />
            </div>
            {errors.winnerPhone && <p className="text-sm text-destructive mt-1">{errors.winnerPhone.message}</p>}
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting} className="text-xs h-8">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="text-xs h-8">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Registrando...' : 'Registrar Ganador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

