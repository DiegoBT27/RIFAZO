
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ManagedUser, PlanName } from '@/types';
import { getUsers, assignPlanToAdmin, removeAdminPlan } from '@/lib/firebase/firestoreService';
import { PLAN_CONFIG, PLAN_NAMES_ORDERED } from '@/lib/config/plans';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCog, CalendarDays, CheckCircle, XCircle, AlertTriangle, ShieldQuestion, Trash2, CalendarIcon as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function AdminPlanManagerClient() {
  const { user: currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const [adminUsers, setAdminUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlanByUser, setSelectedPlanByUser] = useState<Record<string, PlanName | undefined>>({});
  const [selectedCustomStartDateByUser, setSelectedCustomStartDateByUser] = useState<Record<string, Date | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const [isRemovingPlan, setIsRemovingPlan] = useState<Record<string, boolean>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState<Record<string, boolean>>({});
  const [userToRemovePlan, setUserToRemovePlan] = useState<ManagedUser | null>(null);


  const fetchAdminUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setAdminUsers(allUsers.filter(u => u.role === 'admin').sort((a,b) => a.username.localeCompare(b.username)));
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios administradores.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const handlePlanChange = (userId: string, planName: PlanName) => {
    setSelectedPlanByUser(prev => ({ ...prev, [userId]: planName }));
  };

  const handleCustomDateSelect = (userId: string, date: Date | undefined) => {
    setSelectedCustomStartDateByUser(prev => ({ ...prev, [userId]: date }));
    setIsCalendarOpen(prev => ({ ...prev, [userId]: false }));
  };

  const handleAssignPlan = async (adminUser: ManagedUser) => {
    if (!currentUser || currentUser.role !== 'founder') {
      toast({ title: "Error de Permiso", description: "Solo los fundadores pueden asignar planes.", variant: "destructive" });
      return;
    }
    const planToAssign = selectedPlanByUser[adminUser.id];
    if (!planToAssign) {
      toast({ title: "Error", description: "Por favor, selecciona un plan para asignar.", variant: "destructive" });
      return;
    }
    const customStartDate = selectedCustomStartDateByUser[adminUser.id];

    setIsSubmitting(prev => ({ ...prev, [adminUser.id]: true }));
    try {
      await assignPlanToAdmin(adminUser.id, planToAssign, currentUser.username, customStartDate);
      const startDateMsg = customStartDate ? ` programado para iniciar el ${format(customStartDate, "dd/MM/yyyy", { locale: es })}` : '';
      toast({
        title: "Plan Asignado",
        description: `El plan ${PLAN_CONFIG[planToAssign].displayName} ha sido asignado a ${adminUser.username}${startDateMsg}.`,
      });
      setSelectedPlanByUser(prev => ({ ...prev, [adminUser.id]: undefined }));
      setSelectedCustomStartDateByUser(prev => ({...prev, [adminUser.id]: undefined}));
      fetchAdminUsers();
      if (currentUser.username === adminUser.username) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error("Error assigning plan:", error);
      toast({ title: "Error al Asignar Plan", description: error.message || "No se pudo asignar el plan.", variant: "destructive" });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [adminUser.id]: false }));
    }
  };
  
  const handleRemovePlanConfirm = async () => {
    if (!userToRemovePlan || !currentUser || currentUser.role !== 'founder') {
      toast({ title: "Error", description: "No se pudo identificar el usuario o acción no permitida.", variant: "destructive" });
      setUserToRemovePlan(null);
      return;
    }
    
    const adminUserId = userToRemovePlan.id;
    setIsRemovingPlan(prev => ({ ...prev, [adminUserId]: true }));
    try {
      await removeAdminPlan(adminUserId, currentUser.username);
      toast({
        title: "Plan Removido",
        description: `El plan ha sido removido para ${userToRemovePlan.username}.`,
      });
      fetchAdminUsers();
      if (currentUser.username === userToRemovePlan.username) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error("Error removing plan:", error);
      toast({ title: "Error al Remover Plan", description: error.message || "No se pudo remover el plan.", variant: "destructive" });
    } finally {
      setIsRemovingPlan(prev => ({ ...prev, [adminUserId]: false }));
      setUserToRemovePlan(null); // Close dialog
    }
  };

  const formatDateDisplay = (isoDateString?: string | null) => {
    if (!isoDateString) return 'N/A';
    try {
      return format(new Date(isoDateString), "dd/MM/yyyy", { locale: es });
    } catch {
      return 'Fecha Inválida';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando administradores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {adminUsers.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay usuarios con el rol de "admin" en la plataforma.
          </CardContent>
        </Card>
      )}
      {adminUsers.map((admin) => {
        const isPlanScheduled = admin.plan && !admin.planActive && admin.planStartDate && new Date(admin.planStartDate) > new Date();
        return (
        <Card key={admin.id} className="shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <CardTitle className="text-lg font-headline flex items-center mb-2 sm:mb-0">
                <UserCog className="mr-2 h-5 w-5 text-primary" /> {admin.username}
              </CardTitle>
              {admin.planActive && admin.plan ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm py-1">
                   {PLAN_CONFIG[admin.plan]?.displayName}
                </Badge>
              ) : isPlanScheduled && admin.plan ? (
                 <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs sm:text-sm py-1">
                  Programado: {PLAN_CONFIG[admin.plan]?.displayName}
                </Badge>
              ) : admin.plan && !admin.planActive && admin.planEndDate && new Date(admin.planEndDate) < new Date() ? (
                <Badge variant="destructive" className="text-xs sm:text-sm py-1">
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Plan Vencido: {PLAN_CONFIG[admin.plan]?.displayName}
                </Badge>
              ) : (
                 <Badge variant="secondary" className="text-xs sm:text-sm py-1">
                  <ShieldQuestion className="mr-1.5 h-3.5 w-3.5" /> Sin Plan Activo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              <p><strong>Plan Actual:</strong> {admin.plan ? PLAN_CONFIG[admin.plan]?.displayName : 'Ninguno'}</p>
              <p className="flex items-center">
                <strong>Estado:</strong> 
                {admin.planActive ? 
                  <span className="ml-1.5 flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1"/> Activo</span> 
                  : isPlanScheduled ?
                    <span className="ml-1.5 flex items-center text-blue-600"><CalendarDays className="h-4 w-4 mr-1"/>Programado</span>
                  : (admin.planEndDate && new Date(admin.planEndDate) < new Date() ? 
                    <span className="ml-1.5 flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1"/>Vencido</span> 
                    : <span className="ml-1.5 flex items-center text-muted-foreground"><AlertTriangle className="h-4 w-4 mr-1"/>Inactivo/No asignado</span>
                  )
                }
              </p>
              <p className="flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground"/> <strong>Inicia:</strong> {formatDateDisplay(admin.planStartDate)}</p>
              <p className="flex items-center"><CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground"/> <strong>Finaliza:</strong> {formatDateDisplay(admin.planEndDate)}</p>
              <p><strong>Rifas Creadas (periodo actual):</strong> {admin.rafflesCreatedThisPeriod || 0} / {admin.plan ? (PLAN_CONFIG[admin.plan].raffleLimit === Infinity ? 'Ilimitado' : PLAN_CONFIG[admin.plan].raffleLimit) : 'N/A'}</p>
              <p><strong>Asignado por:</strong> {admin.planAssignedBy || 'N/A'}</p>
            </div>
             {selectedCustomStartDateByUser[admin.id] && (
                <p className="text-xs text-blue-600 mt-1.5">
                  Nueva fecha de inicio seleccionada: {format(selectedCustomStartDateByUser[admin.id]!, "PPP", { locale: es })}
                </p>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4 flex flex-col gap-3">
            <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                <Select
                  value={selectedPlanByUser[admin.id] || ''}
                  onValueChange={(value) => handlePlanChange(admin.id, value as PlanName)}
                  disabled={isSubmitting[admin.id] || isRemovingPlan[admin.id]}
                >
                  <SelectTrigger className="w-full sm:flex-1 text-xs h-9">
                    <SelectValue placeholder="Seleccionar nuevo plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_NAMES_ORDERED.map(planName => (
                      <SelectItem key={planName} value={planName} className="text-xs">
                        {PLAN_CONFIG[planName].displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover open={isCalendarOpen[admin.id]} onOpenChange={(open) => setIsCalendarOpen(prev => ({...prev, [admin.id]: open}))}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        className={cn("w-full sm:w-auto text-xs h-9 justify-start text-left font-normal", !selectedCustomStartDateByUser[admin.id] && "text-muted-foreground")}
                        disabled={isSubmitting[admin.id] || isRemovingPlan[admin.id]}
                        >
                        <CalendarIconLucide className="mr-1.5 h-3.5 w-3.5" />
                        {selectedCustomStartDateByUser[admin.id] ? format(selectedCustomStartDateByUser[admin.id]!, "PPP", {locale: es}) : <span>Fecha Inicio (Opc.)</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={selectedCustomStartDateByUser[admin.id]}
                        onSelect={(date) => handleCustomDateSelect(admin.id, date)}
                        initialFocus
                        locale={es}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            return date < today;
                        }}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                <Button
                  onClick={() => handleAssignPlan(admin)}
                  disabled={!selectedPlanByUser[admin.id] || isSubmitting[admin.id] || isRemovingPlan[admin.id]}
                  className="w-full sm:flex-1 text-xs h-9"
                >
                  {isSubmitting[admin.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting[admin.id] ? 'Asignando...' : (selectedCustomStartDateByUser[admin.id] ? 'Programar Plan' : 'Asignar Plan Ahora')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUserToRemovePlan(admin)}
                  disabled={(!admin.plan && !admin.planActive) || isRemovingPlan[admin.id] || isSubmitting[admin.id]}
                  className="w-full sm:w-auto text-xs h-9"
                >
                  {isRemovingPlan[admin.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {isRemovingPlan[admin.id] ? 'Removiendo...' : 'Remover Plan'}
                </Button>
            </div>
          </CardFooter>
        </Card>
      )})}

      {userToRemovePlan && (
        <AlertDialog open={!!userToRemovePlan} onOpenChange={(open) => { if(!open) setUserToRemovePlan(null);}}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="text-destructive mr-2"/>¿Remover Plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Estás a punto de remover el plan actual de {userToRemovePlan.username}. 
                        El usuario perderá el acceso a las funcionalidades del plan y su estado será inactivo.
                        Esta acción no se puede deshacer fácilmente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToRemovePlan(null)} disabled={isRemovingPlan[userToRemovePlan.id]} className="text-xs h-8">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemovePlanConfirm}
                        disabled={isRemovingPlan[userToRemovePlan.id]}
                        className="bg-destructive hover:bg-destructive/90 text-xs h-8"
                    >
                        {isRemovingPlan[userToRemovePlan.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sí, Remover Plan
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    