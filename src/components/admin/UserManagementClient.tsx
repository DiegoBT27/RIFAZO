
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus, Trash2, Users, AlertCircle, KeyRound, Edit3, UserCog, Info, Building } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { ManagedUser } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { getUsers, addUser, updateUser, deleteUser, getUserByUsername } from '@/lib/firebase/firestoreService';

const whatsappRegex = /^\+?[1-9]\d{7,14}$/; // Regex para validar números de WhatsApp (simplificada)

const baseProfileSchema = {
  publicAlias: z.string().optional(),
  whatsappNumber: z.string()
    .optional()
    .or(z.literal('')) // Permite que sea una cadena vacía si es opcional
    .refine(val => !val || whatsappRegex.test(val), { // Valida solo si no está vacío
      message: "Número de WhatsApp inválido. Ej: +584141234567 o 04141234567",
    }),
  locationState: z.string().optional(),
  locationCity: z.string().optional(),
  email: z.string().email({ message: "Debe ser un correo electrónico válido." }).optional().or(z.literal('')),
  bio: z.string().optional(),
  adminPaymentMethodsInfo: z.string().optional(),
};

const userFormSchema = z.object({
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." }).regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo."),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "La confirmación debe tener al menos 6 caracteres." }),
  role: z.enum(['user', 'admin', 'founder'], { required_error: "El rol es obligatorio." }),
  organizerType: z.enum(['individual', 'company']).optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  rif: z.string().optional(),
  ...baseProfileSchema,
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
})
.superRefine((data, ctx) => {
  if (data.role === 'admin' || data.role === 'founder') {
    if (!data.organizerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un tipo de organizador (Individual o Empresa).",
        path: ["organizerType"],
      });
    } else if (data.organizerType === 'individual' && (!data.fullName || data.fullName.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre completo es obligatorio para organizadores individuales.",
        path: ["fullName"],
      });
    } else if (data.organizerType === 'company') {
      if ((!data.companyName || data.companyName.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre de la empresa es obligatorio para organizadores de tipo empresa.",
          path: ["companyName"],
        });
      }
      if ((!data.rif || data.rif.trim() === '')) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RIF es obligatorio para organizadores de tipo empresa.",
          path: ["rif"],
        });
      }
    }
    if (!data.whatsappNumber || !whatsappRegex.test(data.whatsappNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de WhatsApp es obligatorio y debe ser válido para administradores y fundadores. Ej: +584141234567",
        path: ["whatsappNumber"],
      });
    }
  }
});

type UserFormValues = z.infer<typeof userFormSchema>;

