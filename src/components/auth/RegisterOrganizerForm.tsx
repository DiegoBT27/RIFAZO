
'use client';

import { useState, type ChangeEvent, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { addUser } from '@/lib/firebase/firestoreService';
import type { ManagedUser } from '@/types';
import { Loader2, User, UserSquare, Mail, Phone, MapPin, Building, Banknote, ShieldCheck, Signature, Send, FileText, RefreshCw, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ADMIN_WHATSAPP_NUMBER = "584141135956";

const organizerFormSchema = z.object({
  // Personal Data
  fullName: z.string().optional(),
  idCardNumber: z.string().min(5, "Cédula de identidad es requerida."),
  email: z.string().email("Correo electrónico inválido."),
  whatsappNumber: z.string().min(10, "Número de WhatsApp es requerido."),
  
  // Location
  locationState: z.string().min(3, "Estado es requerido."),
  locationCity: z.string().min(3, "Ciudad es requerida."),
  
  // Commercial Info
  commercialName: z.string().optional(),
  paymentMethods: z.array(z.string()).min(1, "Selecciona al menos un método de pago."),
  otherPaymentMethod: z.string().optional(),

  // Public Profile
  publicAlias: z.string().min(3, "El alias público es requerido y debe tener al menos 3 caracteres."),
  bio: z.string().max(200, "La biografía no puede exceder 200 caracteres.").optional(),
  organizerType: z.enum(['individual', 'business'], { required_error: "Debes seleccionar un tipo de perfil." }),
  companyName: z.string().optional(),
  rif: z.string().optional(),

  // Access Data
  username: z.string().min(3, "Nombre de usuario debe tener al menos 3 caracteres.").regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  confirmPassword: z.string(),

  // Captcha
  captchaText: z.string().min(1, "El código de verificación es requerido."),

  // Declarations
  commitmentAgreed: z.boolean().refine(val => val === true, "Debes aceptar este compromiso."),
  guaranteeAgreed: z.boolean().refine(val => val === true, "Debes aceptar esta garantía."),
  fraudPolicyAgreed: z.boolean().refine(val => val === true, "Debes aceptar esta política."),
  contactAgreed: z.boolean().refine(val => val === true, "Debes autorizar el contacto para continuar."),
  termsAgreed: z.boolean().refine(val => val === true, "Debes aceptar los términos de RIFAZO."),
  infoIsTruthfulAgreed: z.boolean().refine(val => val === true, "Debes declarar que la información es verdadera."),
  
})
.refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
})
.refine(data => {
    if (data.paymentMethods.includes('Otro') && (!data.otherPaymentMethod || data.otherPaymentMethod.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Por favor, especifica el otro método de pago.",
    path: ["otherPaymentMethod"],
})
.superRefine((data, ctx) => {
    if (data.organizerType === 'individual') {
        if (!data.fullName || data.fullName.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nombre completo es requerido para perfil individual.",
                path: ["fullName"],
            });
        }
    } else if (data.organizerType === 'business') {
        if (!data.companyName || data.companyName.length < 3) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nombre de la empresa es requerido.",
                path: ["companyName"],
            });
        }
        if (!data.rif || data.rif.length < 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "RIF es requerido para perfil de negocio.",
                path: ["rif"],
            });
        }
    }
});


type OrganizerFormValues = z.infer<typeof organizerFormSchema>;

const paymentMethodOptions = ["Pago Móvil", "Zelle", "Binance (USDT)", "Transferencia Bancaria"];

