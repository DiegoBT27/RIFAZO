

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
import { Loader2, UserPlus, Trash2, Users, AlertCircle, KeyRound, Edit3, UserCog, Info, Building, UserX, UserCheck, ShieldAlert, Unlock, Hourglass, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { getUsers, addUser, updateUser, deleteUser, getUserByUsername, addActivityLog, resetUserLockout, getUserByEmail } from '@/lib/firebase/firestoreService';
import { cn } from '@/lib/utils';


const whatsappRegex = /^\+?[1-9]\d{7,14}$/; 

const baseProfileSchema = {
  publicAlias: z.string().optional(),
  whatsappNumber: z.string()
    .optional()
    .or(z.literal('')) 
    .refine(val => !val || whatsappRegex.test(val), { 
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
  isBlocked: z.boolean().optional().default(false), // Se mantiene para la creación
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
  role: z.enum(['user', 'admin', 'founder', 'pending_approval'], { required_error: "El rol es obligatorio." }),
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
  const [userToUnlock, setUserToUnlock] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
        username: '',
        password: '',
        confirmPassword: '',
        role: undefined, 
        isBlocked: false,
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
      const roleOrder = { 'pending_approval': 1, 'founder': 2, 'admin': 3, 'user': 4 };
      setUsers(loadedUsers.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99) || a.username.localeCompare(b.username)));
    } catch (error) {
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
    currentRole: 'user' | 'admin' | 'founder' | 'pending_approval' | undefined,
    currentOrganizerType: 'individual' | 'company' | undefined,
    formControl: any
  ) => {
    if (currentRole !== 'admin' && currentRole !== 'founder' && currentRole !== 'pending_approval') return null;

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
    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al usuario que realiza la acción.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, confirmPassword, ...userDataForDb } = data as Partial<ManagedUser> & { confirmPassword?: string };

      const newUserData: Omit<ManagedUser, 'id'> = {
        username: userDataForDb.username!,
        password: userDataForDb.password!,
        role: userDataForDb.role!,
        isBlocked: userDataForDb.isBlocked || false,
        favoriteRaffleIds: [],
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

      const savedUser = await addUser(newUserData);
      await addActivityLog({
        adminUsername: currentUser.username,
        actionType: 'USER_CREATED',
        targetInfo: `Usuario: ${savedUser.username}`,
        details: { userId: savedUser.id, username: savedUser.username, role: savedUser.role }
      });

      fetchUsersFromDB();
      toast({ title: "Usuario Creado", description: `El usuario "${data.username}" ha sido añadido.` });
      reset(); 
      setValue('role', undefined); 
      setValue('isBlocked', false);
      setValue('organizerType', undefined); 
    } catch (error: any) {
      if (error.message.includes("El nombre de usuario ya existe")) {
        toast({ title: "Error de Duplicado", description: "El nombre de usuario ya está en uso.", variant: "destructive" });
      } else if (error.message.includes("El correo electrónico ya está en uso")) {
        toast({ title: "Error de Duplicado", description: "El correo electrónico ya está registrado.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "No se pudo crear el usuario.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditSubmit: SubmitHandler<EditUserFormValues> = async (data) => {
    setIsEditSubmitting(true);
    if (!editingUser || !currentUser?.username) {
      toast({ title: "Error", description: "No se pudo identificar el usuario a editar o el administrador actual.", variant: "destructive" });
      setIsEditSubmitting(false);
      return;
    }

    if (editingUser.username === 'fundador' && data.role !== 'founder') {
        toast({ title: "Acción no permitida", description: "El rol del usuario 'fundador' no puede ser cambiado.", variant: "destructive" });
        setIsEditSubmitting(false);
        return;
    }

    const oldUsername = editingUser.username;
    
    try {
      const actualUpdatedFields: string[] = [];
      const userDataToUpdate: Partial<ManagedUser> = { id: data.id };

      (Object.keys(data) as Array<keyof EditUserFormValues>).forEach(key => {
        if (key === 'id' || key === 'confirmPassword') return;

        const newValue = data[key];
        const oldValue = editingUser[key as keyof ManagedUser];

        let valueChanged = false;
        if (key === 'password') {
            if (newValue && newValue.length > 0) { // Password is being changed
                valueChanged = true;
                userDataToUpdate[key] = newValue;
            }
        } else if (newValue !== oldValue) {
            // Handle cases where new value is empty string/null and old value was undefined (or vice-versa)
            // to avoid logging non-changes.
            const newIsEmpty = newValue === null || newValue === undefined || newValue === '';
            const oldIsEmpty = oldValue === null || oldValue === undefined || oldValue === '';
            if (!(newIsEmpty && oldIsEmpty)) {
                 valueChanged = true;
            }
        }
        
        if (valueChanged) {
            actualUpdatedFields.push(key);
            (userDataToUpdate as any)[key] = newValue;
        }
      });
      
      if (userDataToUpdate.role === 'user') {
        userDataToUpdate.organizerType = null;
        userDataToUpdate.fullName = null;
        userDataToUpdate.companyName = null;
        userDataToUpdate.rif = null;
        userDataToUpdate.publicAlias = null;
        userDataToUpdate.whatsappNumber = null;
        userDataToUpdate.locationState = null;
        userDataToUpdate.locationCity = null;
        userDataToUpdate.email = null; 
        userDataToUpdate.bio = null;
        userDataToUpdate.adminPaymentMethodsInfo = null;
        userDataToUpdate.averageRating = 0;
        userDataToUpdate.ratingCount = 0;
      } else if (userDataToUpdate.organizerType === 'individual') {
        userDataToUpdate.companyName = undefined;
        userDataToUpdate.rif = undefined;
      } else if (userDataToUpdate.organizerType === 'company') {
        userDataToUpdate.fullName = undefined;
      }

      if (userDataToUpdate.role !== 'user' && !userDataToUpdate.publicAlias && userDataToUpdate.username) {
        userDataToUpdate.publicAlias = userDataToUpdate.username;
      }
      
      if (actualUpdatedFields.length > 0) {
        // Remove id from data to be sent to updateUser as it's already passed as the first argument
        const { id, ...updatePayload } = userDataToUpdate;
        await updateUser(editingUser.id, updatePayload);
        
        const logDetails: Record<string, any> = {
          userId: editingUser.id,
          username: userDataToUpdate.username || oldUsername,
          changedFields: actualUpdatedFields,
        };
        if (oldUsername !== (userDataToUpdate.username || oldUsername)) {
          logDetails.oldUsername = oldUsername;
        }

        await addActivityLog({
          adminUsername: currentUser.username,
          actionType: 'USER_EDITED',
          targetInfo: `Usuario: ${userDataToUpdate.username || oldUsername}`,
          details: logDetails,
        });
        
        if (currentUser && currentUser.id === editingUser.id) {
          // This was a self-edit, we must refresh the AuthContext state
          await refreshUser();
          toast({ title: "Tu Perfil Ha Sido Actualizado", description: "Tus datos de sesión han sido actualizados." });
        } else {
          toast({ title: "Usuario Actualizado", description: `El usuario "${userDataToUpdate.username || oldUsername}" ha sido actualizado.` });
        }

      } else {
        toast({ title: "Sin Cambios", description: "No se detectaron cambios en los datos del usuario." });
      }

      setIsEditDialogOpen(false);
      fetchUsersFromDB(); 
    } catch (error: any) {
      if (error.message.includes("El nombre de usuario ya existe")) {
        toast({ title: "Error de Duplicado", description: "El nombre de usuario ya está en uso.", variant: "destructive" });
      } else if (error.message.includes("El correo electrónico ya está en uso")) {
        toast({ title: "Error de Duplicado", description: "El correo electrónico ya está registrado.", variant: "destructive" });
      } else {
        toast({ title: "Error de Edición", description: "No se pudo actualizar el usuario.", variant: "destructive" });
      }
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete || !currentUser?.username) {
      toast({ title: "Error", description: "No se pudo identificar el usuario a eliminar o el administrador actual.", variant: "destructive" });
      setUserToDelete(null);
      return;
    }

    if (userToDelete.username === 'fundador') {
        toast({ title: "Acción no permitida", description: `El usuario principal 'fundador' no puede ser eliminado.`, variant: "destructive" });
        setUserToDelete(null);
        return;
    }

    try {
      await deleteUser(userToDelete.id, currentUser.username);
      fetchUsersFromDB();
      toast({ title: "Usuario Eliminado", description: `El usuario "${userToDelete.username}" ha sido eliminado.` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
    } finally {
      setUserToDelete(null);
    }
  };
  
  const handleToggleBlockUser = async (userToToggle: ManagedUser) => {
    if (!currentUser?.username) {
       toast({ title: "Error de Autenticación", description: "No se pudo identificar al administrador actual.", variant: "destructive" });
       return;
    }
    if (userToToggle.username === 'fundador') {
      toast({ title: "Acción no permitida", description: "El usuario 'fundador' no puede ser bloqueado.", variant: "destructive" });
      return;
    }
    const newBlockedState = !userToToggle.isBlocked;
    try {
      await updateUser(userToToggle.id, { isBlocked: newBlockedState });
      await addActivityLog({
        adminUsername: currentUser.username,
        actionType: newBlockedState ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
        targetInfo: `Usuario: ${userToToggle.username}`,
        details: { userId: userToToggle.id, username: userToToggle.username, newBlockedState }
      });
      fetchUsersFromDB();
      toast({
        title: `Usuario ${newBlockedState ? 'Bloqueado' : 'Desbloqueado'}`,
        description: `El usuario "${userToToggle.username}" ha sido ${newBlockedState ? 'bloqueado' : 'desbloqueado'}.`
      });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cambiar el estado de bloqueo del usuario.", variant: "destructive" });
    }
  };

  const handleUnlockConfirm = async () => {
    if (!userToUnlock || !currentUser?.username) {
        toast({ title: "Error", description: "No se pudo identificar el usuario a desbloquear.", variant: "destructive" });
        setUserToUnlock(null);
        return;
    }
    try {
        await resetUserLockout(userToUnlock.id, currentUser.username);
        toast({
            title: "Cuenta Desbloqueada",
            description: `La cuenta de ${userToUnlock.username} ha sido desbloqueada.`,
        });
        fetchUsersFromDB();
    } catch (error: any) {
        toast({
            title: "Error",
            description: `No se pudo desbloquear la cuenta: ${error.message}`,
            variant: "destructive",
        });
    } finally {
        setUserToUnlock(null);
    }
  };

  const handleActivateUser = async (userToActivate: ManagedUser) => {
    if (!currentUser?.username) {
      toast({ title: "Error de Autenticación", description: "No se pudo identificar al administrador actual.", variant: "destructive" });
      return;
    }
    if (userToActivate.role !== 'pending_approval') return;

    try {
        await updateUser(userToActivate.id, { role: 'admin' });
        toast({
            title: "Usuario Activado",
            description: `La cuenta de ${userToActivate.username} ha sido activada como administrador.`,
        });
        fetchUsersFromDB(); // Refresh the user list
    } catch (error: any) {
        toast({
            title: "Error de Activación",
            description: `No se pudo activar la cuenta: ${error.message}`,
            variant: "destructive",
        });
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
      organizerType: userToEdit.organizerType || ((userToEdit.role === 'admin' || userToEdit.role === 'founder' || userToEdit.role === 'pending_approval') ? 'individual' : undefined),
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
                <input type="hidden" {...register("isBlocked")} value={false.toString()} />
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
            <Users className="mr-2 h-6 w-6 text-primary" /> USUARIOS
          </CardTitle>
          <CardDescription>
            Lista de usuarios registrados. Las solicitudes pendientes aparecen primero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="space-y-3">
              {users.map((userEntry) => {
                const isLocked = !!(userEntry.lockoutUntil && new Date(userEntry.lockoutUntil) > new Date());
                const isPending = userEntry.role === 'pending_approval';

                let roleDisplay: React.ReactNode = userEntry.role;
                let roleColorClass = '';
                if (userEntry.role === 'admin') roleColorClass = 'text-primary';
                if (userEntry.role === 'founder') roleColorClass = 'text-accent';
                if (isPending) roleColorClass = 'text-yellow-600';

                return (
                <Card key={userEntry.id} className={cn("p-4 flex flex-col sm:flex-row justify-between sm:items-center bg-secondary/20", isPending && "border-yellow-500 border-2 bg-yellow-500/10")}>
                  <div className="mb-3 sm:mb-0 flex-grow">
                    <p className="font-semibold text-foreground flex items-center">
                      {userEntry.username}
                       {isPending ? <Hourglass className="ml-2 h-4 w-4 text-yellow-600" title="Pendiente de Aprobación" />
                        : userEntry.isBlocked ? <UserX className="ml-2 h-4 w-4 text-destructive" title="Usuario Bloqueado Permanentemente"/>
                        : <UserCheck className="ml-2 h-4 w-4 text-green-600" title="Usuario Activo"/>
                       }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rol: <span className={cn('font-bold', roleColorClass)}>
                        {isPending ? 'Pendiente Aprobación' : userEntry.role}
                      </span>
                      {userEntry.organizerType && ` - Tipo: ${userEntry.organizerType === 'individual' ? 'Individual' : 'Empresa'}`}
                       {userEntry.isBlocked && <Badge variant="destructive" className="ml-2 text-xs">Bloqueado</Badge>}
                       {isLocked && <Badge variant="destructive" className="ml-2 text-xs animate-pulse">Bloqueo por Intentos</Badge>}
                    </p>
                    {(userEntry.organizerType === 'company' && userEntry.companyName) && <p className="text-xs text-muted-foreground">Empresa: {userEntry.companyName}</p>}
                    {(userEntry.organizerType === 'individual' && userEntry.fullName) && <p className="text-xs text-muted-foreground">Nombre: {userEntry.fullName}</p>}
                    {userEntry.rif && <p className="text-xs text-muted-foreground">RIF: {userEntry.rif}</p>}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex items-center space-x-1" title={userEntry.isBlocked ? "Usuario Bloqueado" : "Usuario Activo"}>
                       <Switch
                        id={`block-switch-${userEntry.id}`}
                        checked={userEntry.isBlocked || false}
                        onCheckedChange={() => handleToggleBlockUser(userEntry)}
                        disabled={userEntry.username === 'fundador' || isPending}
                        aria-label={userEntry.isBlocked ? "Desbloquear usuario" : "Bloquear usuario"}
                      />
                       <Label htmlFor={`block-switch-${userEntry.id}`} className="sr-only">
                        {userEntry.isBlocked ? "Desbloquear" : "Bloquear"}
                      </Label>
                    </div>
                    {isLocked && (
                        <Button variant="outline" size="icon" className="h-8 w-8 border-yellow-500 text-yellow-600 hover:bg-yellow-100" title="Desbloquear cuenta por intentos" onClick={() => setUserToUnlock(userEntry)}>
                            <Unlock className="h-4 w-4" />
                            <span className="sr-only">Desbloquear</span>
                        </Button>
                    )}
                    {isPending && (
                       <Button variant="outline" size="icon" className="h-8 w-8 bg-green-500/10 border-green-500 text-green-600 hover:bg-green-500/20" title="Activar Usuario" onClick={() => handleActivateUser(userEntry)}>
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Activar</span>
                        </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEditDialog(userEntry)}
                      title="Editar Usuario"
                      className="h-8 w-8"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button variant="destructive" size="icon" disabled={userEntry.username === 'fundador'} className="h-8 w-8" title="Eliminar Usuario" onClick={() => setUserToDelete(userEntry)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </Card>
              )})}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/70 mb-3" />
              <p className="text-lg font-semibold text-muted-foreground">No hay usuarios registrados en Firestore.</p>
              <p className="text-sm text-muted-foreground mt-1">Crea un nuevo usuario para empezar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-destructive"/>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario <span className="font-bold">{userToDelete?.username}</span> y todos sus datos asociados (participaciones, calificaciones, etc.).
              {userToDelete?.role === 'admin' && (
                  <span className="font-bold text-destructive block mt-2">¡ADVERTENCIA! Este usuario es un administrador. Todas las rifas creadas por este usuario y sus datos asociados también serán eliminadas permanentemente.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUserConfirm} className="bg-destructive hover:bg-destructive/90 text-xs h-8">
              Sí, eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {userToUnlock && (
        <AlertDialog open={!!userToUnlock} onOpenChange={(open) => !open && setUserToUnlock(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><Unlock className="mr-2 text-yellow-500" /> Confirmar Desbloqueo</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro de que quieres desbloquear la cuenta de <span className="font-semibold">{userToUnlock.username}</span>? Esto eliminará el bloqueo temporal por intentos de inicio de sesión fallidos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToUnlock(null)} className="text-xs h-8">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlockConfirm} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-8">
                        Sí, Desbloquear
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

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
                          <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
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