const editUserFormSchema = z.object({
  id: z.string(),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres.").regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo."),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  role: z.enum(['user', 'admin', 'founder'], { required_error: "El rol es obligatorio." }),
  organizerType: z.enum(['individual', 'company']).optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  rif: z.string().optional(),
  ...baseProfileSchema,
}).refine(data => {
  if (data.password && data.password.length > 0 && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "La nueva contraseña debe tener al menos 6 caracteres.",
  path: ["password"],
}).refine(data => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.role === 'admin' || data.role === 'founder') {
    if (!data.organizerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe seleccionar un tipo de organizador (Individual o Empresa).",
        path: ["organizerType"],
      });
    } else if (data.organizerType === 'individual' && (!data.fullName || data.fullName.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre completo es obligatorio para organizadores individuales.",
        path: ["fullName"],
      });
    } else if (data.organizerType === 'company') {
      if ((!data.companyName || data.companyName.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre de la empresa es obligatorio para organizadores de tipo empresa.",
          path: ["companyName"],
        });
      }
       if ((!data.rif || data.rif.trim() === '')) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RIF es obligatorio para organizadores de tipo empresa.",
          path: ["rif"],
        });
      }
    }
    if (!data.whatsappNumber || !whatsappRegex.test(data.whatsappNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de WhatsApp es obligatorio y debe ser válido para administradores y fundadores. Ej: +584141234567",
        path: ["whatsappNumber"],
      });
    }
  }
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export default function UserManagementClient() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
        username: '',
        password: '',
        confirmPassword: '',
        role: undefined, 
        organizerType: undefined, 
        fullName: '',
        companyName: '',
        rif: '',
        publicAlias: '',
        whatsappNumber: '',
        locationState: '',
        locationCity: '',
        email: '',
        bio: '',
        adminPaymentMethodsInfo: '',
     },
  });

  const selectedRoleForCreation = watch('role');
  const selectedOrganizerTypeForCreation = watch('organizerType');

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    control: editControl,
    reset: resetEditForm,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { errors: editErrors }
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
  });

  const selectedRoleForEdit = watchEdit('role');
  const selectedOrganizerTypeForEdit = watchEdit('organizerType');

  const fetchUsersFromDB = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedUsers = await getUsers();
      setUsers(loadedUsers.sort((a, b) => a.username.localeCompare(b.username)));
    } catch (error) {
      console.error("Error loading users from Firestore:", error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersFromDB();
  }, [fetchUsersFromDB]);

  const renderProfileFields = (
    formRegisterFn: any,
    formErrorsObj: any,
    formIsSubmittingFlag: boolean,
    formPrefix: string = '',
    isDisabled: boolean = false,
    currentRole: 'user' | 'admin' | 'founder' | undefined,
    currentOrganizerType: 'individual' | 'company' | undefined,
    formControl: any
  ) => {
    if (currentRole !== 'admin' && currentRole !== 'founder') return null;

    return (
    <>
      <Separator className="my-4" />
      <h4 className="text-md font-semibold text-primary flex items-center mb-2">
        <UserCog className="mr-2 h-5 w-5" /> Perfil Detallado del Organizador
      </h4>
      <div>
        <Label htmlFor={`${formPrefix}organizerType`}>Tipo de Organizador</Label>
        <Controller
            name={`${formPrefix}organizerType`}
            control={formControl}
            render={({ field }) => (
                <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={formIsSubmittingFlag || isDisabled}
                >
                <SelectTrigger id={`${formPrefix}organizerType`}>
                    <SelectValue placeholder="Selecciona tipo (Individual/Empresa)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                </SelectContent>
                </Select>
            )}
        />
        {formErrorsObj.organizerType && <p className="text-sm text-destructive mt-1">{formErrorsObj.organizerType.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {currentOrganizerType === 'individual' && (
          <div>
            <Label htmlFor={`${formPrefix}fullName`}>Nombre Completo</Label>
            <Input id={`${formPrefix}fullName`} {...formRegisterFn("fullName")} placeholder="Ej: Carlos Rodríguez" disabled={formIsSubmittingFlag || isDisabled} />
            {formErrorsObj.fullName && <p className="text-sm text-destructive mt-1">{formErrorsObj.fullName.message}</p>}
          </div>
        )}
        {currentOrganizerType === 'company' && (
          <>
            <div>
              <Label htmlFor={`${formPrefix}companyName`}>Nombre de la Empresa</Label>
              <Input id={`${formPrefix}companyName`} {...formRegisterFn("companyName")} placeholder="Ej: Inversiones Acme C.A." disabled={formIsSubmittingFlag || isDisabled} />
              {formErrorsObj.companyName && <p className="text-sm text-destructive mt-1">{formErrorsObj.companyName.message}</p>}
            </div>
            <div>
              <Label htmlFor={`${formPrefix}rif`}>RIF</Label>
              <Input id={`${formPrefix}rif`} {...formRegisterFn("rif")} placeholder="Ej: J-12345678-9" disabled={formIsSubmittingFlag || isDisabled} />
              {formErrorsObj.rif && <p className="text-sm text-destructive mt-1">{formErrorsObj.rif.message}</p>}
            </div>
          </>
        )}
        <div>
          <Label htmlFor={`${formPrefix}publicAlias`}>Alias Público (Opcional)</Label>
          <Input id={`${formPrefix}publicAlias`} {...formRegisterFn("publicAlias")} placeholder="Ej: RifasCarlos (por defecto, tu usuario)" disabled={formIsSubmittingFlag || isDisabled} />
          {formErrorsObj.publicAlias && <p className="text-sm text-destructive mt-1">{formErrorsObj.publicAlias.message}</p>}
        </div>
        
        <div>
          <Label htmlFor={`${formPrefix}whatsappNumber`}>
             Número de WhatsApp {(currentRole !== 'admin' && currentRole !== 'founder') && "(Opcional)"}
          </Label>
          <Input id={`${formPrefix}whatsappNumber`} {...formRegisterFn("whatsappNumber")} placeholder="Ej: +584141234567" disabled={formIsSubmittingFlag || isDisabled} />
          {(currentRole === 'admin' || currentRole === 'founder') && (
            <p className="text-xs text-muted-foreground mt-1">
              Este número será visible para los participantes de tus rifas, para que puedan contactarte y enviar comprobantes de pago.
            </p>
          )}
          {formErrorsObj.whatsappNumber && <p className="text-sm text-destructive mt-1">{formErrorsObj.whatsappNumber.message}</p>}
        </div>
        <div>
          <Label htmlFor={`${formPrefix}email`}>Correo Electrónico (Público, Opcional)</Label>
          <Input id={`${formPrefix}email`} type="email" {...formRegisterFn("email")} placeholder="Ej: contacto@rifascarlos.com" disabled={formIsSubmittingFlag || isDisabled} />
          {formErrorsObj.email && <p className="text-sm text-destructive mt-1">{formErrorsObj.email.message}</p>}
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor={`${formPrefix}locationState`}>Estado (Opcional)</Label>
                <Input id={`${formPrefix}locationState`} {...formRegisterFn("locationState")} placeholder="Ej: Miranda" disabled={formIsSubmittingFlag || isDisabled} />
                {formErrorsObj.locationState && <p className="text-sm text-destructive mt-1">{formErrorsObj.locationState.message}</p>}
            </div>
            <div>
                <Label htmlFor={`${formPrefix}locationCity`}>Ciudad (Opcional)</Label>
                <Input id={`${formPrefix}locationCity`} {...formRegisterFn("locationCity")} placeholder="Ej: Caracas" disabled={formIsSubmittingFlag || isDisabled} />
                {formErrorsObj.locationCity && <p className="text-sm text-destructive mt-1">{formErrorsObj.locationCity.message}</p>}
            </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${formPrefix}bio`}>Biografía Corta (Opcional)</Label>
          <Textarea id={`${formPrefix}bio`} {...formRegisterFn("bio")} placeholder="Una breve descripción sobre ti o tus rifas..." disabled={formIsSubmittingFlag || isDisabled} rows={2} />
          {formErrorsObj.bio && <p className="text-sm text-destructive mt-1">{formErrorsObj.bio.message}</p>}
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${formPrefix}adminPaymentMethodsInfo`}>Información General de Métodos de Pago (Opcional)</Label>
          <Textarea id={`${formPrefix}adminPaymentMethodsInfo`} {...formRegisterFn("adminPaymentMethodsInfo")} placeholder="Ej: Acepto Pago Móvil, Zelle, PayPal. Contactar para detalles." disabled={formIsSubmittingFlag || isDisabled} rows={2} />
          {formErrorsObj.adminPaymentMethodsInfo && <p className="text-sm text-destructive mt-1">{formErrorsObj.adminPaymentMethodsInfo.message}</p>}
        </div>
      </div>
    </>
  )};

  const onSubmit: SubmitHandler<UserFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const existingUser = await getUserByUsername(data.username);
      if (existingUser) {
        toast({ title: "Error", description: "El nombre de usuario ya existe.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, confirmPassword, ...userDataForDb } = data as Partial<ManagedUser> & { confirmPassword?: string };

      const newUserData: Omit<ManagedUser, 'id'> = {
        username: userDataForDb.username!,
        password: userDataForDb.password!,
        role: userDataForDb.role!,
        organizerType: userDataForDb.role === 'user' ? undefined : userDataForDb.organizerType,
        fullName: userDataForDb.role === 'user' ? undefined : (userDataForDb.organizerType === 'individual' ? userDataForDb.fullName : undefined),
        companyName: userDataForDb.role === 'user' ? undefined : (userDataForDb.organizerType === 'company' ? userDataForDb.companyName : undefined),
        rif: userDataForDb.role === 'user' ? undefined : (userDataForDb.organizerType === 'company' ? userDataForDb.rif : undefined),
        publicAlias: userDataForDb.role === 'user' ? undefined : (userDataForDb.publicAlias || userDataForDb.username),
        whatsappNumber: userDataForDb.role === 'user' ? undefined : userDataForDb.whatsappNumber,
        locationState: userDataForDb.role === 'user' ? undefined : userDataForDb.locationState,
        locationCity: userDataForDb.role === 'user' ? undefined : userDataForDb.locationCity,
        email: userDataForDb.role === 'user' ? undefined : userDataForDb.email,
        bio: userDataForDb.role === 'user' ? undefined : userDataForDb.bio,
        adminPaymentMethodsInfo: userDataForDb.role === 'user' ? undefined : userDataForDb.adminPaymentMethodsInfo,
      };


      await addUser(newUserData);
      fetchUsersFromDB();
      toast({ title: "Usuario Creado", description: `El usuario "${data.username}" ha sido añadido.` });
      reset(); 
      setValue('role', undefined); 
      setValue('organizerType', undefined); 
    } catch (error) {
      console.error("Error creating user:", error);
      toast({ title: "Error", description: "No se pudo crear el usuario.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit: SubmitHandler<EditUserFormValues> = async (data) => {
    setIsEditSubmitting(true);
    if (!editingUser) return;

    if (editingUser.username === 'fundador' && data.role !== 'founder') {
        toast({ title: "Acción no permitida", description: "El rol del usuario 'fundador' no puede ser cambiado.", variant: "destructive" });
        setIsEditSubmitting(false);
        return;
    }

    const oldUsername = editingUser.username;
    const newUsername = data.username;

    try {
      if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
        const existingUser = await getUserByUsername(newUsername);
        if (existingUser && existingUser.id !== data.id) {
          toast({ title: "Error de Edición", description: "El nuevo nombre de usuario ya está en uso.", variant: "destructive" });
          setIsEditSubmitting(false);
          return;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, confirmPassword, ...userDataToUpdate } = data;
      if (userDataToUpdate.password === '' || userDataToUpdate.password === undefined) {
        delete userDataToUpdate.password;
      }

      if(userDataToUpdate.role === 'user') {
        delete userDataToUpdate.organizerType;
        delete userDataToUpdate.fullName;
        delete userDataToUpdate.companyName;
        delete userDataToUpdate.rif;
      } else if (userDataToUpdate.organizerType === 'individual') {
        delete userDataToUpdate.companyName;
        delete userDataToUpdate.rif;
      } else if (userDataToUpdate.organizerType === 'company') {
        delete userDataToUpdate.fullName;
      }
      if (userDataToUpdate.role !== 'user' && !userDataToUpdate.publicAlias) {
        userDataToUpdate.publicAlias = userDataToUpdate.username;
      }


      await updateUser(id, userDataToUpdate);
      fetchUsersFromDB();
      toast({ title: "Usuario Actualizado", description: `El usuario "${newUsername}" ha sido actualizado.` });

      if (currentUser && currentUser.username === oldUsername && oldUsername !== newUsername) {
        toast({
          title: "Nombre de usuario cambiado",
          description: "Para que los cambios se reflejen completamente en tu sesión, por favor cierra sesión y vuelve a iniciarla.",
          duration: 7000,
        });
      }
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Error de Edición", description: "No se pudo actualizar el usuario.", variant: "destructive" });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteUserConfirm = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.username === 'fundador') {
        toast({ title: "Acción no permitida", description: `El usuario principal 'fundador' no puede ser eliminado.`, variant: "destructive" });
        return;
    }

    try {
      await deleteUser(userId);
      fetchUsersFromDB();
      toast({ title: "Usuario Eliminado", description: `El usuario "${userToDelete.username}" ha sido eliminado.` });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (userToEdit: ManagedUser) => {
    setEditingUser(userToEdit);
    resetEditForm({
      id: userToEdit.id,
      username: userToEdit.username,
      role: userToEdit.role,
      password: '',
      confirmPassword: '',
      organizerType: userToEdit.organizerType || (userToEdit.role === 'admin' || userToEdit.role === 'founder' ? 'individual' : undefined),
      fullName: userToEdit.fullName || '',
      companyName: userToEdit.companyName || '',
      rif: userToEdit.rif || '',
      publicAlias: userToEdit.publicAlias || '',
      whatsappNumber: userToEdit.whatsappNumber || '',
      locationState: userToEdit.locationState || '',
      locationCity: userToEdit.locationCity || '',
      email: userToEdit.email || '',
      bio: userToEdit.bio || '',
      adminPaymentMethodsInfo: userToEdit.adminPaymentMethodsInfo || '',
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
            <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
    );
  }
  if (currentUser?.role !== 'founder') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-semibold">Acceso Denegado</p>
            <p className="text-muted-foreground text-sm">No tienes permisos para gestionar usuarios.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <UserPlus className="mr-2 h-6 w-6 text-primary" /> Crear Nuevo Usuario
          </CardTitle>
          <CardDescription>
            Añade nuevos usuarios a la plataforma. Como Fundador, puedes asignar cualquier rol y detalles de perfil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="roleSelect">Rol del Usuario</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'user') {
                        setValue('organizerType', undefined);
                        setValue('fullName', '');
                        setValue('companyName', '');
                        setValue('rif', '');
                      } else if (!watch('organizerType') && (value === 'admin' || value === 'founder')) {
                        setValue('organizerType', 'individual');
                      }
                    }}
                    value={field.value || ''} 
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="roleSelect">
                      <SelectValue placeholder="Selecciona un rol para continuar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="founder">Fundador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            </div>

            {selectedRoleForCreation && (
              <>
                <div>
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input id="username" {...register("username")} placeholder="ej: juanperez" disabled={isSubmitting} />
                  {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      {...register("password")}
                      placeholder="Mínimo 6 caracteres"
                      disabled={isSubmitting}
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
                      placeholder="Repite la contraseña"
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <KeyRound className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </>
            )}

            {(selectedRoleForCreation === 'admin' || selectedRoleForCreation === 'founder') && (
              renderProfileFields(register, errors, isSubmitting, '', false, selectedRoleForCreation, selectedOrganizerTypeForCreation, control)
            )}
            
            {selectedRoleForCreation && (
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Creando Usuario...' : 'Crear Usuario'}
                </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Users className="mr-2 h-6 w-6 text-primary" /> Usuarios de la Plataforma
          </CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {users.map((userEntry) => (
                  <Card key={userEntry.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center bg-secondary/20">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-semibold text-foreground">
                        {userEntry.username}
                        {userEntry.organizerType === 'company' && userEntry.companyName && ` (${userEntry.companyName})`}
                        {userEntry.organizerType === 'individual' && userEntry.fullName && ` (${userEntry.fullName})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rol: <span className={userEntry.role === 'admin' ? 'font-bold text-primary' : (userEntry.role === 'founder' ? 'font-bold text-accent' : '')}>{userEntry.role}</span>
                        {userEntry.organizerType && ` - Tipo: ${userEntry.organizerType === 'individual' ? 'Individual' : 'Empresa'}`}
                      </p>
                      {userEntry.rif && <p className="text-xs text-muted-foreground">RIF: {userEntry.rif}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(userEntry)}
                        className="text-xs h-8"
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={userEntry.username === 'fundador'} className="text-xs h-8">
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario <span className="font-bold">{userEntry.username}</span> de Firestore.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUserConfirm(userEntry.id)} className="bg-destructive hover:bg-destructive/90 text-xs h-8">
                              Sí, eliminar usuario
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">No hay usuarios registrados en Firestore.</p>
              <p className="text-sm text-muted-foreground mt-1">Crea un nuevo usuario para empezar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Editar Usuario: {editingUser?.username}</DialogTitle>
            <DialogDescription>
              Modifica los detalles. Contraseña opcional (mín. 6 caracteres si se cambia).
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
          <ScrollArea className="max-h-[70vh] pr-5">
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <Input type="hidden" {...editRegister("id")} />
              <div>
                <Label htmlFor="edit-username">Nombre de Usuario</Label>
                <Input id="edit-username" {...editRegister("username")} placeholder="ej: juanperez" disabled={isEditSubmitting} />
                {editErrors.username && <p className="text-sm text-destructive mt-1">{editErrors.username.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                <Input id="edit-password" type="password" {...editRegister("password")} placeholder="Dejar en blanco para no cambiar" disabled={isEditSubmitting} />
                {editErrors.password && <p className="text-sm text-destructive mt-1">{editErrors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input id="edit-confirmPassword" type="password" {...editRegister("confirmPassword")} placeholder="Repite si cambiaste contraseña" disabled={isEditSubmitting} />
                {editErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{editErrors.confirmPassword.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-roleSelect">Rol del Usuario</Label>
                <Controller
                  name="role"
                  control={editControl}
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                         if (value === 'user') {
                            setEditValue('organizerType', undefined);
                        } else if (!watchEdit('organizerType')) {
                           setEditValue('organizerType', 'individual');
                        }
                      }}
                      value={field.value}
                      disabled={isEditSubmitting || editingUser.username === 'fundador'}
                    >
                      <SelectTrigger id="edit-roleSelect">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="founder" disabled={editingUser.username !== 'fundador'}>Fundador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {editErrors.role && <p className="text-sm text-destructive mt-1">{editErrors.role.message}</p>}
              </div>

              {renderProfileFields(editRegister, editErrors, isEditSubmitting, 'edit-', (editingUser.username === 'fundador' && selectedRoleForEdit !== 'founder'), selectedRoleForEdit, selectedOrganizerTypeForEdit, editControl)}

              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isEditSubmitting} className="text-xs h-8">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isEditSubmitting} className="text-xs h-8">
                  {isEditSubmitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Edit3 className="mr-2 h-3.5 w-3.5"/>}
                  {isEditSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    