export default function RegisterOrganizerForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [captchaText, setCaptchaText] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<OrganizerFormValues>({
    resolver: zodResolver(organizerFormSchema),
    defaultValues: {
      organizerType: 'individual',
      paymentMethods: [],
      commitmentAgreed: false,
      guaranteeAgreed: false,
      fraudPolicyAgreed: false,
      contactAgreed: false,
      termsAgreed: false,
      infoIsTruthfulAgreed: false,
    }
  });

  const watchOrganizerType = watch("organizerType");


  const generateWhatsappMessage = (data: OrganizerFormValues): string => {
    const paymentMethodsText = data.paymentMethods.includes('Otro')
      ? [...data.paymentMethods.filter(p => p !== 'Otro'), `Otro: ${data.otherPaymentMethod}`].join(', ')
      : data.paymentMethods.join(', ');
      
    let personalIdentifier = data.organizerType === 'individual' 
        ? `*Nombre completo:* ${data.fullName}` 
        : `*Empresa:* ${data.companyName}\n*RIF:* ${data.rif}`;

    return `
*NUEVA SOLICITUD DE ORGANIZADOR - RIFAZO*
-------------------------------------
*👤 DATOS PERSONALES*
${personalIdentifier}
*Cédula de identidad:* ${data.idCardNumber}
*Correo electrónico:* ${data.email}
*Número de teléfono (WhatsApp):* ${data.whatsappNumber}

*📍 UBICACIÓN*
*Estado:* ${data.locationState}
*Ciudad:* ${data.locationCity}

*🏷️ INFORMACIÓN COMERCIAL*
*Nombre del proyecto:* ${data.commercialName || 'N/A'}
*Métodos de pago:* ${paymentMethodsText}

*🌐 PERFIL PÚBLICO*
*Alias visible:* ${data.publicAlias}
*Biografía:* ${data.bio || 'N/A'}
*Perfil del organizador:* ${data.organizerType === 'individual' ? 'Individual' : 'Negocio o marca'}

*🔒 DATOS DE ACCESO (sistema)*
*Nombre de Usuario:* ${data.username}
*(La contraseña es privada y no se muestra)*

*✅ DECLARACIÓN Y COMPROMISO*
- Me comprometo a rifar productos reales y legales: Sí
- Garantizo la entrega del premio al ganador: Sí
- Entiendo que el fraude será motivo de suspensión: Sí
- Acepto los términos de RIFAZO: Sí
- Autorizo ser contactado por soporte: Sí
- Toda la información proporcionada es verdadera: Sí

*📝 CONFIRMACIÓN FINAL*
(Confirmado mediante CAPTCHA)
-------------------------------------
*Por favor, revise esta solicitud para su aprobación. Para completar la verificación, por favor adjunta una foto de tu cédula en este chat.*
    `;
  };

  const onSubmit: SubmitHandler<OrganizerFormValues> = async (data) => {
    setIsSubmitting(true);
    
    if (data.captchaText !== captchaText) {
      toast({ title: "Error de Verificación", description: "El código de verificación no coincide.", variant: "destructive" });
      generateCaptcha();
      setIsSubmitting(false);
      return;
    }

    try {
      const newUser: Omit<ManagedUser, 'id'> = {
        username: data.username,
        password: data.password,
        role: 'pending_approval',
        isBlocked: false,
        fullName: data.organizerType === 'individual' ? data.fullName : undefined,
        companyName: data.organizerType === 'business' ? data.companyName : undefined,
        rif: data.organizerType === 'business' ? data.rif : undefined,
        idCardNumber: data.idCardNumber,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
        locationState: data.locationState,
        locationCity: data.locationCity,
        commercialName: data.commercialName,
        offeredPaymentMethods: data.paymentMethods.includes('Otro') 
          ? [...data.paymentMethods.filter(p => p !== 'Otro'), `Otro: ${data.otherPaymentMethod}`]
          : data.paymentMethods,
        publicAlias: data.publicAlias,
        bio: data.bio,
        organizerType: data.organizerType,
        commitmentAgreed: data.commitmentAgreed,
        guaranteeAgreed: data.guaranteeAgreed,
        fraudPolicyAgreed: data.fraudPolicyAgreed,
        contactAgreed: data.contactAgreed,
        termsAgreed: data.termsAgreed,
        infoIsTruthfulAgreed: data.infoIsTruthfulAgreed,
      };

      await addUser(newUser);

      const message = generateWhatsappMessage(data);
      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      
      toast({
        title: "Solicitud Enviada",
        description: "Tu solicitud ha sido enviada. Serás redirigido a WhatsApp para completar el proceso de verificación.",
        duration: 7000,
      });

      setTimeout(() => {
          window.open(whatsappUrl, '_blank');
      }, 1000);

      setIsSubmitting(false);

    } catch (e: any) {
      console.error("Error submitting organizer application:", e);
      if (e.message.includes("ya existe") || e.message.includes("ya está en uso") || e.message.includes("ya está registrado")) {
        toast({ title: "Dato Duplicado", description: e.message, variant: "destructive", duration: 7000 });
      } else {
        toast({ title: "Error", description: e.message || "No se pudo enviar la solicitud.", variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const renderSection = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <Card className="p-4 sm:p-6 shadow-sm">
      <h3 className="font-headline text-lg text-primary flex items-center mb-4">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );

  return (
    <>
    <Card className="w-full max-w-2xl">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {renderSection("Perfil del Organizador", <User className="h-5 w-5"/>,
            <>
              <div>
                <Label htmlFor="organizerType" className="sr-only">Tipo de Perfil</Label>
                <Controller
                  name="organizerType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup id="organizerType" onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4 pt-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="individual" id="r-individual" />
                        <Label htmlFor="r-individual">Individual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="business" id="r-business" />
                        <Label htmlFor="r-business">Negocio o marca</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.organizerType && <p className="text-sm text-destructive mt-1">{errors.organizerType.message}</p>}
              </div>

              {watchOrganizerType === 'individual' && (
                <div>
                  <Label htmlFor="fullName" className="sr-only">Nombre completo</Label>
                  <Input id="fullName" {...register("fullName")} placeholder="Nombre completo" disabled={isSubmitting} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>
              )}

              {watchOrganizerType === 'business' && (
                <>
                  <div>
                    <Label htmlFor="companyName" className="sr-only">Nombre de la Empresa</Label>
                    <Input id="companyName" {...register("companyName")} placeholder="Nombre de la Empresa" disabled={isSubmitting} />
                    {errors.companyName && <p className="text-sm text-destructive mt-1">{errors.companyName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="rif" className="sr-only">RIF de la Empresa</Label>
                    <Input id="rif" {...register("rif")} placeholder="RIF de la Empresa" disabled={isSubmitting} />
                    {errors.rif && <p className="text-sm text-destructive mt-1">{errors.rif.message}</p>}
                  </div>
                </>
              )}
            </>
          )}

          {renderSection("Datos Personales y de Contacto", <User className="h-5 w-5"/>,
            <>
              <div>
                <Label htmlFor="idCardNumber" className="sr-only">Cédula de identidad</Label>
                <Input id="idCardNumber" {...register("idCardNumber")} placeholder="Cédula de identidad" disabled={isSubmitting} />
                {errors.idCardNumber && <p className="text-sm text-destructive mt-1">{errors.idCardNumber.message}</p>}
              </div>
              <div>
                 <Label htmlFor="email" className="sr-only">Correo electrónico</Label>
                <Input id="email" type="email" {...register("email")} placeholder="Correo electrónico" disabled={isSubmitting} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                 <Label htmlFor="whatsappNumber" className="sr-only">Número de teléfono (WhatsApp)</Label>
                <Input id="whatsappNumber" type="tel" {...register("whatsappNumber")} placeholder="Número de teléfono (WhatsApp)" disabled={isSubmitting} />
                 <p className="text-xs text-muted-foreground mt-1 px-1">Este número será visible para los participantes de tus rifas. Se usará para contactarte y coordinar los pagos.</p>
                {errors.whatsappNumber && <p className="text-sm text-destructive mt-1">{errors.whatsappNumber.message}</p>}
              </div>
            </>
          )}

          {renderSection("Ubicación", <MapPin className="h-5 w-5"/>,
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="locationState" className="sr-only">Estado</Label>
                <Input id="locationState" {...register("locationState")} placeholder="Estado" disabled={isSubmitting} />
                {errors.locationState && <p className="text-sm text-destructive mt-1">{errors.locationState.message}</p>}
              </div>
              <div>
                 <Label htmlFor="locationCity" className="sr-only">Ciudad</Label>
                <Input id="locationCity" {...register("locationCity")} placeholder="Ciudad" disabled={isSubmitting} />
                {errors.locationCity && <p className="text-sm text-destructive mt-1">{errors.locationCity.message}</p>}
              </div>
            </div>
          )}
          
          {renderSection("Verificación de Identidad", <UserSquare className="h-5 w-5"/>,
             <div>
               <p className="text-sm text-muted-foreground mb-1.5 px-1">Para verificar tu identidad, te pediremos que envíes una foto de tu cédula por WhatsApp al finalizar el registro.</p>
            </div>
          )}


          {renderSection("Información Comercial", <Building className="h-5 w-5"/>,
            <>
              <div>
                <Label htmlFor="commercialName" className="sr-only">Nombre del proyecto o emprendimiento (si aplica)</Label>
                <Input id="commercialName" {...register("commercialName")} placeholder="Nombre del proyecto o emprendimiento (si aplica)" disabled={isSubmitting} />
              </div>
              <div>
                <Label className="px-1 text-muted-foreground">Métodos de pago que ofreces</Label>
                <Controller
                    name="paymentMethods"
                    control={control}
                    render={({ field }) => (
                        <div className="space-y-2 pt-2">
                        {paymentMethodOptions.map((item) => (
                            <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                                id={`payment-${item}`}
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                return checked
                                    ? field.onChange([...(field.value || []), item])
                                    : field.onChange((field.value || []).filter((value) => value !== item));
                                }}
                            />
                            <Label htmlFor={`payment-${item}`} className="font-normal">{item}</Label>
                            </div>
                        ))}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="payment-Otro"
                                checked={field.value?.includes('Otro')}
                                onCheckedChange={(checked) => {
                                return checked
                                    ? field.onChange([...(field.value || []), 'Otro'])
                                    : field.onChange((field.value || []).filter((value) => value !== 'Otro'));
                                }}
                            />
                             <Label htmlFor="payment-Otro" className="font-normal">Otro:</Label>
                            <Input {...register("otherPaymentMethod")} placeholder="Especifica el otro método" disabled={!watch("paymentMethods")?.includes('Otro')} className="h-8 flex-1" />
                        </div>
                        </div>
                    )}
                />
                 {errors.paymentMethods && <p className="text-sm text-destructive mt-1">{errors.paymentMethods.message}</p>}
                 {errors.otherPaymentMethod && <p className="text-sm text-destructive mt-1">{errors.otherPaymentMethod.message}</p>}
              </div>
            </>
          )}

          {renderSection("Perfil Público", <Banknote className="h-5 w-5"/>,
            <>
              <div>
                <Label htmlFor="publicAlias" className="sr-only">Alias público</Label>
                <Input id="publicAlias" {...register("publicAlias")} disabled={isSubmitting} placeholder="Alias público (requerido)"/>
                <p className="text-xs text-muted-foreground mt-1 px-1">Este alias aparecerá en tus rifas y será visible públicamente.</p>
                {errors.publicAlias && <p className="text-sm text-destructive mt-1">{errors.publicAlias.message}</p>}
              </div>
              <div>
                <Label htmlFor="bio" className="sr-only">Biografía corta (máximo 200 caracteres)</Label>
                <Textarea id="bio" {...register("bio")} disabled={isSubmitting} rows={3} placeholder="Biografía corta (máximo 200 caracteres)" />
                {errors.bio && <p className="text-sm text-destructive mt-1">{errors.bio.message}</p>}
              </div>
            </>
          )}

          {renderSection("Datos de Acceso (Sistema)", <ShieldCheck className="h-5 w-5"/>,
            <>
              <div>
                <Label htmlFor="username" className="sr-only">Nombre de usuario</Label>
                <Input id="username" {...register("username")} placeholder="Nombre de usuario" disabled={isSubmitting} />
                {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="sr-only">Contraseña (mínimo 6 caracteres)</Label>
                <Input id="password" type="password" {...register("password")} placeholder="Contraseña (mínimo 6 caracteres)" disabled={isSubmitting} />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div>
                 <Label htmlFor="confirmPassword" className="sr-only">Repetir contraseña</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} placeholder="Repetir contraseña" disabled={isSubmitting} />
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </>
          )}

          {renderSection("Declaración y Compromiso", <Signature className="h-5 w-5"/>,
            <div className="space-y-3">
              {[
                  { id: 'commitmentAgreed', label: 'Me comprometo a rifar productos reales y legales' },
                  { id: 'guaranteeAgreed', label: 'Garantizo la entrega del premio al ganador' },
                  { id: 'fraudPolicyAgreed', label: 'Entiendo que el fraude será motivo de suspensión' },
                  { id: 'contactAgreed', label: 'También autorizo que el equipo de RIFAZO me contacte por WhatsApp o correo en caso de verificación o soporte.' },
                  { id: 'infoIsTruthfulAgreed', label: 'Toda la información proporcionada es verdadera.' },
              ].map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                    <Label htmlFor={item.id} className="sr-only">{item.label}</Label>
                    <Controller name={item.id as keyof OrganizerFormValues} control={control} render={({ field }) => <Checkbox id={item.id} checked={!!field.value} onCheckedChange={field.onChange} />} />
                    <Label htmlFor={item.id} className="text-xs font-normal">{item.label}</Label>
                    {errors[item.id as keyof OrganizerFormValues] && <p className="text-sm text-destructive mt-1">{errors[item.id as keyof OrganizerFormValues]?.message as string}</p>}
                </div>
              ))}
               <div className="flex items-start space-x-2">
                    <Label htmlFor="termsAgreed" className="sr-only">He leído y acepto los términos y condiciones de uso de RIFAZO.</Label>
                    <Controller name="termsAgreed" control={control} render={({ field }) => <Checkbox id="termsAgreed" checked={!!field.value} onCheckedChange={field.onChange} />} />
                    <Label htmlFor="termsAgreed" className="text-xs font-normal leading-tight">
                        He leído y acepto los <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={() => setIsTermsOpen(true)}>términos y condiciones</Button> de uso de RIFAZO.
                    </Label>
                    {errors.termsAgreed && <p className="text-sm text-destructive mt-1">{errors.termsAgreed.message as string}</p>}
                </div>
            </div>
          )}

          {renderSection("Verificación Humana", <Key className="h-5 w-5" />, 
            <>
              <div className="flex items-center gap-4">
                <div className="p-2 border rounded-md bg-muted select-none flex-grow text-center">
                  <span className="text-lg font-bold tracking-[.3em] font-mono">{captchaText}</span>
                </div>
                <Button variant="outline" size="icon" type="button" onClick={generateCaptcha} title="Refrescar código">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label htmlFor="captchaText" className="sr-only">Introduce el código de arriba</Label>
                <Input id="captchaText" {...register("captchaText")} placeholder="Introduce el código de arriba" disabled={isSubmitting} />
                {errors.captchaText && <p className="text-sm text-destructive mt-1">{errors.captchaText.message}</p>}
              </div>
            </>
          )}
          
          <Separator />
          <Button type="submit" className="w-full text-base py-6" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5"/>}
            {isSubmitting ? 'Enviando Solicitud...' : 'Enviar Solicitud a Revisión'}
          </Button>
        </form>
      </CardContent>
    </Card>

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
