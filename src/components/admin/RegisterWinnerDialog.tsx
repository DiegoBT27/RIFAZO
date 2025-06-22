
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
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
import type { Raffle, RaffleResult, Prize } from '@/types';
import { Loader2, Trophy, Phone } from 'lucide-react';
import { updateRaffle, addRaffleResult, getParticipationsByRaffleId, addActivityLog } from '@/lib/firebase/firestoreService';

const registerWinnerSchema = z.object({
  winners: z.array(
    z.object({
      winningNumber: z.coerce
        .number({ required_error: "El número es requerido.", invalid_type_error: "Debe ser un número." })
        .int({ message: "Debe ser un número entero." })
        .min(1, { message: "El número debe ser al menos 1." }),
      winnerName: z.string().optional(),
      winnerPhone: z.string().max(25, "Máximo 25 caracteres.").optional(),
    })
  ).min(1, "Debe haber al menos un ganador."),
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

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<RegisterWinnerFormValues>({
    resolver: zodResolver(registerWinnerSchema),
    defaultValues: {
      winners: raffle.prizes.map(() => ({ winningNumber: undefined, winnerName: '', winnerPhone: '' })),
    },
  });
  
  const { fields } = useFieldArray({
    control,
    name: "winners",
  });
  
  useEffect(() => {
    if (isOpen) {
      reset({
        winners: raffle.prizes.map(() => ({ winningNumber: undefined, winnerName: '', winnerPhone: '' })),
      });
    }
  }, [isOpen, raffle, reset]);

  const onSubmit: SubmitHandler<RegisterWinnerFormValues> = async (data) => {
    setIsSubmitting(true);
    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al usuario.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      for (const winner of data.winners) {
         if (winner.winningNumber > raffle.totalNumbers) {
            toast({
              title: "Error de Validación",
              description: `El número ganador (${winner.winningNumber}) no puede ser mayor que el total de números de la rifa (${raffle.totalNumbers}).`,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
      }

      const winningNumbers: (number | null)[] = [];
      const winnerNames: (string | null)[] = [];
      const winnerPhones: (string | null)[] = [];
      
      const participations = await getParticipationsByRaffleId(raffle.id);

      for (const winnerData of data.winners) {
        let finalWinnerName = winnerData.winnerName;
        let finalWinnerPhone = winnerData.winnerPhone;

        if ((!finalWinnerName || finalWinnerName.trim() === '')) {
            const winningParticipation = participations.find(p =>
                p.paymentStatus === 'confirmed' && 
                p.numbers.includes(winnerData.winningNumber!)
            );

            if (winningParticipation) {
                if ((!finalWinnerName || finalWinnerName.trim() === '') && (winningParticipation.participantName || winningParticipation.participantLastName)) {
                    finalWinnerName = `${winningParticipation.participantName || ''} ${winningParticipation.participantLastName || ''}`.trim();
                }
                if ((!finalWinnerPhone || finalWinnerPhone.trim() === '') && winningParticipation.participantPhone) {
                    finalWinnerPhone = winningParticipation.participantPhone;
                }
            }
        }

        winningNumbers.push(winnerData.winningNumber || null);
        winnerNames.push(finalWinnerName || null);
        winnerPhones.push(finalWinnerPhone || null);
      }
      
      const raffleUpdateData: Partial<Raffle> = {
        winningNumbers,
        winnerNames,
        winnerPhones,
        status: 'completed',
      };
      await updateRaffle(raffle.id, raffleUpdateData, currentUser);

      const resultData: Omit<RaffleResult, 'id'> = {
        raffleId: raffle.id,
        raffleName: raffle.name,
        winningNumbers,
        winnerNames,
        winnerPhones,
        drawDate: raffle.drawDate,
        prizes: raffle.prizes,
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
          winningNumbers,
          winnerNames,
          winnerPhones,
        }
      });

      toast({
        title: "Ganador(es) Registrado(s)",
        description: `Se han registrado los resultados para la rifa "${raffle.name}".`,
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error registering winner:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el/los ganador(es).",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col h-auto max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="font-headline text-lg">Registrar Ganadores para: {raffle.name}</DialogTitle>
          <DialogDescription>
            Ingresa el número ganador para cada premio. El nombre y teléfono son opcionales (se intentarán autocompletar).
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto">
          <form id="register-winner-form" onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-3 border rounded-md space-y-3 bg-secondary/30">
                <h4 className="font-semibold text-sm">Premio {index + 1}: <span className="font-normal italic">{raffle.prizes[index].description}</span></h4>
                <div>
                  <Label htmlFor={`winners.${index}.winningNumber`}>Número Ganador</Label>
                  <Input
                    id={`winners.${index}.winningNumber`}
                    type="number"
                    {...register(`winners.${index}.winningNumber`)}
                    placeholder={`Entre 1 y ${raffle.totalNumbers}`}
                    disabled={isSubmitting}
                  />
                  {errors.winners?.[index]?.winningNumber && <p className="text-sm text-destructive mt-1">{errors.winners?.[index]?.winningNumber?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`winners.${index}.winnerName`}>Nombre del Ganador (Opcional)</Label>
                  <Input
                    id={`winners.${index}.winnerName`}
                    {...register(`winners.${index}.winnerName`)}
                    placeholder="Dejar vacío para autocompletar"
                    disabled={isSubmitting}
                  />
                  {errors.winners?.[index]?.winnerName && <p className="text-sm text-destructive mt-1">{errors.winners?.[index]?.winnerName?.message}</p>}
                </div>
                <div>
                  <Label htmlFor={`winners.${index}.winnerPhone`}>Teléfono del Ganador (Opcional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={`winners.${index}.winnerPhone`}
                      type="tel"
                      {...register(`winners.${index}.winnerPhone`)}
                      placeholder="Dejar vacío para autocompletar"
                      disabled={isSubmitting}
                      className="pl-8"
                    />
                  </div>
                  {errors.winners?.[index]?.winnerPhone && <p className="text-sm text-destructive mt-1">{errors.winners?.[index]?.winnerPhone?.message}</p>}
                </div>
              </div>
            ))}
          </form>
        </div>

        <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t bg-background">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting} className="text-xs h-8">Cancelar</Button>
            </DialogClose>
            <Button type="submit" form="register-winner-form" disabled={isSubmitting} className="text-xs h-8">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Registrando...' : 'Registrar Ganadores'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
