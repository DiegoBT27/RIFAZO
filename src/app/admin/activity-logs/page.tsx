
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Loader2, ListCollapse, AlertCircle, Eye, Download, Info } from 'lucide-react';
import type { ActivityLog, ActivityLogActionType } from '@/types';
import { getActivityLogs } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ActivityLogsPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'founder') {
        router.replace('/');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const fetchLogs = useCallback(async () => {
    if (!isLoggedIn || user?.role !== 'founder') {
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    try {
      const loadedLogs = await getActivityLogs(100); 
      setLogs(loadedLogs);
    } catch (error) {
      console.error("[ActivityLogsPage] Error loading logs:", error);
      toast({ title: "Error", description: "No se pudieron cargar los registros de actividad.", variant: "destructive" });
      setLogs([]);
    } finally {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, toast]);

  useEffect(() => {
    if (!authIsLoading && isLoggedIn && user?.role === 'founder') {
      fetchLogs();
    }
  }, [authIsLoading, isLoggedIn, user, fetchLogs]);

  const formatActionType = (actionType: ActivityLogActionType | undefined | null): string => {
    if (!actionType) return 'Acción Desconocida';
    const map: Record<ActivityLogActionType, string> = {
      PAYMENT_CONFIRMED: 'Confirmación de Pago',
      PAYMENT_REJECTED: 'Rechazo de Pago',
      PARTICIPATION_DELETED: 'Eliminación de Participación',
      RAFFLE_CREATED: 'Creación de Rifa',
      RAFFLE_EDITED: 'Edición de Rifa',
      RAFFLE_DELETED: 'Eliminación de Rifa',
      USER_CREATED: 'Creación de Usuario',
      USER_EDITED: 'Edición de Usuario',
      USER_DELETED: 'Eliminación de Usuario',
      USER_BLOCKED: 'Bloqueo de Usuario',
      USER_UNBLOCKED: 'Desbloqueo de Usuario',
      WINNER_REGISTERED: 'Registro de Ganador',
      ADMIN_LOGIN: 'Inicio de Sesión Admin',
      ADMIN_LOGOUT: 'Cierre de Sesión Admin',
      PROFILE_UPDATED: 'Actualización de Perfil',
    };
    return map[actionType] || String(actionType).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewLogDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsLogDetailOpen(true);
  };

  const formatDetailKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1') 
      .replace(/^./, str => str.toUpperCase()) 
      .trim();
  };

  const generateLogTextContent = (log: ActivityLog | null): string => {
    if (!log) return "Error: No hay información de log para mostrar.";
    
    let content = `REGISTRO DE ACTIVIDAD\n\n`;
    content += `ID del Log: ${log.id || 'N/A'}\n`;
    content += `Fecha y Hora: ${log.timestamp ? formatDateFns(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'Fecha no disponible'}\n\n`;
    content += `Administrador: ${log.adminUsername || 'N/A'}\n`;
    content += `Acción realizada: ${formatActionType(log.actionType)}\n\n`;

    content += `Objetivo:\n`;
    let objectiveFound = false;
    if (log.details && typeof log.details === 'object') {
        if (log.details.raffleName && log.details.raffleId) {
            content += `  Nombre de la rifa: ${log.details.raffleName}\n`;
            content += `  ID de la rifa: ${log.details.raffleId}\n`;
            objectiveFound = true;
        } else if (log.details.username && log.details.userId) {
            content += `  Nombre de usuario: ${log.details.username}\n`;
            content += `  ID de usuario: ${log.details.userId}\n`;
            objectiveFound = true;
        }
    }
    if (!objectiveFound && log.targetInfo) {
      content += `  ${log.targetInfo}\n`;
      objectiveFound = true;
    }
    if (!objectiveFound) {
      content += `  (No hay información de objetivo específica)\n`;
    }
    content += `\n`;

    if (log.details && typeof log.details === 'object') {
      if (Array.isArray(log.details.updatedFields) && log.details.updatedFields.length > 0) {
        content += `Campos actualizados:\n`;
        log.details.updatedFields.forEach((field: string) => {
          content += `  - ${field}\n`;
        });
      } else {
        const relevantDetails = { ...log.details };
        delete relevantDetails.raffleName;
        delete relevantDetails.raffleId;
        delete relevantDetails.username;
        delete relevantDetails.userId;
        delete relevantDetails.updatedFields;

        if (Object.keys(relevantDetails).length > 0) {
          content += `Detalles Adicionales:\n`;
          Object.entries(relevantDetails).forEach(([key, value]) => {
            if (value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')) {
              const formattedKey = formatDetailKey(key);
              if (Array.isArray(value)) {
                content += `  ${formattedKey}: ${value.join(', ')}\n`;
              } else if (typeof value === 'object') {
                content += `  ${formattedKey}:\n${JSON.stringify(value, null, 2).split('\n').map(l => `    ${l}`).join('\n')}\n`;
              } else {
                content += `  ${formattedKey}: ${String(value)}\n`;
              }
            }
          });
        } else {
           content += `Detalles Adicionales:\n  (No hay más detalles específicos registrados para esta acción)\n`;
        }
      }
    } else if (log.details && typeof log.details === 'string' && log.details.trim() !== '') {
      content += `Detalles Adicionales:\n  ${log.details}\n`;
    } else { // Covers log.details being null, undefined, or an empty object not caught above
       content += `Detalles Adicionales:\n  (No hay detalles registrados para esta acción)\n`;
    }
    
    content += `\n----------------------------------\n`;
    content += `Fin del Registro - RifaPaTi`;
    return content;
  };

  const handleDownloadLog = () => {
    if (!selectedLog) return;
    const content = generateLogTextContent(selectedLog);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `log_rifapati_${selectedLog.id ? selectedLog.id.substring(0, 8) : 'unknown'}_${selectedLog.timestamp ? new Date(selectedLog.timestamp).toISOString().split('T')[0] : 'nodate'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast({ title: "Log Descargado", description: "El archivo de log se ha guardado." });
  };


  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando registros de actividad...</p>
      </div>
    );
  }

  if (!isLoggedIn || user?.role !== 'founder') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold">Acceso Denegado</p>
        <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }
  
  return (
    <div>
      <SectionTitle className="flex items-center">
        Registros de Actividad
      </SectionTitle>

      {logs.length > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Últimas Actividades</CardTitle>
            <CardDescription>
              Se muestran los últimos 100 registros. Haz clic en "Ver Detalles" para más información.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-3">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id || Math.random().toString()} className="p-3 border rounded-md bg-card hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="flex-grow mb-2 sm:mb-0">
                      <p className="text-sm font-semibold text-foreground">{formatActionType(log.actionType)}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Admin:</span> {log.adminUsername || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Fecha:</span> {log.timestamp ? formatDateFns(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'N/A'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewLogDetails(log)} className="text-xs h-8 self-start sm:self-center">
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Detalles
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <ListCollapse className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            No hay registros de actividad disponibles.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Las acciones de los administradores se registrarán aquí.
          </p>
        </div>
      )}

      {selectedLog && (
        <Dialog open={isLogDetailOpen} onOpenChange={setIsLogDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-headline text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />Detalles del Registro de Actividad
              </DialogTitle>
              <DialogDescription>
                Información completa sobre la acción realizada.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-2 my-2">
              <div className="space-y-2.5 text-sm py-2">
                <p><strong>ID del Log:</strong> <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{selectedLog.id || 'N/A'}</span></p>
                <p><strong>Fecha y Hora:</strong> {selectedLog.timestamp ? formatDateFns(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : 'Fecha no disponible'}</p>
                <p><strong>Administrador:</strong> {selectedLog.adminUsername || 'N/A'}</p>
                <p><strong>Acción realizada:</strong> {formatActionType(selectedLog.actionType)}</p>
                
                <div>
                  <p className="font-semibold">Objetivo:</p>
                  {selectedLog.details && typeof selectedLog.details === 'object' && selectedLog.details.raffleName && selectedLog.details.raffleId ? (
                    <div className="pl-4 text-xs space-y-0.5 mt-0.5">
                      <p><strong>Nombre de la rifa:</strong> {selectedLog.details.raffleName}</p>
                      <p><strong>ID de la rifa:</strong> {selectedLog.details.raffleId}</p>
                    </div>
                  ) : selectedLog.details && typeof selectedLog.details === 'object' && selectedLog.details.username && selectedLog.details.userId ? (
                     <div className="pl-4 text-xs space-y-0.5 mt-0.5">
                      <p><strong>Nombre de usuario:</strong> {selectedLog.details.username}</p>
                      <p><strong>ID de usuario:</strong> {selectedLog.details.userId}</p>
                    </div>
                  ) : selectedLog.targetInfo ? (
                    <p className="text-xs text-muted-foreground pl-4 mt-0.5">{selectedLog.targetInfo}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-4 mt-0.5">(No hay información de objetivo específica)</p>
                  )}
                </div>

                <div>
                  {(() => {
                    if (selectedLog.details && typeof selectedLog.details === 'object') {
                      if (Array.isArray(selectedLog.details.updatedFields) && selectedLog.details.updatedFields.length > 0) {
                        return (
                          <>
                            <p className="font-semibold">Campos actualizados:</p>
                            <ul className="list-disc list-inside pl-4 space-y-0.5 text-xs bg-muted/50 p-2 rounded-md mt-1">
                              {selectedLog.details.updatedFields.map((field: string, index: number) => (
                                <li key={index}>{field}</li>
                              ))}
                            </ul>
                          </>
                        );
                      } else {
                        // Prepare relevantDetails, excluding known ones already displayed or handled
                        const relevantDetails = { ...selectedLog.details };
                        delete relevantDetails.raffleName;
                        delete relevantDetails.raffleId;
                        delete relevantDetails.username;
                        delete relevantDetails.userId;
                        delete relevantDetails.updatedFields; // Important to remove it here too

                        if (Object.keys(relevantDetails).length > 0) {
                          return (
                            <>
                              <p className="font-semibold">Detalles Adicionales:</p>
                              <ul className="list-disc list-inside pl-4 space-y-0.5 text-xs bg-muted/50 p-2 rounded-md mt-1">
                                {Object.entries(relevantDetails).map(([key, value]) => {
                                  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
                                  return (
                                    <li key={key}>
                                      <span className="font-medium">{formatDetailKey(key)}:</span>{' '}
                                      {Array.isArray(value)
                                        ? value.join(', ')
                                        : typeof value === 'object'
                                        ? <pre className="whitespace-pre-wrap text-xs bg-muted/30 p-1 my-0.5 rounded text-[0.65rem]">{JSON.stringify(value, null, 2)}</pre>
                                        : String(value)}
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          );
                        } else {
                          // If details was an object, but no updatedFields, and no other relevant keys
                          return <p className="text-xs text-muted-foreground italic mt-1">Detalles Adicionales: (No hay más detalles específicos registrados para esta acción)</p>;
                        }
                      }
                    } else if (typeof selectedLog.details === 'string' && selectedLog.details.trim() !== '') {
                      return (
                        <>
                          <p className="font-semibold">Detalles Adicionales:</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md mt-1">{selectedLog.details}</p>
                        </>
                      );
                    } else {
                      // This covers selectedLog.details being null, undefined, or an empty object initially
                      return <p className="text-xs text-muted-foreground italic mt-1">Detalles Adicionales: (No hay detalles registrados para esta acción)</p>;
                    }
                  })()}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={handleDownloadLog} size="sm" className="text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar Log
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="sm" className="text-xs">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
    
