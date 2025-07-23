
'use client';

import { useState, type ChangeEvent, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Raffle, AcceptedPaymentMethod, ManagedUser, Prize } from '@/types';
import { AVAILABLE_PAYMENT_METHODS } from '@/lib/payment-methods';
import { DRAW_TIMES } from '@/lib/lottery-data';
import { getPlanDetails } from '@/lib/config/plans'; 
import PlanLimitDialog from '@/components/admin/PlanLimitDialog'; 

import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { UploadCloud } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { Building } from 'lucide-react';
import { Banknote } from 'lucide-react';
import { User } from 'lucide-react';
import { Phone } from 'lucide-react';


import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { addRaffle } from '@/lib/firebase/firestoreService';

const todayAtMidnight = new Date();
todayAtMidnight.setHours(0, 0, 0, 0);

const tomorrowAtMidnight = new Date();
tomorrowAtMidnight.setDate(tomorrowAtMidnight.getDate() + 1);
tomorrowAtMidnight.setHours(0, 0, 0, 0);

const PLACEHOLDER_IMAGE_URL = "https://i.ibb.co/6RJzmG1s/Rifazo.png";

const prizeSchema = z.object({
  description: z.string().min(3, { message: "La descripción del premio debe tener al menos 3 caracteres." }),
  lotteryName: z.string().optional().nullable(),
  drawTime: z.string().optional().nullable(),
});

