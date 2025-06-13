
'use client';

import { useState, type ChangeEvent } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Raffle, AcceptedPaymentMethod, AdminPagoMovilDetails, AdminPayPalDetails, AdminZinliDetails, AdminTransferenciaBancariaDetails, AdminZelleDetails, AdminDepositoBancarioDetails, AdminBinancePayDetails, AdminAirtmDetails } from '@/types';
import { AVAILABLE_PAYMENT_METHODS, PAYMENT_METHOD_CATEGORIES, getPaymentMethodsByCategory } from '@/lib/payment-methods';
import { LOTTERY_NAMES, DRAW_TIMES } from '@/lib/lottery-data';
import { CalendarIcon, Loader2, UploadCloud, Image as ImageIcon, DollarSign, Info, Mail, UserCircle, University, Phone, Building, Bitcoin, CreditCard, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { addRaffle } from '@/lib/firebase/firestoreService';

const raffleFormSchema = z.object({
  name: z.string().min(5, { message: "El nombre debe tener al menos 5 caracteres." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  image: z.string().min(1, { message: "Por favor, sube una imagen para la rifa." }), // Data URI
  prize: z.string().min(3, { message: "El premio debe tener al menos 3 caracteres." }),
  pricePerTicket: z.coerce.number().positive({ message: "El precio debe ser un número positivo." }),
  totalNumbers: z.coerce.number().int().min(10, { message: "Debe haber al menos 10 números." }).max(500, {message: "Máximo 500 números"}),
  drawDate: z.date({ required_error: "La fecha del sorteo es obligatoria."}).min(new Date(new Date().setDate(new Date().getDate())), { message: "La fecha no puede ser anterior a hoy." }),
  lotteryName: z.string().optional(),
  drawTime: z.string().optional(),
  selectedPaymentMethodIds: z.array(z.string())
    .min(1, { message: "Debes seleccionar al menos un método de pago." })
    .optional(),
  adminPagoMovilPhone: z.string().optional().or(z.literal('')),
  adminPagoMovilCi: z.string().optional().or(z.literal('')),
  adminPagoMovilBank: z.string().optional().or(z.literal('')),
  adminPayPalEmail: z.string().email({ message: "Debe ser un correo electrónico válido."}).optional().or(z.literal('')),
  adminZinliIdentifier: z.string().min(3, { message: "El identificador debe tener al menos 3 caracteres."}).optional().or(z.literal('')),
  adminBankName: z.string().optional().or(z.literal('')),
  adminAccountHolderName: z.string().optional().or(z.literal('')),
  adminAccountNumber: z.string().optional().or(z.literal('')),
  adminAccountType: z.string().optional().or(z.literal('')), 
  adminHolderId: z.string().optional().or(z.literal('')), 
  adminZelleName: z.string().optional().or(z.literal('')),
  adminZelleEmailOrPhone: z.string().optional().or(z.literal('')),
  adminDepositoInstructions: z.string().optional().or(z.literal('')),
  adminBinancePayIdentifier: z.string().optional().or(z.literal('')),
  adminAirtmEmail: z.string().email({ message: "Debe ser un correo electrónico válido."}).optional().or(z.literal('')),
})
.refine(data => data.selectedPaymentMethodIds && data.selectedPaymentMethodIds.length > 0, {
    message: "Debes seleccionar al menos un método de pago.",
    path: ["selectedPaymentMethodIds"],
})
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('pagoMovil')) {
    return data.adminPagoMovilPhone && data.adminPagoMovilCi && data.adminPagoMovilBank;
  }
  return true;
}, { message: "Los detalles de Pago Móvil (teléfono, CI, banco) son obligatorios si se selecciona.", path: ["adminPagoMovilPhone"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('paypal')) {
    return data.adminPayPalEmail;
  }
  return true;
}, { message: "El correo de PayPal es obligatorio si se selecciona.", path: ["adminPayPalEmail"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('zinli')) {
    return data.adminZinliIdentifier;
  }
  return true;
}, { message: "El identificador de Zinli es obligatorio si se selecciona.", path: ["adminZinliIdentifier"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('transferenciaBancaria')) {
    return data.adminBankName && data.adminAccountHolderName && data.adminAccountNumber && data.adminAccountType && data.adminHolderId;
  }
  return true;
}, { message: "Todos los detalles de Transferencia Bancaria son obligatorios si se selecciona.", path: ["adminBankName"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('zelle')) {
    return data.adminZelleName && data.adminZelleEmailOrPhone;
  }
  return true;
}, { message: "El nombre y correo/teléfono de Zelle son obligatorios si se selecciona.", path: ["adminZelleName"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('depositoBancario')) {
    return data.adminDepositoInstructions;
  }
  return true;
}, { message: "Las instrucciones para Depósito Bancario son obligatorias si se selecciona.", path: ["adminDepositoInstructions"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('binancePay')) {
    return data.adminBinancePayIdentifier;
  }
  return true;
}, { message: "El identificador de Binance Pay es obligatorio si se selecciona.", path: ["adminBinancePayIdentifier"] })
.refine(data => {
  if (data.selectedPaymentMethodIds?.includes('airtm')) {
    return data.adminAirtmEmail;
  }
  return true;
}, { message: "El correo de Airtm es obligatorio si se selecciona.", path: ["adminAirtmEmail"] });

