

'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import StarRatingInput from './StarRatingInput';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addRating, addActivityLog } from '@/lib/firebase/firestoreService';
import { Loader2, Star, Send } from 'lucide-react';
import type { Rating } from '@/types';

const ratingSchema = z.object({
  ratingStars: z.number().min(1, "Debes seleccionar al menos una estrella.").max(5),
  comment: z.string().max(500, "El comentario no puede exceder los 500 caracteres.").optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface RateOrganizerDialogProps {
  raffleId: string;
  raffleName: string;
  organizerUsername: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSubmitted: () => void; // Callback to refresh participations list
}

export default function RateOrganizerDialog({
  raffleId,
  raffleName,
  organizerUsername,
  isOpen,
  onOpenChange,
  onRatingSubmitted
}: RateOrganizerDialogProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      ratingStars: 0,
      comment: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset({ ratingStars: 0, comment: '' });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: RatingFormValues) => {
    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "Debes iniciar sesión para calificar.", variant: "destructive" });
      return;
    }
    if (data.ratingStars === 0) {
      toast({ title: "Calificación Incompleta", description: "Por favor, selecciona una cantidad de estrellas.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const ratingData: Omit<Rating, 'id' | 'createdAt'> = {
        raffleId,
        raffleName,
        organizerUsername,
        raterUsername: currentUser.username,
        ratingStars: data.ratingStars,
        comment: data.comment || undefined,
      };
      await addRating(ratingData);
      
      await addActivityLog({
          adminUsername: currentUser.username, // User doing the rating
          actionType: 'ORGANIZER_RATED',
          targetInfo: `Organizador: ${organizerUsername} por rifa: ${raffleName}`,
          details: { 
            raffleId: raffleId,
            raffleName: raffleName,
            organizerRated: organizerUsername,
            stars: data.ratingStars,
            comment: data.comment,
          }
      });


      toast({
        title: "Calificación Enviada",
        description: `Gracias por calificar a ${organizerUsername}.`,
      });
      onOpenChange(false);
      onRatingSubmitted(); 
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({ title: "Error", description: "No se pudo enviar tu calificación.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-lg">Calificar a {organizerUsername}</DialogTitle>
          <DialogDescription>
            Comparte tu experiencia sobre la rifa "{raffleName}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="ratingStars" className="mb-1.5 block">Estrellas</Label>
            <Controller
              name="ratingStars"
              control={control}
              render={({ field }) => (
                <StarRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  size={32}
                  className="justify-center sm:justify-start"
                />
              )}
            />
            {errors.ratingStars && <p className="text-sm text-destructive mt-1">{errors.ratingStars.message}</p>}
          </div>
          <div>
            <Label htmlFor="comment">Comentario (Opcional)</Label>
            <Textarea
              id="comment"
              {...control.register("comment")}
              placeholder="Describe tu experiencia con el organizador y la rifa..."
              rows={3}
              maxLength={500}
              className="text-sm"
            />
            {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>}
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting} size="sm" className="text-xs">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} size="sm" className="text-xs">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Enviando...' : 'Enviar Calificación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
