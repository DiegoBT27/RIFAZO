
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, Loader2, FileText, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';

const loginSchema = z.object({
  username: z.string().min(1, { message: "El nombre de usuario es requerido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
  privacyPolicyAccepted: z.boolean().refine(value => value === true, {
    message: "Debes aceptar las Políticas de Privacidad para continuar.",
  }),
  termsAndConditionsAccepted: z.boolean().refine(value => value === true, {
    message: "Debes aceptar los Términos y Condiciones para continuar.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const ADMIN_WHATSAPP_NUMBER = "584141135956";

export default function LoginForm() {
  const { login } = useAuth();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [dialogContent, setDialogContent] = useState<{ title: string; description: React.ReactNode } | null>(null);

  const handleFailedLoginAttempt = (reason?: 'blocked' | 'credentials_invalid' | 'account_locked' | 'user_not_found', lockoutMinutes?: number) => {
    switch (reason) {
      case 'blocked':
        setDialogContent({
          title: 'Cuenta Bloqueada',
          description: (
            <>
              Su cuenta ha sido bloqueada permanentemente por un administrador.
              {' '}
              <a href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, necesito ayuda para desbloquear mi cuenta RIFAZO.')}`} target="_blank" rel="noopener noreferrer" className="font-bold underline text-primary">
                Contactar a soporte aquí.
              </a>
            </>
          ),
        });
        break;
      case 'account_locked':
        setDialogContent({
          title: 'Cuenta Bloqueada Temporalmente',
          description: `Su cuenta ha sido bloqueada por ${lockoutMinutes} minutos debido a demasiados intentos fallidos.`,
        });
        break;
      case 'user_not_found':
        setDialogContent({
          title: 'Usuario No Encontrado',
          description: 'El nombre de usuario introducido no se encuentra registrado en nuestro sistema. Por favor, verifica tus datos o regístrate.',
        });
        break;
      case 'credentials_invalid':
        setDialogContent({
            title: 'Credenciales Incorrectas',
            description: `El nombre de usuario o la contraseña son incorrectos. Por favor, intenta de nuevo.`
        });
        break;
      default:
         setDialogContent({
            title: 'Error Inesperado',
            description: 'Ha ocurrido un error. Por favor, intenta de nuevo más tarde.'
         });
    }
  };


  const { register, handleSubmit, control, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
        username: '',
        password: '',
        privacyPolicyAccepted: false,
        termsAndConditionsAccepted: false,
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsFormLoading(true);
    setDialogContent(null);

    try {
      const loginResult = await login(data.username, data.password);
      
      if (!loginResult.success) {
        handleFailedLoginAttempt(loginResult.reason, loginResult.lockoutMinutes);
      }
    } catch (error) {
      console.error("[LoginForm] Error during onSubmit execution:", error);
      setDialogContent({
        title: 'Error de Conexión',
        description: 'No se pudo comunicar con el servidor. Revisa tu conexión e intenta de nuevo.'
      });
    } finally {
      setIsFormLoading(false);
    }
  };
  
  return (
    <>
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a RIFAZO</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="username-login">Nombre de Usuario</Label>
              <Input id="username-login" {...register("username")} placeholder="usuario" disabled={isFormLoading} />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <Label htmlFor="password-login">Contraseña</Label>
              <div className="relative">
                  <Input
                    id="password-login"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="tu contraseña"
                    disabled={isFormLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-accent hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isFormLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
                  </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <div className="flex items-start space-x-2">
                  <Controller
                    name="privacyPolicyAccepted"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="privacyPolicyAccepted-login"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isFormLoading}
                        className="h-3 w-3 mt-[2px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                      />
                    )}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="privacyPolicyAccepted-login" className="text-xs font-normal cursor-pointer">
                      Acepto las{' '}
                      <Button variant="link" type="button" className="p-0 h-auto text-xs text-primary hover:underline" onClick={() => setIsPrivacyPolicyOpen(true)} disabled={isFormLoading}>
                        Políticas de Privacidad
                      </Button>
                      .
                    </Label>
                    {errors.privacyPolicyAccepted && <p className="text-xs text-destructive">{errors.privacyPolicyAccepted.message}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start space-x-2">
                  <Controller
                    name="termsAndConditionsAccepted"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="termsAndConditionsAccepted-login"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isFormLoading}
                        className="h-3 w-3 mt-[2px] [&_svg]:h-2.5 [&_svg]:w-2.5"
                      />
                    )}
                  />
                  <div className="grid gap-0.5 leading-none">
                  <Label htmlFor="termsAndConditionsAccepted-login" className="text-xs font-normal cursor-pointer">
                    Acepto los{' '}
                    <Button variant="link" type="button" className="p-0 h-auto text-xs text-primary hover:underline" onClick={() => setIsTermsOpen(true)} disabled={isFormLoading}>
                      Términos y Condiciones
                    </Button>
                    .
                  </Label>
                  {errors.termsAndConditionsAccepted && <p className="text-xs text-destructive">{errors.termsAndConditionsAccepted.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full" 
              disabled={isFormLoading}
            >
              {isFormLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isFormLoading ? 'Ingresando...' : 'Ingresar'}
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
        </CardFooter>
      </Card>

      <Dialog open={!!dialogContent} onOpenChange={(open) => { if (!open) setDialogContent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <ShieldAlert className="mr-2 h-5 w-5 text-destructive" />
              {dialogContent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            {dialogContent?.description}
          </div>
          <DialogFooter className="mt-1">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="text-xs">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrivacyPolicyOpen} onOpenChange={setIsPrivacyPolicyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Políticas de Privacidad de la Aplicación RIFAZO</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4 my-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3 text-xs">
              <p><strong>Última actualización:</strong> [Junio 2025]</p>
              <p>En RIFAZO, nos comprometemos a proteger la privacidad y los datos personales de nuestros usuarios. Esta política explica qué información recopilamos, cómo la usamos y qué derechos tienes sobre tus datos.</p>

              <h4>1. INFORMACIÓN QUE RECOPILAMOS</h4>
              <p>Al usar RIFAZO, podemos recopilar la siguiente información:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Nombre de usuario</li>
                <li>Cédula de identidad</li>
                <li>Correo electrónico (si aplica)</li>
                <li>Número de teléfono (si lo proporciona el administrador)</li>
                <li>Historial de participación en rifas dentro de la app</li>
              </ul>
              <p>No realizamos cobros o pagos desde la app. Todo esto lo maneja el administrador de la rifa.</p>

              <h4>2. USO DE LA INFORMACIÓN</h4>
              <p>La información recolectada se utiliza para:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Gestionar el acceso y uso de la app</li>
                <li>Asociar al usuario con las rifas en las que participa</li>
                <li>Permitir la comunicación con el administrador de cada rifa</li>
                <li>Mejorar la experiencia del usuario dentro de la plataforma</li>
              </ul>

              <h4>3. COMPARTIR INFORMACIÓN</h4>
              <p>RIFAZO no vende, alquila ni comparte tus datos personales con terceros. La única interacción externa es mediante WhatsApp, cuando contactas directamente con un administrador.</p>

              <h4>4. SEGURIDAD</h4>
              <p>Tomamos medidas técnicas y organizativas razonables para proteger tus datos contra el acceso no autorizado, pérdida o destrucción. Sin embargo, al ser una app que depende de plataformas externas como WhatsApp, no podemos garantizar seguridad fuera del entorno de la app.</p>

              <h4>5. RETENCIÓN DE DATOS</h4>
              <p>Tus datos se almacenarán mientras mantengas tu cuenta activa. Si decides eliminar tu cuenta, también se eliminarán tus datos asociados.</p>

              <h4>6. TUS DERECHOS</h4>
              <p>Tienes derecho a:</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Acceder a tu información personal</li>
                <li>Solicitar correcciones o eliminación de tus datos</li>
                <li>Retirar tu consentimiento al uso de tus datos</li>
              </ul>
              <p>Puedes ejercer estos derechos contactando al soporte vía WhatsApp.</p>

              <h4>7. SOPORTE</h4>
              <p>Todas las consultas sobre privacidad pueden realizarse exclusivamente a través del ícono de soporte dentro de la app, que redirige a nuestro canal oficial de WhatsApp.</p>

              <h4>8. CAMBIOS EN ESTA POLÍTICA</h4>
              <p>Nos reservamos el derecho a modificar esta política en cualquier momento. Cualquier cambio será notificado dentro de la app o en nuestros canales oficiales.</p>

              <hr className="my-3"/>
              <p>Al registrarte y utilizar RIFAZO, aceptas estas Políticas de Privacidad.</p>
              <p><strong>Equipo de RIFAZO</strong></p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsPrivacyPolicyOpen(false)} variant="outline" size="sm">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />TÉRMINOS Y CONDICIONES DE USO DE LA APLICACIÓN RIFAZO</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4 my-4">
             <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3 text-xs">
              <p><strong>Última actualización:</strong> [Junio 2025]</p>
              <p>Bienvenido a RIFAZO. Esta aplicación tiene como propósito facilitar la gestión de rifas creadas por terceros (denominados en adelante "Administradores"). Al registrarte y utilizar esta aplicación, aceptas los siguientes términos y condiciones:</p>

              <h4>1. NATURALEZA DEL SERVICIO</h4>
              <p>RIFAZO es una plataforma digital que permite a los administradores organizar rifas y a los usuarios seleccionar números de participación. La app no gestiona ni procesa pagos, premios ni sorteos de manera directa.</p>

              <h4>2. PAGO Y ENTREGA DE PREMIOS</h4>
              <p>Los pagos de boletos y la entrega de premios son gestionados exclusivamente entre el usuario y el administrador de la rifa a través de WhatsApp u otros medios acordados. RIFAZO no actúa como intermediario financiero ni garantiza ninguna transacción.</p>

              <h4>3. RESPONSABILIDAD DE LOS ADMINISTRADORES</h4>
              <p>Cada rifa publicada en la plataforma es responsabilidad exclusiva del administrador que la crea. RIFAZO no se hace responsable de la veracidad, cumplimiento o legalidad de las rifas publicadas.</p>

              <h4>4. USO ADECUADO</h4>
              <p>Está prohibido utilizar la plataforma para actividades fraudulentas, ilegales o que infrinjan leyes venezolanas o derechos de terceros. Cualquier usuario que infrinja esta norma podrá ser bloqueado sin previo aviso.</p>

              <h4>5. PROTECCIÓN DE DATOS</h4>
              <p>La información personal proporcionada por los usuarios será utilizada únicamente para permitir el funcionamiento de la app (registro, participación en rifas y comunicación básica). No compartimos datos con terceros.</p>

              <h4>6. SOPORTE</h4>
              <p>El soporte técnico o funcional de la app se brinda exclusivamente a través de WhatsApp mediante el ícono de soporte presente dentro de la aplicación.</p>

              <h4>7. MODIFICACIONES</h4>
              <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones serán notificadas dentro de la app o en la página oficial del servicio.</p>

              <h4>8. ACEPTACIÓN</h4>
              <p>Al registrarte en RIFAZO, confirmas que has leído y aceptado estos Términos y Condiciones.</p>
              
              <hr className="my-3"/>
              <p>Si tienes dudas, puedes contactarnos por WhatsApp desde el botón de soporte dentro de la aplicación.</p>
              <p><strong>Equipo de RIFAZO</strong></p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsTermsOpen(false)} variant="outline" size="sm">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