type RaffleFormValues = z.infer<typeof raffleFormSchema>;

const paymentMethodsByCat = getPaymentMethodsByCategory();

interface CreateRaffleFormProps {
  onSuccess?: (newRaffle: Raffle) => void;
}

export default function CreateRaffleForm({ onSuccess }: CreateRaffleFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<RaffleFormValues>({
    resolver: zodResolver(raffleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      image: '',
      prize: '',
      pricePerTicket: 1,
      totalNumbers: 100,
      drawDate: new Date(new Date().setDate(new Date().getDate() + 1)), 
      lotteryName: 'manual_entry',
      drawTime: 'unspecified_time',
      selectedPaymentMethodIds: [],
      adminPagoMovilPhone: '',
      adminPagoMovilCi: '',
      adminPagoMovilBank: '',
      adminPayPalEmail: '',
      adminZinliIdentifier: '',
      adminBankName: '',
      adminAccountHolderName: '',
      adminAccountNumber: '',
      adminAccountType: '',
      adminHolderId: '',
      adminZelleName: '',
      adminZelleEmailOrPhone: '',
      adminDepositoInstructions: '',
      adminBinancePayIdentifier: '',
      adminAirtmEmail: '',
    }
  });

  const selectedPaymentMethodIds = watch('selectedPaymentMethodIds') || [];
  const isPagoMovilSelected = selectedPaymentMethodIds.includes('pagoMovil');
  const isPayPalSelected = selectedPaymentMethodIds.includes('paypal');
  const isZinliSelected = selectedPaymentMethodIds.includes('zinli');
  const isTransferenciaBancariaSelected = selectedPaymentMethodIds.includes('transferenciaBancaria');
  const isZelleSelected = selectedPaymentMethodIds.includes('zelle');
  const isDepositoBancarioSelected = selectedPaymentMethodIds.includes('depositoBancario');
  const isBinancePaySelected = selectedPaymentMethodIds.includes('binancePay');
  const isAirtmSelected = selectedPaymentMethodIds.includes('airtm');


  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Archivo Demasiado Grande",
          description: "La imagen no debe exceder los 2MB.",
          variant: "destructive",
        });
        event.target.value = ''; 
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(dataUri);
        setValue('image', dataUri, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setValue('image', '', { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<RaffleFormValues> = async (data) => {
    setIsLoading(true);

    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al creador de la rifa.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (!data.image) {
      toast({ title: "Error de Formulario", description: "Por favor, sube una imagen para la rifa.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (!data.selectedPaymentMethodIds || data.selectedPaymentMethodIds.length === 0) {
        toast({ title: "Error de Formulario", description: "Debes seleccionar al menos un método de pago.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const acceptedPaymentMethods: AcceptedPaymentMethod[] = data.selectedPaymentMethodIds
      .map(id => {
        const methodOption = AVAILABLE_PAYMENT_METHODS.find(pm => pm.id === id);
        if (!methodOption) return null;

        const paymentMethod: AcceptedPaymentMethod = {
          id: methodOption.id,
          name: methodOption.name,
          category: methodOption.category,
        };

        if (methodOption.id === 'pagoMovil') {
          paymentMethod.adminPagoMovilDetails = { phone: data.adminPagoMovilPhone!, ci: data.adminPagoMovilCi!, bank: data.adminPagoMovilBank! };
        } else if (methodOption.id === 'paypal') {
          paymentMethod.adminPayPalDetails = { email: data.adminPayPalEmail! };
        } else if (methodOption.id === 'zinli') {
          paymentMethod.adminZinliDetails = { accountIdentifier: data.adminZinliIdentifier! };
        } else if (methodOption.id === 'transferenciaBancaria') {
          paymentMethod.adminTransferenciaBancariaDetails = {
            bankName: data.adminBankName!,
            accountHolderName: data.adminAccountHolderName!,
            accountNumber: data.adminAccountNumber!,
            accountType: data.adminAccountType!,
            holderId: data.adminHolderId!,
          };
        } else if (methodOption.id === 'zelle') {
          paymentMethod.adminZelleDetails = { associatedName: data.adminZelleName!, emailOrPhone: data.adminZelleEmailOrPhone! };
        } else if (methodOption.id === 'depositoBancario') {
          paymentMethod.adminDepositoBancarioDetails = { instructions: data.adminDepositoInstructions! };
        } else if (methodOption.id === 'binancePay') {
          paymentMethod.adminBinancePayDetails = { identifier: data.adminBinancePayIdentifier! };
        } else if (methodOption.id === 'airtm') {
          paymentMethod.adminAirtmDetails = { email: data.adminAirtmEmail! };
        }
        return paymentMethod;
      })
      .filter(Boolean) as AcceptedPaymentMethod[];


    const raffleDataForDb: Omit<Raffle, 'id' | 'soldNumbers' | 'effectiveSoldNumbers'> = {
      name: data.name,
      description: data.description,
      image: data.image, 
      prize: data.prize,
      pricePerTicket: data.pricePerTicket,
      totalNumbers: data.totalNumbers,
      drawDate: format(data.drawDate, 'yyyy-MM-dd'),
      lotteryName: data.lotteryName === 'manual_entry' ? undefined : data.lotteryName,
      drawTime: data.drawTime === 'unspecified_time' ? undefined : data.drawTime,
      acceptedPaymentMethods: acceptedPaymentMethods,
      creatorUsername: currentUser.username,
    };

    try {
      const newRaffle = await addRaffle(raffleDataForDb);

      toast({
        title: "Rifa Creada Exitosamente",
        description: `La rifa "${newRaffle.name}" ha sido guardada en Firestore.`,
      });
      reset();
      setImagePreview(null);
      setValue('selectedPaymentMethodIds', []); 
      if (onSuccess) onSuccess(newRaffle);
    } catch (error) {
      console.error("Error saving raffle to Firestore:", error);
      toast({ title: "Error de Guardado", description: "No se pudo guardar la rifa en Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-1 pt-2 pb-4">
      <h3 className="font-headline text-lg sm:text-xl mb-1">Detalles de la Nueva Rifa</h3>
      <p className="text-xs text-muted-foreground mb-3 sm:mb-4">Completa la información para crear una nueva rifa.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="create-raffle-name" className="text-xs sm:text-sm">Nombre de la Rifa</Label>
          <Input id="create-raffle-name" {...register("name")} placeholder="Ej: Gran Rifa de Verano" className="h-9 text-xs sm:text-sm"/>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="description" className="text-xs sm:text-sm">Descripción Detallada</Label>
          <Textarea id="description" {...register("description")} placeholder="Describe el premio, las reglas, etc." className="text-xs sm:text-sm" rows={3}/>
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="image-upload-input" className="text-xs sm:text-sm">Imagen de la Rifa (Máx 2MB)</Label>
          <p className="text-[0.65rem] sm:text-xs text-muted-foreground -mt-0.5 mb-1">Recomendación: Imagen apaisada (ej: 800x600px) con contenido principal centrado.</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
              {imagePreview ? (
                <Image src={imagePreview} alt="Vista previa" width={96} height={96} className="object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-grow">
              <Label
                htmlFor="image-upload-input"
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "cursor-pointer"
                )}
                title="Subir Imagen"
              >
                <UploadCloud className="h-5 w-5" />
                <span className="sr-only">Subir Imagen</span>
              </Label>
              <input
                id="image-upload-input"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
          {errors.image && <p className="text-xs text-destructive mt-1">{errors.image.message}</p>}
        </div>

        <div>
          <Label htmlFor="prize" className="text-xs sm:text-sm">Premio Principal</Label>
          <Input id="prize" {...register("prize")} placeholder="Ej: Un iPhone 15 Pro Max" className="h-9 text-xs sm:text-sm"/>
          {errors.prize && <p className="text-xs text-destructive mt-1">{errors.prize.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="pricePerTicket" className="text-xs sm:text-sm">Precio por Boleto (USD)</Label>
            <Input id="pricePerTicket" type="number" step="0.01" {...register("pricePerTicket")} placeholder="Ej: 5.00" className="h-9 text-xs sm:text-sm"/>
            {errors.pricePerTicket && <p className="text-xs text-destructive mt-1">{errors.pricePerTicket.message}</p>}
          </div>
          <div>
            <Label htmlFor="totalNumbers" className="text-xs sm:text-sm">Cantidad Total de Números</Label>
            <Input id="totalNumbers" type="number" {...register("totalNumbers")} placeholder="Ej: 100" className="h-9 text-xs sm:text-sm"/>
            {errors.totalNumbers && <p className="text-xs text-destructive mt-1">{errors.totalNumbers.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="drawDate-trigger" className="text-xs sm:text-sm">Fecha del Sorteo</Label>
          <Controller
            name="drawDate"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild id="drawDate-trigger">
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal h-9 text-xs sm:text-sm", !field.value && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={es}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.drawDate && <p className="text-xs text-destructive mt-1">{errors.drawDate.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="lotteryName-select" className="text-xs sm:text-sm">Lotería de Referencia (Opcional)</Label>
            <Controller
              name="lotteryName"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || undefined} >
                  <SelectTrigger id="lotteryName-select" className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Selecciona una lotería o Manual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_entry">Entrada Manual del Ganador</SelectItem>
                    {LOTTERY_NAMES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.lotteryName && <p className="text-xs text-destructive mt-1">{errors.lotteryName.message}</p>}
          </div>
          <div>
            <Label htmlFor="drawTime-select" className="text-xs sm:text-sm">Hora del Sorteo (Opcional)</Label>
            <Controller
              name="drawTime"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <SelectTrigger id="drawTime-select" className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Selecciona una hora o No Especificada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified_time">No Especificada</SelectItem>
                    {DRAW_TIMES.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.drawTime && <p className="text-xs text-destructive mt-1">{errors.drawTime.message}</p>}
          </div>
        </div>

        <Separator className="my-3 sm:my-4" />
        <h4 className="font-headline text-base sm:text-lg mb-1.5 sm:mb-2">Métodos de Pago Aceptados</h4>
        <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
          Selecciona los métodos de pago que aceptarás para esta rifa y completa los detalles requeridos para cada uno.
        </p>
        <Controller
          name="selectedPaymentMethodIds"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              {Object.entries(paymentMethodsByCat).map(([category, methods]) => (
                <div key={category} className="mb-2">
                  <h5 className="text-sm font-semibold mb-1 text-primary">{category}</h5>
                  {methods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`payment-${method.id}`}
                        checked={field.value?.includes(method.id)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), method.id])
                            : field.onChange(field.value?.filter((id) => id !== method.id));
                        }}
                      />
                      <Label htmlFor={`payment-${method.id}`} className="text-xs sm:text-sm font-normal cursor-pointer">{method.name}</Label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        />
        {errors.selectedPaymentMethodIds && <p className="text-xs text-destructive mt-1">{errors.selectedPaymentMethodIds.message}</p>}

        {isPagoMovilSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><Phone className="mr-2 h-4 w-4"/>Detalles de Pago Móvil</h5>
            <div>
              <Label htmlFor="adminPagoMovilPhone" className="text-xs">Número de Teléfono</Label>
              <Input id="adminPagoMovilPhone" {...register("adminPagoMovilPhone")} placeholder="04XX-XXXXXXX" className="h-8 text-xs"/>
              {errors.adminPagoMovilPhone && <p className="text-xs text-destructive mt-0.5">{errors.adminPagoMovilPhone.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminPagoMovilCi" className="text-xs">Cédula/RIF</Label>
              <Input id="adminPagoMovilCi" {...register("adminPagoMovilCi")} placeholder="V-XXXXXXXX" className="h-8 text-xs"/>
              {errors.adminPagoMovilCi && <p className="text-xs text-destructive mt-0.5">{errors.adminPagoMovilCi.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminPagoMovilBank" className="text-xs">Banco</Label>
              <Input id="adminPagoMovilBank" {...register("adminPagoMovilBank")} placeholder="Ej: Banco de Venezuela" className="h-8 text-xs"/>
              {errors.adminPagoMovilBank && <p className="text-xs text-destructive mt-0.5">{errors.adminPagoMovilBank.message}</p>}
            </div>
          </div>
        )}

        {isPayPalSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><Mail className="mr-2 h-4 w-4"/>Detalles de PayPal</h5>
            <div>
              <Label htmlFor="adminPayPalEmail" className="text-xs">Correo Electrónico de PayPal</Label>
              <Input id="adminPayPalEmail" type="email" {...register("adminPayPalEmail")} placeholder="tu_correo@paypal.com" className="h-8 text-xs"/>
              {errors.adminPayPalEmail && <p className="text-xs text-destructive mt-0.5">{errors.adminPayPalEmail.message}</p>}
            </div>
          </div>
        )}

        {isZinliSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><UserCircle className="mr-2 h-4 w-4"/>Detalles de Zinli</h5>
            <div>
              <Label htmlFor="adminZinliIdentifier" className="text-xs">Correo o Nombre de Usuario Zinli</Label>
              <Input id="adminZinliIdentifier" {...register("adminZinliIdentifier")} placeholder="tu_id_zinli" className="h-8 text-xs"/>
              {errors.adminZinliIdentifier && <p className="text-xs text-destructive mt-0.5">{errors.adminZinliIdentifier.message}</p>}
            </div>
          </div>
        )}

        {isTransferenciaBancariaSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><University className="mr-2 h-4 w-4"/>Detalles de Transferencia Bancaria</h5>
            <div>
              <Label htmlFor="adminBankName" className="text-xs">Nombre del Banco</Label>
              <Input id="adminBankName" {...register("adminBankName")} placeholder="Ej: Mercantil" className="h-8 text-xs"/>
              {errors.adminBankName && <p className="text-xs text-destructive mt-0.5">{errors.adminBankName.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminAccountHolderName" className="text-xs">Nombre del Titular</Label>
              <Input id="adminAccountHolderName" {...register("adminAccountHolderName")} placeholder="Nombre completo" className="h-8 text-xs"/>
              {errors.adminAccountHolderName && <p className="text-xs text-destructive mt-0.5">{errors.adminAccountHolderName.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminAccountNumber" className="text-xs">Número de Cuenta</Label>
              <Input id="adminAccountNumber" {...register("adminAccountNumber")} placeholder="01XX-XXXX-XX-XXXXXXXXXX" className="h-8 text-xs"/>
              {errors.adminAccountNumber && <p className="text-xs text-destructive mt-0.5">{errors.adminAccountNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminAccountType" className="text-xs">Tipo de Cuenta</Label>
               <Controller
                name="adminAccountType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger id="adminAccountType" className="h-8 text-xs">
                      <SelectValue placeholder="Ahorro o Corriente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ahorro">Ahorro</SelectItem>
                      <SelectItem value="Corriente">Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.adminAccountType && <p className="text-xs text-destructive mt-0.5">{errors.adminAccountType.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminHolderId" className="text-xs">Cédula/RIF del Titular</Label>
              <Input id="adminHolderId" {...register("adminHolderId")} placeholder="V-XXXXXXXX / J-XXXXXXXX-X" className="h-8 text-xs"/>
              {errors.adminHolderId && <p className="text-xs text-destructive mt-0.5">{errors.adminHolderId.message}</p>}
            </div>
          </div>
        )}

        {isZelleSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><DollarSign className="mr-2 h-4 w-4"/>Detalles de Zelle</h5>
            <div>
              <Label htmlFor="adminZelleName" className="text-xs">Nombre Asociado a la Cuenta Zelle</Label>
              <Input id="adminZelleName" {...register("adminZelleName")} placeholder="Nombre del titular" className="h-8 text-xs"/>
              {errors.adminZelleName && <p className="text-xs text-destructive mt-0.5">{errors.adminZelleName.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminZelleEmailOrPhone" className="text-xs">Correo o Teléfono Zelle</Label>
              <Input id="adminZelleEmailOrPhone" {...register("adminZelleEmailOrPhone")} placeholder="correo@zelle.com o +1 XXX-XXX-XXXX" className="h-8 text-xs"/>
              {errors.adminZelleEmailOrPhone && <p className="text-xs text-destructive mt-0.5">{errors.adminZelleEmailOrPhone.message}</p>}
            </div>
          </div>
        )}

        {isDepositoBancarioSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><Building className="mr-2 h-4 w-4"/>Detalles de Depósito Bancario</h5>
            <div>
              <Label htmlFor="adminDepositoInstructions" className="text-xs">Instrucciones para Depósito</Label>
              <Textarea id="adminDepositoInstructions" {...register("adminDepositoInstructions")} placeholder="Incluye banco, número de cuenta, titular, etc." className="text-xs" rows={3}/>
              {errors.adminDepositoInstructions && <p className="text-xs text-destructive mt-0.5">{errors.adminDepositoInstructions.message}</p>}
            </div>
          </div>
        )}
        
        {isBinancePaySelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><Bitcoin className="mr-2 h-4 w-4"/>Detalles de Binance Pay</h5>
            <div>
              <Label htmlFor="adminBinancePayIdentifier" className="text-xs">Pay ID, Correo o Teléfono (Binance)</Label>
              <Input id="adminBinancePayIdentifier" {...register("adminBinancePayIdentifier")} placeholder="Tu identificador de Binance Pay" className="h-8 text-xs"/>
              {errors.adminBinancePayIdentifier && <p className="text-xs text-destructive mt-0.5">{errors.adminBinancePayIdentifier.message}</p>}
            </div>
          </div>
        )}

        {isAirtmSelected && (
          <div className="p-3 sm:p-4 border border-primary/30 rounded-md bg-primary/5 space-y-2 sm:space-y-3 mt-2">
            <h5 className="text-sm font-semibold flex items-center text-primary"><CreditCard className="mr-2 h-4 w-4"/>Detalles de Airtm</h5>
            <div>
              <Label htmlFor="adminAirtmEmail" className="text-xs">Correo Electrónico de Airtm</Label>
              <Input id="adminAirtmEmail" type="email" {...register("adminAirtmEmail")} placeholder="tu_correo@airtm.com" className="h-8 text-xs"/>
              {errors.adminAirtmEmail && <p className="text-xs text-destructive mt-0.5">{errors.adminAirtmEmail.message}</p>}
            </div>
          </div>
        )}

        <Button type="submit" size="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4 sm:mt-6 text-sm h-9 sm:h-10" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
          {isLoading ? 'Creando Rifa...' : 'Crear y Guardar Rifa'}
        </Button>
      </form>
    </div>
  );
}

