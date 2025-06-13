
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  username: z.string().min(1, { message: "El nombre de usuario es requerido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const ADMIN_WHATSAPP_NUMBER = "584141135956"; // Defined for the new link

export default function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
        username: '',
        password: '',
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    console.log(`[LoginForm] Attempting login for user: ${data.username}`);
    const success = await login(data.username, data.password);
    if (!success) {
      setError("Nombre de usuario o contraseña incorrectos.");
      console.warn(`[LoginForm] Login failed for ${data.username}.`);
    } else {
      console.log(`[LoginForm] Login successful for ${data.username}. Redirection is handled by AuthContext.`);
    }
    setIsLoading(false);
  };

  const adminInterestMessage = encodeURIComponent("¡Hola! Estoy interesado/a en ser organizador/administrador en RIFAZO.");
  const whatsappAdminUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${adminInterestMessage}`;

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-3xl">Iniciar Sesión</CardTitle>
        <CardDescription>Accede a RIFAZO</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error de Autenticación</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="username-login">Nombre de Usuario</Label>
            <Input id="username-login" {...register("username")} placeholder="usuario" disabled={isLoading} />
            {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <Label htmlFor="password-login">Contraseña</Label>
            <div className="relative">
                <Input
                  id="password-login"
                  type="password"
                  {...register("password")}
                  placeholder="tu contraseña"
                  disabled={isLoading}
                  className="pr-10"
                />
                <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center text-center text-sm space-y-2 pt-4">
        <div>
          <span>¿No tienes una cuenta?&nbsp;</span>
          <Link href="/register" className="text-primary hover:underline font-medium">
            Regístrate aquí
          </Link>
        </div>
        <div>
          <a
            href={whatsappAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            ¿Quieres ser organizador/administrador? Contáctanos
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
