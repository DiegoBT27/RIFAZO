

'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, useFieldArray, useWatch } from 'react-hook-form';
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
import type { Raffle, RaffleResult, Prize, Participation } from '@/types';
import { Loader2, Trophy, Phone, CheckCircle, XCircle } from 'lucide-react';
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
  const [confirmedParticipations, setConfirmedParticipations] = useState<Participation[]>([]);
  const [foundWinners, setFoundWinners] = useState<Record<number, string | null>>({});

  const { control, register, handleSubmit, reset, watch, formState: { errors } } = useForm<RegisterWinnerFormValues>({
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
      const fetchParticipations = async () => {
        try {
          const parts = await getParticipationsByRaffleId(raffle.id);
          setConfirmedParticipations(parts.filter(p => p.paymentStatus === 'confirmed'));
        } catch (error) {
          setConfirmedParticipations([]);
        }
      };
      
      fetchParticipations();
      reset({
        winners: raffle.prizes.map(() => ({ winningNumber: undefined, winnerName: '', winnerPhone: '' })),
      });
      setFoundWinners({});
    }
  }, [isOpen, raffle, reset]);

  const watchedWinners = watch('winners');

  useEffect(() => {
      const newFoundWinners: Record<number, string | null> = {};
      if (confirmedParticipations.length > 0) {
        watchedWinners.forEach((winner, index) => {
            const num = winner.winningNumber;
            if (num && num > 0) {
                const p = confirmedParticipations.find(part => part.numbers.includes(num));
                newFoundWinners[index] = p ? `${p.participantName || ''} ${p.participantLastName || ''}`.trim() : null;
            } else {
                newFoundWinners[index] = undefined; // Use undefined for no input
            }
        });
      }
      setFoundWinners(newFoundWinners);
  }, [watchedWinners, confirmedParticipations]);


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
      
      const participations = confirmedParticipations;

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
      await updateRaffle(raffle.id, raffleUpdateData);

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
            Ingresa el número ganador para cada premio. El sistema verificará si el boleto fue vendido.
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
                   {foundWinners[index] !== undefined && (
                    <div className="text-xs mt-1.5 flex items-center">
                        {foundWinners[index] ? (
                            <>
                                <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-600"/>
                                <span className="text-green-700">Boleto vendido a: {foundWinners[index]}</span>
                            </>
                        ) : (
                             <>
                                <XCircle className="h-3.5 w-3.5 mr-1 text-destructive"/>
                                <span className="text-destructive">Este boleto no fue vendido o confirmado.</span>
                            </>
                        )}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor={`winners.${index}.winnerName`}>Nombre del Ganador (Opcional)</Label>
                  <Input
                    id={`winners.${index}.winnerName`}
                    {...register(`winners.${index}.winnerName`)}
                    placeholder="Nombre del ganador (opcional)"
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
                      placeholder="Teléfono del ganador (opcional)"
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
