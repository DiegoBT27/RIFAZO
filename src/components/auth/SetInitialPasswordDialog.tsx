
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { ManagedUser } from '@/types';

const setPasswordSchema = z.object({
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "La confirmación debe tener al menos 6 caracteres." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

interface SetInitialPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser;
}

export default function SetInitialPasswordDialog({ isOpen, onOpenChange, user }: SetInitialPasswordDialogProps) {
  const { completeRegistration, login } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  const onSubmit: SubmitHandler<SetPasswordFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      // We use the same login function, which now has the logic to handle this case
      const result = await login(user.username, data.password);

      if (result.success) {
        toast({
          title: "¡Contraseña Creada!",
          description: "Has establecido tu contraseña y has iniciado sesión exitosamente.",
        });
        onOpenChange(false);
        reset();
      } else {
        // Handle potential errors during the final login attempt
        toast({
            title: "Error",
            description: "No se pudo completar el inicio de sesión. Por favor, intenta de nuevo.",
            variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error Inesperado",
        description: "Ocurrió un error al establecer tu contraseña.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-lg">¡Bienvenido a RIFAZO, {user.username}!</DialogTitle>
          <DialogDescription>
            Este parece ser tu primer inicio de sesión. Por favor, establece una contraseña para asegurar tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
           <div>
              <Label htmlFor="initial-password">Crea tu Contraseña</Label>
              <div className="relative">
                <Input
                  id="initial-password"
                  type="password"
                  {...register("password")}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isSubmitting}
                />
                 <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="initial-confirmPassword">Confirma tu Contraseña</Label>
              <div className="relative">
                 <Input
                    id="initial-confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="Repite la contraseña"
                    disabled={isSubmitting}
                  />
                  <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>
          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Guardando...' : 'Guardar y Entrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    