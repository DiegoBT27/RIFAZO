
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, Loader2, UserPlus, KeyRound } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { addUser, getUserByUsername } from '@/lib/firebase/firestoreService';
import type { ManagedUser } from '@/types';

const registerSchema = z.object({
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." }).regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo."),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "La confirmación de contraseña debe tener al menos 6 caracteres." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"], // path of error
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const existingUser = await getUserByUsername(data.username);
      if (existingUser) {
        setError("Este nombre de usuario ya está en uso. Por favor, elige otro.");
        setIsLoading(false);
        return;
      }

      const newUserPartial: Omit<ManagedUser, 'id'> = {
        username: data.username,
        password: data.password, // En una app real, esto debería ser hasheado
        role: 'user', // Todos los usuarios registrados por esta vía son 'user'
        // Los campos de perfil como publicAlias, fullName, etc., quedan undefined y pueden ser completados más tarde
        // o al momento de la primera compra, o mediante un perfil de usuario.
      };

      await addUser(newUserPartial);

      toast({
        title: "¡Registro Exitoso!",
        description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.",
      });
      router.push('/login');

    } catch (e) {
      console.error("Error durante el registro:", e);
      setError("Ocurrió un error durante el registro. Por favor, intenta de nuevo.");
      toast({
        title: "Error de Registro",
        description: "No se pudo crear tu cuenta. Intenta más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl">Crear Cuenta</CardTitle>
        <CardDescription>Regístrate para participar en RIFAZO</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Registro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="username-register">Nombre de Usuario</Label>
            <Input id="username-register" {...register("username")} placeholder="Elige un nombre de usuario" disabled={isLoading} />
            {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <Label htmlFor="password-register">Contraseña</Label>
             <div className="relative">
                <Input
                  id="password-register"
                  type="password"
                  {...register("password")}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isLoading}
                  className="pr-10"
                />
                <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  placeholder="Repite tu contraseña"
                  disabled={isLoading}
                  className="pr-10"
                />
                <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isLoading ? 'Registrando...' : 'Registrarme'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p>¿Ya tienes una cuenta?&nbsp;</p>
        <Link href="/login" className="text-primary hover:underline font-medium">
          Inicia sesión aquí
        </Link>
      </CardFooter>
    </Card>
  );
}
