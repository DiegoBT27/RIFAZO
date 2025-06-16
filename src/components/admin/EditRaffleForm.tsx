
'use client';

import { useState, type ChangeEvent, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

import { Button, buttonVariants } from '@/components/ui/button';
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
import type { Raffle, AcceptedPaymentMethod } from '@/types';
import { AVAILABLE_PAYMENT_METHODS } from '@/lib/payment-methods';
import { DRAW_TIMES } from '@/lib/lottery-data';

import { CalendarIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { UploadCloud } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { Save } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Building } from 'lucide-react';
import { Banknote } from 'lucide-react';
import { User } from 'lucide-react';
import { Phone } from 'lucide-react';


import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateRaffle } from '@/lib/firebase/firestoreService';

const todayAtMidnight = new Date();
todayAtMidnight.setHours(0, 0, 0, 0);

const editRaffleFormSchema = z.object({
  id: z.string(),
  name: z.string().min(5, { message: "El nombre debe tener al menos 5 caracteres." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  image: z.string().min(1, { message: "Se requiere una imagen para la rifa." }),
  prize: z.string().min(3, { message: "El premio debe tener al menos 3 caracteres." }),
  pricePerTicket: z.coerce.number().positive({ message: "El precio debe ser un número positivo." }),
  totalNumbers: z.coerce.number().int().min(10, { message: "Debe haber al menos 10 números." }).max(500, {message: "Máximo 500 números"}),
  drawDate: z.date({ required_error: "La fecha del sorteo es obligatoria."}),
  lotteryName: z.string().optional().nullable(),
  drawTime: z.string().optional().nullable(),
  selectedPaymentMethodIds: z.array(z.string())
    .min(1, { message: "Debes seleccionar al menos un método de pago." }),
  paymentMethodDetails: z.object({
    pagoMovil_ci: z.string().optional(),
    pagoMovil_phone: z.string().optional(),
    pagoMovil_bank: z.string().optional(),
    zinli_details: z.string().optional(),
    otro_description: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.selectedPaymentMethodIds.includes('pagoMovil')) {
    if (!data.paymentMethodDetails?.pagoMovil_ci || data.paymentMethodDetails.pagoMovil_ci.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cédula para Pago Móvil es requerida (mín. 5 caracteres).", path: ["paymentMethodDetails.pagoMovil_ci"] });
    }
    if (!data.paymentMethodDetails?.pagoMovil_phone || data.paymentMethodDetails.pagoMovil_phone.trim().length < 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Celular para Pago Móvil es requerido (mín. 10 caracteres).", path: ["paymentMethodDetails.pagoMovil_phone"] });
    }
    if (!data.paymentMethodDetails?.pagoMovil_bank || data.paymentMethodDetails.pagoMovil_bank.trim().length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Banco para Pago Móvil es requerido (mín. 3 caracteres).", path: ["paymentMethodDetails.pagoMovil_bank"] });
    }
  }
  if (data.selectedPaymentMethodIds.includes('zinli')) {
    if (!data.paymentMethodDetails?.zinli_details || data.paymentMethodDetails.zinli_details.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Detalles para Zinli son requeridos (mín. 5 caracteres).", path: ["paymentMethodDetails.zinli_details"] });
    }
    if (data.paymentMethodDetails?.zinli_details && data.paymentMethodDetails.zinli_details.length > 150) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Detalles para Zinli no deben exceder 150 caracteres.", path: ["paymentMethodDetails.zinli_details"]});
    }
  }
  if (data.selectedPaymentMethodIds.includes('otro')) {
    if (!data.paymentMethodDetails?.otro_description || data.paymentMethodDetails.otro_description.trim().length < 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La descripción para 'Otro Método' es requerida (mín. 10 caracteres).", path: ["paymentMethodDetails.otro_description"] });
    }
     if (data.paymentMethodDetails?.otro_description && data.paymentMethodDetails.otro_description.length > 250) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La descripción para 'Otro Método' no debe exceder 250 caracteres.", path: ["paymentMethodDetails.otro_description"]});
    }
  }
});


type EditRaffleFormValues = z.infer<typeof editRaffleFormSchema>;

interface EditRaffleFormProps {
  raffle: Raffle;
  onSuccess: (updatedRaffle: Raffle) => void;
}

export default function EditRaffleForm({ raffle, onSuccess }: EditRaffleFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(raffle?.image || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const formPrefix = 'edit-'; 

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<EditRaffleFormValues>({
    resolver: zodResolver(editRaffleFormSchema),
    defaultValues: {
      id: raffle?.id || '',
      name: raffle?.name || '',
      description: raffle?.description || '',
      image: raffle?.image || '',
      prize: raffle?.prize || '',
      pricePerTicket: raffle?.pricePerTicket || 1,
      totalNumbers: raffle?.totalNumbers || 100,
      drawDate: raffle?.drawDate ? parse(raffle.drawDate, 'yyyy-MM-dd', new Date()) : todayAtMidnight,
      lotteryName: raffle?.lotteryName || null,
      drawTime: raffle?.drawTime || 'unspecified_time',
      selectedPaymentMethodIds: raffle?.acceptedPaymentMethods?.map(pm => pm.id) || [],
      paymentMethodDetails: {
        pagoMovil_ci: '',
        pagoMovil_phone: '',
        pagoMovil_bank: '',
        zinli_details: '',
        otro_description: '',
      }
    }
  });

  const selectedPaymentMethodIds = watch("selectedPaymentMethodIds");

  const parseInitialPaymentDetails = useCallback((acceptedMethods: AcceptedPaymentMethod[] | undefined) => {
    const details = {
        pagoMovil_ci: '',
        pagoMovil_phone: '',
        pagoMovil_bank: '',
        zinli_details: '',
        otro_description: '',
    };
    acceptedMethods?.forEach(method => {
        if (method.id === 'pagoMovil' && method.adminProvidedDetails) {
            const parts = method.adminProvidedDetails.split(', ');
            details.pagoMovil_ci = parts.find(p => p.startsWith('CI: '))?.substring(4) || '';
            details.pagoMovil_phone = parts.find(p => p.startsWith('Cel: '))?.substring(5) || '';
            details.pagoMovil_bank = parts.find(p => p.startsWith('Banco: '))?.substring(7) || '';
        } else if (method.id === 'zinli' && method.adminProvidedDetails) {
            details.zinli_details = method.adminProvidedDetails;
        } else if (method.id === 'otro' && method.adminProvidedDetails) {
            details.otro_description = method.adminProvidedDetails;
        }
    });
    return details;
  }, []);


  useEffect(() => {
    if (raffle) {
      reset({
        id: raffle.id,
        name: raffle.name,
        description: raffle.description,
        image: raffle.image,
        prize: raffle.prize,
        pricePerTicket: raffle.pricePerTicket,
        totalNumbers: raffle.totalNumbers,
        drawDate: parse(raffle.drawDate, 'yyyy-MM-dd', new Date()),
        lotteryName: raffle.lotteryName || null,
        drawTime: raffle.drawTime || 'unspecified_time',
        selectedPaymentMethodIds: raffle.acceptedPaymentMethods?.map(pm => pm.id) || [],
        paymentMethodDetails: parseInitialPaymentDetails(raffle.acceptedPaymentMethods),
      });
      setImagePreview(raffle.image);
    }
  }, [raffle, reset, parseInitialPaymentDetails]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast({
          title: "Archivo Demasiado Grande",
          description: "La imagen no debe exceder los 700KB.",
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
    }
  };

  const onSubmit: SubmitHandler<EditRaffleFormValues> = async (data) => {
    setIsLoading(true);

    const acceptedPaymentMethodsResult: AcceptedPaymentMethod[] = data.selectedPaymentMethodIds
      .map(id => {
        const methodOption = AVAILABLE_PAYMENT_METHODS.find(pm => pm.id === id);
        if (!methodOption) return null;
        
        let adminDetails: string | undefined = undefined;
        if (id === 'pagoMovil' && data.paymentMethodDetails) {
          adminDetails = `CI: ${data.paymentMethodDetails.pagoMovil_ci}, Cel: ${data.paymentMethodDetails.pagoMovil_phone}, Banco: ${data.paymentMethodDetails.pagoMovil_bank}`;
        } else if (id === 'zinli' && data.paymentMethodDetails) {
          adminDetails = data.paymentMethodDetails.zinli_details;
        } else if (id === 'otro' && data.paymentMethodDetails) {
          adminDetails = data.paymentMethodDetails.otro_description;
        } else if (id === 'efectivoUSD') {
          adminDetails = "Contactar al organizador para coordinar la entrega del efectivo.";
        }

        return {
          id: methodOption.id,
          name: id === 'otro' ? "Otro Método Personalizado" : methodOption.name,
          category: methodOption.category,
          adminProvidedDetails: adminDetails,
        };
      })
      .filter(Boolean) as AcceptedPaymentMethod[];

    const raffleDataForDb: Partial<Raffle> = {
      name: data.name,
      description: data.description,
      image: data.image,
      prize: data.prize,
      pricePerTicket: data.pricePerTicket,
      totalNumbers: data.totalNumbers,
      drawDate: format(data.drawDate, 'yyyy-MM-dd'),
      lotteryName: data.lotteryName && data.lotteryName.trim() !== '' ? data.lotteryName.trim() : null,
      drawTime: (data.drawTime && data.drawTime !== 'unspecified_time') ? data.drawTime : null,
      acceptedPaymentMethods: acceptedPaymentMethodsResult,
    };

    try {
      await updateRaffle(data.id, raffleDataForDb);
      toast({
        title: "Rifa Actualizada",
        description: `La rifa "${data.name}" ha sido guardada exitosamente.`,
      });

      const updatedRaffleData: Raffle = {
        ...raffle,
        ...raffleDataForDb,
        id: data.id,
        creatorUsername: raffle.creatorUsername,
        soldNumbers: raffle.soldNumbers,
        lotteryName: raffleDataForDb.lotteryName,
        drawTime: raffleDataForDb.drawTime,
        acceptedPaymentMethods: acceptedPaymentMethodsResult,
      };

      if (onSuccess) onSuccess(updatedRaffleData);

    } catch (error) {
      console.error("Error updating raffle in Firestore:", error);
      toast({ title: "Error de Guardado", description: "No se pudo actualizar la rifa en Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderPaymentMethodCheckbox = (
    idsField: any, 
    method: { id: string; name: string; detailType?: string; fields?: any[]; placeholder?: string },
    formPrefix: string
  ) => {
     return (
      <div key={method.id} className="py-1">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${formPrefix}payment-${method.id}`}
            checked={idsField.value?.includes(method.id)}
            onCheckedChange={(checked) => {
              const currentSelectedIds = idsField.value || [];
              const newSelectedIds = checked
                ? [...currentSelectedIds, method.id]
                : currentSelectedIds.filter((id: string) => id !== method.id);
              idsField.onChange(newSelectedIds);
            }}
          />
          <Label htmlFor={`${formPrefix}payment-${method.id}`} className="text-xs sm:text-sm font-normal cursor-pointer">{method.name}</Label>
        </div>
        {idsField.value?.includes(method.id) && method.detailType && method.detailType !== 'none' && (
          <div className="ml-6 mt-1.5 space-y-2 pb-1">
            {method.detailType === 'specificFields' && method.fields?.map(field => (
              <div key={field.id}>
                <Label htmlFor={`${formPrefix}${method.id}-${field.id}`} className="text-xs text-muted-foreground">{field.label}</Label>
                <Input 
                  id={`${formPrefix}${method.id}-${field.id}`} 
                  {...register(`paymentMethodDetails.${method.id}_${field.id}` as any)} 
                  placeholder={field.placeholder}
                  className="h-8 text-xs"
                  maxLength={field.maxLength}
                />
                 {errors.paymentMethodDetails?.[`${method.id}_${field.id}` as keyof typeof errors.paymentMethodDetails] && 
                  <p className="text-xs text-destructive mt-0.5">{(errors.paymentMethodDetails?.[`${method.id}_${field.id}` as keyof typeof errors.paymentMethodDetails] as any)?.message}</p>
                }
              </div>
            ))}
            {method.detailType === 'generic' && (
               <div>
                <Label htmlFor={`${formPrefix}${method.id}-details`} className="text-xs text-muted-foreground">Detalles para {method.name}</Label>
                <Textarea 
                  id={`${formPrefix}${method.id}-details`} 
                  {...register(`paymentMethodDetails.${method.id}_details` as any)} 
                  placeholder={method.placeholder} 
                  className="text-xs min-h-[60px]"
                  rows={2}
                  maxLength={150}
                />
                 {errors.paymentMethodDetails?.[`${method.id}_details` as keyof typeof errors.paymentMethodDetails] && 
                  <p className="text-xs text-destructive mt-0.5">{(errors.paymentMethodDetails?.[`${method.id}_details` as keyof typeof errors.paymentMethodDetails] as any)?.message}</p>
                }
              </div>
            )}
             {method.detailType === 'freeformText' && method.id === 'otro' && (
              <div>
                <Label htmlFor={`${formPrefix}otro-description`} className="text-xs text-muted-foreground">Describe tu Otro Método de Pago (Nombre, detalles, etc.)</Label>
                <Textarea 
                  id={`${formPrefix}otro-description`} 
                  {...register('paymentMethodDetails.otro_description')} 
                  placeholder={method.placeholder} 
                  className="text-xs min-h-[70px]"
                  rows={3}
                  maxLength={250}
                />
                {errors.paymentMethodDetails?.otro_description && 
                  <p className="text-xs text-destructive mt-0.5">{errors.paymentMethodDetails.otro_description.message}</p>
                }
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  if (!raffle) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" /> Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>No se ha proporcionado información de la rifa para editar o la rifa no existe.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="px-1 pt-2 pb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <Input type="hidden" {...register("id")} />
        <div>
          <Label htmlFor={`${formPrefix}raffle-name`} className="text-xs sm:text-sm">Nombre de la Rifa</Label>
          <Input id={`${formPrefix}raffle-name`} {...register("name")} placeholder="Ej: Gran Rifa de Verano" className="h-9 text-xs sm:text-sm"/>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor={`${formPrefix}description`} className="text-xs sm:text-sm">Descripción Detallada</Label>
          <Textarea id={`${formPrefix}description`} {...register("description")} placeholder="Describe el premio, las reglas, etc." className="text-xs sm:text-sm" rows={3}/>
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${formPrefix}image-upload-input`} className="text-xs sm:text-sm">Imagen de la Rifa (Máx 700KB)</Label>
          <p className="text-[0.65rem] sm:text-xs text-muted-foreground -mt-0.5 mb-1">Recomendación: Imagen apaisada (ej: 800x600px). Sube una nueva para cambiarla.</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
              {imagePreview ? (
                <Image src={imagePreview} alt="Vista previa de la rifa" width={96} height={96} className="object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-grow">
              <Label
                htmlFor={`${formPrefix}image-upload-input`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "cursor-pointer"
                )}
                title="Cambiar Imagen"
              >
                <UploadCloud className="h-5 w-5" />
                <span className="sr-only">Cambiar Imagen</span>
              </Label>
              <input
                id={`${formPrefix}image-upload-input`}
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
          <Label htmlFor={`${formPrefix}prize`} className="text-xs sm:text-sm">Premio Principal</Label>
          <Input id={`${formPrefix}prize`} {...register("prize")} placeholder="Ej: Un iPhone 15 Pro Max" className="h-9 text-xs sm:text-sm"/>
          {errors.prize && <p className="text-xs text-destructive mt-1">{errors.prize.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor={`${formPrefix}pricePerTicket`} className="text-xs sm:text-sm">Precio por Boleto (USD)</Label>
            <Input id={`${formPrefix}pricePerTicket`} type="number" step="0.01" {...register("pricePerTicket")} placeholder="Ej: 5.00" className="h-9 text-xs sm:text-sm"/>
            {errors.pricePerTicket && <p className="text-xs text-destructive mt-1">{errors.pricePerTicket.message}</p>}
          </div>
          <div>
            <Label htmlFor={`${formPrefix}totalNumbers`} className="text-xs sm:text-sm">Cantidad Total de Números</Label>
            <Input id={`${formPrefix}totalNumbers`} type="number" {...register("totalNumbers")} placeholder="Ej: 100" className="h-9 text-xs sm:text-sm"/>
            {errors.totalNumbers && <p className="text-xs text-destructive mt-1">{errors.totalNumbers.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor={`${formPrefix}drawDate-trigger`} className="text-xs sm:text-sm">Fecha del Sorteo</Label>
          <Controller
            name="drawDate"
            control={control}
            render={({ field }) => (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild id={`${formPrefix}drawDate-trigger`}>
                  <Button
                    variant={"outline"}
                    onClick={() => setIsCalendarOpen(true)}
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
                    onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                    }}
                    initialFocus
                    locale={es}
                    disabled={currentUser?.role === 'founder' ? undefined : (date) => date < todayAtMidnight}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.drawDate && <p className="text-xs text-destructive mt-1">{errors.drawDate.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
           <div>
            <Label htmlFor={`${formPrefix}lotteryName-input`} className="text-xs sm:text-sm">Método de Rifa (Opcional)</Label>
            <Input 
              id={`${formPrefix}lotteryName-input`} 
              {...register("lotteryName")} 
              placeholder="Ej: Sorteo en vivo, Lotería XYZ" 
              className="h-9 text-xs sm:text-sm"
            />
            {errors.lotteryName && <p className="text-xs text-destructive mt-1">{errors.lotteryName.message}</p>}
          </div>
          <div>
            <Label htmlFor={`${formPrefix}drawTime-select`} className="text-xs sm:text-sm">Hora del Sorteo (Opcional)</Label>
            <Controller
              name="drawTime"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || 'unspecified_time'}>
                  <SelectTrigger id={`${formPrefix}drawTime-select`} className="h-9 text-xs sm:text-sm">
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
          Modifica los métodos que aceptarás. Los detalles específicos para cada uno se configurarán abajo.
        </p>
        <Controller
          name="selectedPaymentMethodIds"
          control={control}
          render={({ field: idsField }) => (
             <div className="space-y-3">
              <div>
                <h5 className="text-sm font-semibold mb-1 text-primary">Nacionales</h5>
                {renderPaymentMethodCheckbox(idsField, AVAILABLE_PAYMENT_METHODS.find(p => p.id === 'pagoMovil')!, formPrefix)}
                {renderPaymentMethodCheckbox(idsField, AVAILABLE_PAYMENT_METHODS.find(p => p.id === 'efectivoUSD')!, formPrefix)}
              </div>
              <div>
                <h5 className="text-sm font-semibold mb-1 text-primary">Internacionales</h5>
                {renderPaymentMethodCheckbox(idsField, AVAILABLE_PAYMENT_METHODS.find(p => p.id === 'zinli')!, formPrefix)}
              </div>
              <div>
                <h5 className="text-sm font-semibold mb-1 text-primary">Otros Métodos</h5>
                {renderPaymentMethodCheckbox(idsField, AVAILABLE_PAYMENT_METHODS.find(p => p.id === 'otro')!, formPrefix)}
              </div>
            </div>
          )}
        />
         {errors.selectedPaymentMethodIds && <p className="text-xs text-destructive mt-1">{errors.selectedPaymentMethodIds.message}</p>}

        <Button type="submit" size="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4 sm:mt-6 text-sm h-9 sm:h-10" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </form>
    </div>
  );
}

    