
'use client';

import { useState, type ChangeEvent, useEffect } from 'react';
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
import type { Raffle, AcceptedPaymentMethod } from '@/types';
import { AVAILABLE_PAYMENT_METHODS, getPaymentMethodsByCategory } from '@/lib/payment-methods';
import { LOTTERY_NAMES, DRAW_TIMES } from '@/lib/lottery-data';
import { CalendarIcon, Loader2, UploadCloud, Image as ImageIcon, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { updateRaffle } from '@/lib/firebase/firestoreService';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


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
  drawDate: z.date({ required_error: "La fecha del sorteo es obligatoria."})
             .min(todayAtMidnight, { message: "La fecha del sorteo no puede ser en el pasado." }),
  lotteryName: z.string().optional(),
  drawTime: z.string().optional(),
  selectedPaymentMethodIds: z.array(z.string())
    .min(1, { message: "Debes seleccionar al menos un método de pago." }),
})
.refine(data => data.selectedPaymentMethodIds && data.selectedPaymentMethodIds.length > 0, {
    message: "Debes seleccionar al menos un método de pago.",
    path: ["selectedPaymentMethodIds"],
});


type EditRaffleFormValues = z.infer<typeof editRaffleFormSchema>;

const paymentMethodsByCat = getPaymentMethodsByCategory();

interface EditRaffleFormProps {
  raffle: Raffle;
  onSuccess: (updatedRaffle: Raffle) => void;
}

export default function EditRaffleForm({ raffle, onSuccess }: EditRaffleFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(raffle?.image || null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
      lotteryName: raffle?.lotteryName || 'manual_entry',
      drawTime: raffle?.drawTime || 'unspecified_time',
      selectedPaymentMethodIds: raffle?.acceptedPaymentMethods?.map(pm => pm.id) || [],
    }
  });
  
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
        lotteryName: raffle.lotteryName || 'manual_entry',
        drawTime: raffle.drawTime || 'unspecified_time',
        selectedPaymentMethodIds: raffle.acceptedPaymentMethods?.map(pm => pm.id) || [],
      });
      setImagePreview(raffle.image);
    }
  }, [raffle, reset]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) { // 700KB limit
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

     if (!data.selectedPaymentMethodIds || data.selectedPaymentMethodIds.length === 0) {
        toast({ title: "Error de Formulario", description: "Debes seleccionar al menos un método de pago.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const acceptedPaymentMethods: AcceptedPaymentMethod[] = data.selectedPaymentMethodIds
      .map(id => {
        const methodOption = AVAILABLE_PAYMENT_METHODS.find(pm => pm.id === id);
        if (!methodOption) return null;
        return {
          id: methodOption.id,
          name: methodOption.name,
          category: methodOption.category,
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
      lotteryName: data.lotteryName === 'manual_entry' ? undefined : data.lotteryName,
      drawTime: data.drawTime === 'unspecified_time' ? undefined : data.drawTime,
      acceptedPaymentMethods: acceptedPaymentMethods,
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
      };

      if (onSuccess) onSuccess(updatedRaffleData);

    } catch (error) {
      console.error("Error updating raffle in Firestore:", error);
      toast({ title: "Error de Guardado", description: "No se pudo actualizar la rifa en Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
          <Label htmlFor="edit-raffle-name" className="text-xs sm:text-sm">Nombre de la Rifa</Label>
          <Input id="edit-raffle-name" {...register("name")} placeholder="Ej: Gran Rifa de Verano" className="h-9 text-xs sm:text-sm"/>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="edit-description" className="text-xs sm:text-sm">Descripción Detallada</Label>
          <Textarea id="edit-description" {...register("description")} placeholder="Describe el premio, las reglas, etc." className="text-xs sm:text-sm" rows={3}/>
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-image-upload-input" className="text-xs sm:text-sm">Imagen de la Rifa (Máx 700KB)</Label>
          <p className="text-[0.65rem] sm:text-xs text-muted-foreground -mt-0.5 mb-1">Recomendación: Imagen apaisada (ej: 800x600px) con contenido principal centrado. Sube una nueva para cambiarla.</p>
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
                htmlFor="edit-image-upload-input"
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
                id="edit-image-upload-input"
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
          <Label htmlFor="edit-prize" className="text-xs sm:text-sm">Premio Principal</Label>
          <Input id="edit-prize" {...register("prize")} placeholder="Ej: Un iPhone 15 Pro Max" className="h-9 text-xs sm:text-sm"/>
          {errors.prize && <p className="text-xs text-destructive mt-1">{errors.prize.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="edit-pricePerTicket" className="text-xs sm:text-sm">Precio por Boleto (USD)</Label>
            <Input id="edit-pricePerTicket" type="number" step="0.01" {...register("pricePerTicket")} placeholder="Ej: 5.00" className="h-9 text-xs sm:text-sm"/>
            {errors.pricePerTicket && <p className="text-xs text-destructive mt-1">{errors.pricePerTicket.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-totalNumbers" className="text-xs sm:text-sm">Cantidad Total de Números</Label>
            <Input id="edit-totalNumbers" type="number" {...register("totalNumbers")} placeholder="Ej: 100" className="h-9 text-xs sm:text-sm"/>
            {errors.totalNumbers && <p className="text-xs text-destructive mt-1">{errors.totalNumbers.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="edit-drawDate-trigger" className="text-xs sm:text-sm">Fecha del Sorteo</Label>
          <Controller
            name="drawDate"
            control={control}
            render={({ field }) => (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild id="edit-drawDate-trigger">
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
                    disabled={(date) => date < todayAtMidnight}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.drawDate && <p className="text-xs text-destructive mt-1">{errors.drawDate.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="edit-lotteryName-select" className="text-xs sm:text-sm">Lotería de Referencia (Opcional)</Label>
            <Controller
              name="lotteryName"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || 'manual_entry'} >
                  <SelectTrigger id="edit-lotteryName-select" className="h-9 text-xs sm:text-sm">
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
            <Label htmlFor="edit-drawTime-select" className="text-xs sm:text-sm">Hora del Sorteo (Opcional)</Label>
            <Controller
              name="drawTime"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || 'unspecified_time'}>
                  <SelectTrigger id="edit-drawTime-select" className="h-9 text-xs sm:text-sm">
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
          Modifica los métodos de pago que aceptarás. Los detalles se coordinarán vía WhatsApp.
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
                        id={`edit-payment-${method.id}`}
                        checked={field.value?.includes(method.id)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), method.id])
                            : field.onChange(field.value?.filter((id) => id !== method.id));
                        }}
                      />
                      <Label htmlFor={`edit-payment-${method.id}`} className="text-xs sm:text-sm font-normal cursor-pointer">{method.name}</Label>
                    </div>
                  ))}
                </div>
              ))}
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

    