const createRaffleFormSchema = (planMaxTickets: number | Infinity, planDisplayName: string, planAllowsMultiplePrizes: boolean) => z.object({
  name: z.string().min(5, { message: "El nombre debe tener al menos 5 caracteres." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  image: z.string().optional(),
  prizes: z.array(prizeSchema).min(1, { message: "Debes definir al menos un premio." }).max(planAllowsMultiplePrizes ? 3 : 1, { message: `Tu plan solo permite ${planAllowsMultiplePrizes ? '3' : '1'} premio(s).` }),
  pricePerTicket: z.coerce.number().positive({ message: "El precio debe ser un número positivo." }),
  currency: z.enum(['USD', 'Bs'], { required_error: "Debe seleccionar una moneda." }),
  totalNumbers: z.coerce.number().int().min(10, { message: "Debe haber al menos 10 números." }), 
  minTicketsPerPurchase: z.coerce.number().int().min(1, "El mínimo debe ser al menos 1.").optional().nullable(),
  maxTicketsPerPurchase: z.coerce.number().int().min(1, "El máximo debe ser al menos 1.").optional().nullable(),
  allowRandomNumberSelection: z.boolean().optional().default(false),
  drawDate: z.date({ required_error: "La fecha del sorteo es obligatoria."}),
  isScheduled: z.boolean().optional(),
  publicationDate: z.date().optional(),
  publicationTime: z.string().optional(),
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
  if (data.minTicketsPerPurchase && data.maxTicketsPerPurchase && data.minTicketsPerPurchase > data.maxTicketsPerPurchase) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El mínimo no puede ser mayor que el máximo.",
      path: ["minTicketsPerPurchase"],
    });
  }
  if (data.isScheduled) {
    if (!data.publicationDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha de publicación es requerida si programas la rifa.", path: ["publicationDate"] });
    }
    if (!data.publicationTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La hora de publicación es requerida.", path: ["publicationTime"] });
    }
  }
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
  if (planMaxTickets !== Infinity && data.totalNumbers > planMaxTickets) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Tu plan actual (${planDisplayName}) permite un máximo de ${planMaxTickets} números por rifa.`,
      path: ["totalNumbers"],
    });
  }
});

type RaffleFormValues = z.infer<ReturnType<typeof createRaffleFormSchema>>;

interface CreateRaffleFormProps {
  onSuccess?: (newRaffle: Raffle) => void;
}


export default function CreateRaffleForm({ onSuccess }: CreateRaffleFormProps) {
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawCalendarOpen, setIsDrawCalendarOpen] = useState(false);
  const [isPubCalendarOpen, setIsPubCalendarOpen] = useState(false);
  const [isPlanLimitDialogOpen, setIsPlanLimitDialogOpen] = useState(false);
  const [planLimitDialogMessage, setPlanLimitDialogMessage] = useState("crear más rifas");
  const formPrefix = 'create-';

  const planDetails = getPlanDetails(currentUser?.planActive ? currentUser?.plan : null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const currentRaffleFormSchema = createRaffleFormSchema(
    currentUser?.role === 'founder' ? Infinity : planDetails.maxTicketsPerRaffle, 
    planDetails.displayName,
    currentUser?.role === 'founder' ? true : planDetails.includesMultiplePrizes
  );


  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<RaffleFormValues>({
    resolver: zodResolver(currentRaffleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      image: '',
      prizes: [{ description: '', lotteryName: null, drawTime: 'unspecified_time' }],
      pricePerTicket: 1,
      currency: 'USD',
      totalNumbers: 100,
      drawDate: tomorrowAtMidnight,
      isScheduled: false,
      publicationDate: undefined,
      publicationTime: undefined,
      selectedPaymentMethodIds: [],
      paymentMethodDetails: {
        pagoMovil_ci: '',
        pagoMovil_phone: '',
        pagoMovil_bank: '',
        zinli_details: '',
        otro_description: '',
      },
      allowRandomNumberSelection: false,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prizes"
  });

   useEffect(() => {
      setImagePreview(watch('image') || null);
  }, [watch]);


  const selectedPaymentMethodIds = watch("selectedPaymentMethodIds");
  const isScheduled = watch("isScheduled");
  const selectedCurrency = watch("currency");

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
    } else {
      setImagePreview(null);
      setValue('image', '', { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<RaffleFormValues> = async (data) => {
    setIsLoading(true);

    if (!currentUser?.username || !currentUser.id ) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al creador de la rifa.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const currentPlanDetails = getPlanDetails(currentUser.planActive ? currentUser.plan : null);
    
    let publicationDateISO: string | null = null;
    let status: Raffle['status'] = 'active';

    if (data.isScheduled && data.publicationDate && data.publicationTime) {
        const [hours, minutes] = data.publicationTime.split(':').map(Number);
        const pubDate = new Date(data.publicationDate);
        pubDate.setHours(hours, minutes, 0, 0);
        publicationDateISO = pubDate.toISOString();
        status = 'scheduled';
    }
    
    const finalImage = data.image || PLACEHOLDER_IMAGE_URL;


    const acceptedPaymentMethods: AcceptedPaymentMethod[] = data.selectedPaymentMethodIds
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
      
    const prizesForDb: Prize[] = data.prizes.map(p => ({
        description: p.description,
        lotteryName: p.lotteryName && p.lotteryName.trim() !== '' ? p.lotteryName.trim() : null,
        drawTime: (p.drawTime && p.drawTime !== 'unspecified_time') ? p.drawTime : null,
    }));

    const raffleDataForDb: Omit<Raffle, 'id' | 'soldTicketsCount' | 'confirmedPaymentsCount'> = {
      name: data.name,
      description: data.description,
      image: finalImage,
      prizes: prizesForDb,
      pricePerTicket: data.pricePerTicket,
      currency: data.currency,
      totalNumbers: data.totalNumbers,
      minTicketsPerPurchase: data.minTicketsPerPurchase || null,
      maxTicketsPerPurchase: data.maxTicketsPerPurchase || null,
      allowRandomNumberSelection: data.allowRandomNumberSelection,
      drawDate: format(data.drawDate, 'yyyy-MM-dd'),
      publicationDate: publicationDateISO,
      status: status,
      acceptedPaymentMethods: acceptedPaymentMethods,
      creatorUsername: currentUser.username,
    };

    try {
      const newRaffle = await addRaffle(raffleDataForDb, currentUser as ManagedUser);
      await refreshUser(); // Refresh user data in AuthContext
      
      toast({
        title: "Rifa Creada Exitosamente",
        description: `La rifa "${newRaffle.name}" ha sido guardada en Firestore.`,
      });
      reset();
      setImagePreview(null);
      setValue('image', '');
      setValue('selectedPaymentMethodIds', []);
      setValue('prizes', [{ description: '', lotteryName: null, drawTime: 'unspecified_time' }]);
      setValue('paymentMethodDetails', {
        pagoMovil_ci: '',
        pagoMovil_phone: '',
        pagoMovil_bank: '',
        zinli_details: '',
        otro_description: '',
      });
      if (onSuccess) onSuccess(newRaffle);
    } catch (error: any) {
      console.error("Error saving raffle to Firestore:", error);
      const errorMessage = error.message || "No se pudo guardar la rifa en Firestore.";
      
      if (errorMessage.includes("Límite de creación de rifas")) {
        setPlanLimitDialogMessage("crear más rifas");
        setIsPlanLimitDialogOpen(true);
      } else if (errorMessage.includes("excede el límite de tu plan") || errorMessage.includes("no permite")) {
        toast({ title: "Límite de Plan Excedido", description: errorMessage, variant: "destructive", duration: 7000 });
      } else {
        toast({ title: "Error de Guardado", description: errorMessage, variant: "destructive" });
      }
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


  return (
    <>
    <div className="px-1 pt-2 pb-4">
      <h3 className="font-headline text-lg sm:text-xl mb-1">Detalles de la Nueva Rifa</h3>
      <p className="text-xs text-muted-foreground mb-3 sm:mb-4">Completa la información para crear una nueva rifa.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor={`${formPrefix}raffle-name`} className="text-xs sm:text-sm">Nombre de la Rifa</Label>
          <Input id={`${formPrefix}raffle-name`} {...register("name")} placeholder="Ej: Gran Rifa de Verano" className="h-9 text-xs sm:text-sm"/>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor={`${formPrefix}description`} className="text-xs sm:text-sm">Descripción General de la Rifa</Label>
          <Textarea id={`${formPrefix}description`} {...register("description")} placeholder="Describe de qué trata la rifa, las reglas generales, etc." className="text-xs sm:text-sm" rows={3}/>
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${formPrefix}image-upload-input`} className="text-xs sm:text-sm">Imagen de la Rifa (Máx 700KB)</Label>
          <p className="text-[0.65rem] sm:text-xs text-muted-foreground -mt-0.5 mb-1">Recomendación: Imagen apaisada (ej: 800x600px) con contenido principal centrado.</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border border-dashed rounded-md flex items-center justify-center bg-muted/50 overflow-hidden">
              {imagePreview ? (
                <Image src={imagePreview} alt="Vista previa" width={96} height={96} className="object-contain" data-ai-hint="logo brand" />
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
                title="Subir Imagen"
              >
                <UploadCloud className="h-5 w-5" />
                <span className="sr-only">Subir Imagen</span>
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
          <Label className="text-xs sm:text-sm">Premios</Label>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <div className="flex justify-between items-center">
                    <Label htmlFor={`prize-desc-${index}`} className="text-xs font-semibold">Premio {index + 1}</Label>
                    {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                    )}
                </div>
                 <Input
                    {...register(`prizes.${index}.description`)}
                    id={`prize-desc-${index}`}
                    placeholder={`Descripción del ${index + 1}º premio`}
                    className="h-9 text-xs sm:text-sm"
                  />
                  {errors.prizes?.[index]?.description && <p className="text-xs text-destructive mt-1">{errors.prizes[index]?.description?.message}</p>}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <div>
                        <Label htmlFor={`prize-lottery-${index}`} className="text-xs text-muted-foreground">Método Sorteo (Opc.)</Label>
                        <Input 
                            id={`prize-lottery-${index}`}
                            {...register(`prizes.${index}.lotteryName`)}
                            placeholder="Ej: Lotería XYZ"
                            className="h-9 text-xs sm:text-sm"
                        />
                     </div>
                     <div>
                        <Label htmlFor={`prize-time-${index}`} className="text-xs text-muted-foreground">Hora Sorteo (Opc.)</Label>
                        <Controller
                          name={`prizes.${index}.drawTime`}
                          control={control}
                          render={({ field: timeField }) => (
                            <Select onValueChange={timeField.onChange} value={timeField.value || 'unspecified_time'}>
                              <SelectTrigger id={`prize-time-${index}`} className="h-9 text-xs sm:text-sm">
                                <SelectValue placeholder="Selecciona hora" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unspecified_time">No Especificada</SelectItem>
                                {DRAW_TIMES.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                     </div>
                  </div>
              </div>
            ))}
             {errors.prizes && typeof errors.prizes.message === 'string' && (
              <p className="text-xs text-destructive mt-1">{errors.prizes.message}</p>
            )}
          </div>
           {(currentUser?.role === 'founder' || planDetails.includesMultiplePrizes) && fields.length < 3 && (
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', lotteryName: null, drawTime: 'unspecified_time' })} className="mt-2 text-xs">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Añadir Premio
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex-grow">
            <Label htmlFor={`${formPrefix}pricePerTicket`} className="text-xs sm:text-sm">Precio por Boleto</Label>
            <div className="flex items-center gap-2">
                <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id={`${formPrefix}currency`} className="w-[80px] h-9 text-xs">
                                <SelectValue placeholder="Moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USD">$ USD</SelectItem>
                                <SelectItem value="Bs">Bs</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
                <Input id={`${formPrefix}pricePerTicket`} type="number" step="0.01" {...register("pricePerTicket")} placeholder="Ej: 5.00" className="h-9 text-xs sm:text-sm flex-1"/>
            </div>
            {errors.pricePerTicket && <p className="text-xs text-destructive mt-1">{errors.pricePerTicket.message}</p>}
            {errors.currency && <p className="text-xs text-destructive mt-1">{errors.currency.message}</p>}
          </div>
          <div>
            <Label htmlFor={`${formPrefix}totalNumbers`} className="text-xs sm:text-sm">Cantidad Total de Números</Label>
            <Input id={`${formPrefix}totalNumbers`} type="number" {...register("totalNumbers")} placeholder="Ej: 100" className="h-9 text-xs sm:text-sm"/>
            {errors.totalNumbers && <p className="text-xs text-destructive mt-1">{errors.totalNumbers.message}</p>}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-xs sm:text-sm">Configuraciones de Compra</Label>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor={`${formPrefix}minTickets`} className="text-xs text-muted-foreground">Mínimo de boletos por compra (Opcional)</Label>
              <Input
                id={`${formPrefix}minTickets`}
                type="number"
                {...register("minTicketsPerPurchase")}
                placeholder="Ej: 5"
                className="h-9 text-xs sm:text-sm"
              />
              {errors.minTicketsPerPurchase && <p className="text-xs text-destructive mt-1">{errors.minTicketsPerPurchase.message}</p>}
            </div>
            <div>
              <Label htmlFor={`${formPrefix}maxTickets`} className="text-xs text-muted-foreground">Máximo de boletos por compra (Opcional)</Label>
              <Input
                id={`${formPrefix}maxTickets`}
                type="number"
                {...register("maxTicketsPerPurchase")}
                placeholder="Ej: 20"
                className="h-9 text-xs sm:text-sm"
              />
              {errors.maxTicketsPerPurchase && <p className="text-xs text-destructive mt-1">{errors.maxTicketsPerPurchase.message}</p>}
            </div>
          </div>
           <div className="flex items-center space-x-2 pt-2">
                <Controller
                    name="allowRandomNumberSelection"
                    control={control}
                    render={({ field }) => (
                        <Switch
                        id={`${formPrefix}allowRandom`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    )}
                />
                <div className='grid gap-0.5'>
                    <Label htmlFor={`${formPrefix}allowRandom`} className="text-xs sm:text-sm font-medium cursor-pointer">Permitir selección de número aleatorio</Label>
                    <p className="text-xs text-muted-foreground">Si se activa, los usuarios podrán obtener un número al azar en lugar de seleccionarlo manualmente.</p>
                </div>
            </div>
        </div>

        <div>
          <Label htmlFor={`${formPrefix}drawDate-trigger`} className="text-xs sm:text-sm">Fecha Principal del Sorteo</Label>
          <Controller
            name="drawDate"
            control={control}
            render={({ field }) => (
              <Popover open={isDrawCalendarOpen} onOpenChange={setIsDrawCalendarOpen}>
                <PopoverTrigger asChild id={`${formPrefix}drawDate-trigger`}>
                  <Button
                    variant={"outline"}
                    onClick={() => setIsDrawCalendarOpen(true)}
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
                        setIsDrawCalendarOpen(false);
                    }}
                    initialFocus
                    locale={es}
                    disabled={(date) => date < todayAtMidnight}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.drawDate && <p className="text-xs text-destructive mt-1">{errors.drawDate.message}</p>}
        </div>

        <Separator />

        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <Controller
                    name="isScheduled"
                    control={control}
                    render={({ field }) => (
                        <Checkbox
                        id={`${formPrefix}isScheduled`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    )}
                />
                <Label htmlFor={`${formPrefix}isScheduled`} className="text-xs sm:text-sm font-medium cursor-pointer">Programar Publicación de la Rifa</Label>
            </div>
            {isScheduled && (
                <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground">La rifa será visible para el público en la fecha y hora que selecciones.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div>
                            <Label htmlFor={`${formPrefix}publicationDate-trigger`} className="text-xs">Fecha de Publicación</Label>
                            <Controller
                                name="publicationDate"
                                control={control}
                                render={({ field }) => (
                                <Popover open={isPubCalendarOpen} onOpenChange={setIsPubCalendarOpen}>
                                    <PopoverTrigger asChild id={`${formPrefix}publicationDate-trigger`}>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal h-9 text-xs", !field.value && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                        {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setIsPubCalendarOpen(false);
                                        }}
                                        initialFocus
                                        locale={es}
                                        disabled={(date) => date < todayAtMidnight}
                                    />
                                    </PopoverContent>
                                </Popover>
                                )}
                            />
                            {errors.publicationDate && <p className="text-xs text-destructive mt-1">{errors.publicationDate.message}</p>}
                        </div>
                        <div>
                             <Label htmlFor={`${formPrefix}publicationTime`} className="text-xs">Hora de Publicación</Label>
                             <Controller
                                name="publicationTime"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id={`${formPrefix}publicationTime`} className="h-9 text-xs">
                                        <SelectValue placeholder="Selecciona hora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`).map(time => (
                                            <SelectItem key={time} value={time} className="text-xs">{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                )}
                                />
                             {errors.publicationTime && <p className="text-xs text-destructive mt-1">{errors.publicationTime.message}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <Separator className="my-3 sm:my-4" />
        <h4 className="font-headline text-base sm:text-lg mb-1.5 sm:mb-2">Métodos de Pago Aceptados</h4>
        <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
          Selecciona los métodos que aceptarás. Los detalles específicos para cada uno se configurarán abajo.
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
          {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
          {isLoading ? 'Creando Rifa...' : 'Crear y Guardar Rifa'}
        </Button>
      </form>
    </div>
    <PlanLimitDialog 
        isOpen={isPlanLimitDialogOpen} 
        onOpenChange={setIsPlanLimitDialogOpen}
        featureName={planLimitDialogMessage}
    />
    </>
  );
}
