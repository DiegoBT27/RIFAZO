
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Upload, AlertTriangle, DatabaseZap, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { exportFirestoreCollections, importFirestoreCollections } from '@/lib/firebase/firestoreService';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPlanDetails } from '@/lib/config/plans';
import PlanLimitDialog from '@/components/admin/PlanLimitDialog';

const FOUNDER_COLLECTIONS_TO_BACKUP = ['users', 'raffles', 'participations', 'activityLogs', 'raffleResults'];
const ADMIN_COLLECTIONS_TO_BACKUP = ['raffles', 'participations', 'activityLogs', 'raffleResults'];

export default function BackupRestorePage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<string[]>([]);
  const [restoreErrors, setRestoreErrors] = useState<string[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlanLimitDialogOpen, setIsPlanLimitDialogOpen] = useState(false);
  const [pageIsLoading, setPageIsLoading] = useState(true);


  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
        setPageIsLoading(false);
        return;
      }
      if (user?.role === 'founder') {
        setAccessDenied(false);
      } else if (user?.role === 'admin') {
        const planDetails = getPlanDetails(user.planActive ? user.plan : null);
        if (!planDetails.includesBackupRestore) {
          setAccessDenied(true);
          setIsPlanLimitDialogOpen(true);
        } else {
          setAccessDenied(false);
        }
      } else { 
        router.replace('/admin'); 
      }
    }
    if (!authIsLoading) {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setRestoreSummary([]);
    setRestoreErrors([]);
    
    let collectionsForBackup: string[] = [];
    let usernameForExport: string | undefined = undefined;
    let toastMessage = 'Exportando datos...';

    if (user?.role === 'admin') {
      collectionsForBackup = ADMIN_COLLECTIONS_TO_BACKUP;
      usernameForExport = user.username;
      toastMessage = 'Exportando datos de tus rifas...';
    } else if (user?.role === 'founder') {
      collectionsForBackup = FOUNDER_COLLECTIONS_TO_BACKUP;
      toastMessage = 'Exportando todos los datos de la plataforma...';
    } else {
      toast({ title: 'Error de Permiso', description: 'No tienes permiso para realizar esta acción.', variant: 'destructive' });
      setIsBackingUp(false);
      return;
    }

    toast({ title: 'Iniciando Copia de Seguridad', description: toastMessage });
    try {
      const data = await exportFirestoreCollections(collectionsForBackup, usernameForExport);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      link.download = `rifapati_backup_${user?.role === 'admin' ? user.username + '_' : ''}${timestamp}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Copia de Seguridad Creada', description: 'El archivo JSON ha sido descargado.' });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({ title: 'Error en Copia de Seguridad', description: 'No se pudo exportar los datos.', variant: 'destructive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setRestoreSummary([]);
      setRestoreErrors([]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      toast({ title: 'Error de Restauración', description: 'Por favor, selecciona un archivo de respaldo.', variant: 'destructive' });
      return;
    }
    // Ensure only founder can restore
    if (user?.role !== 'founder') {
      toast({ title: 'Error de Permiso', description: 'Solo los fundadores pueden restaurar datos.', variant: 'destructive' });
      return;
    }

    setIsRestoreConfirmOpen(false); 
    setIsRestoring(true);
    toast({ title: 'Iniciando Restauración', description: 'Importando datos desde el archivo. Esto puede tardar...' });

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Error al leer el archivo.');
          }
          const dataToImport = JSON.parse(result);
          
          let isValidStructure = true;
          // For founder, check against FOUNDER_COLLECTIONS_TO_BACKUP
          for (const col of FOUNDER_COLLECTIONS_TO_BACKUP) {
            if (!dataToImport[col] || !Array.isArray(dataToImport[col])) {
               // Allow missing 'users' if it was an admin backup, though admin shouldn't be able to restore
               if (col === 'users' && !Object.keys(dataToImport).includes('users')) {
                 console.warn("Archivo de respaldo no contiene la colección 'users'. Si es un respaldo de admin, esto es esperado pero la restauración completa fallará si se intenta con este archivo.");
                 // This path should ideally not be taken by an admin due to role checks.
               } else {
                isValidStructure = false;
                break;
               }
            }
          }
          if (!isValidStructure) {
            throw new Error('El archivo de respaldo no tiene la estructura esperada para una restauración completa de fundador.');
          }

          const importResult = await importFirestoreCollections(dataToImport, FOUNDER_COLLECTIONS_TO_BACKUP);
          
          setRestoreSummary(importResult.summary);
          setRestoreErrors(importResult.errors);

          if (importResult.success) {
            toast({ title: 'Restauración Completada', description: 'Los datos han sido importados exitosamente desde el archivo.' });
          } else {
            toast({
              title: 'Restauración Completada con Errores',
              description: 'Algunas colecciones pudieron no haberse restaurado correctamente. Revisa el resumen.',
              variant: 'destructive',
              duration: 10000
            });
          }
        } catch (parseError: any) {
          console.error('Error parsing or processing restore file:', parseError);
          setRestoreErrors([`Error al procesar el archivo de respaldo: ${parseError.message}`]);
          toast({ title: 'Error de Restauración', description: `El archivo de respaldo es inválido o está corrupto: ${parseError.message}`, variant: 'destructive' });
        } finally {
          setIsRestoring(false);
          setSelectedFile(null); 
          const fileInput = document.getElementById('restoreFile') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }
      };
      fileReader.onerror = () => {
        console.error('Error reading file for restore');
        toast({ title: 'Error de Restauración', description: 'No se pudo leer el archivo seleccionado.', variant: 'destructive' });
        setIsRestoring(false);
      };
      fileReader.readAsText(selectedFile);
    } catch (error) {
      console.error('Error initiating restore:', error);
      toast({ title: 'Error de Restauración', description: 'Ocurrió un error inesperado al iniciar la restauración.', variant: 'destructive' });
      setIsRestoring(false);
    }
  };
  
  const backupDescription = user?.role === 'founder'
    ? 'Descarga una copia de seguridad de TODAS las colecciones de Firestore en formato JSON. Guarda este archivo en un lugar seguro.'
    : 'Descarga una copia de seguridad de TUS rifas, participaciones y registros de actividad. Guarda este archivo en un lugar seguro.';
  
  const backupCollectionsList = user?.role === 'founder'
    ? FOUNDER_COLLECTIONS_TO_BACKUP.join(', ')
    : ADMIN_COLLECTIONS_TO_BACKUP.join(', ');


  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
        <>
            <PlanLimitDialog
                isOpen={isPlanLimitDialogOpen}
                onOpenChange={(isOpen) => {
                    setIsPlanLimitDialogOpen(isOpen);
                    if (!isOpen) router.replace('/admin'); 
                }}
                featureName="la copia de seguridad y restauración"
            />
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-semibold">Acceso Denegado por Plan</p>
                <p className="text-muted-foreground">Tu plan no incluye esta funcionalidad.</p>
            </div>
        </>
     );
  }


  return (
    <div>
      <SectionTitle className="flex items-center">
        <DatabaseZap className="mr-3 h-7 w-7 text-primary" /> Copia de Seguridad y Restauración
      </SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Download className="mr-2 h-5 w-5" /> Crear Copia de Seguridad
            </CardTitle>
            <CardDescription>
              {backupDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={isBackingUp || isRestoring} className="w-full">
              {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isBackingUp ? 'Creando Copia...' : 'Descargar Copia de Seguridad'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Colecciones incluidas: {backupCollectionsList}.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Upload className="mr-2 h-5 w-5" /> Restaurar desde Copia de Seguridad
            </CardTitle>
            <CardDescription>
              Sube un archivo JSON previamente descargado para restaurar los datos de Firestore.
              <span className="font-bold text-destructive block mt-1"> (Solo para Fundadores. Esta acción reemplazará todos los datos existentes).</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="restoreFile" className="text-sm">Archivo de Respaldo (.json)</Label>
                <Input
                  id="restoreFile"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={user?.role !== 'founder' || isRestoring || isBackingUp}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  if (selectedFile) setIsRestoreConfirmOpen(true);
                  else toast({ title: 'No hay archivo', description: 'Selecciona un archivo .json para restaurar.', variant: 'destructive' });
                }}
                disabled={user?.role !== 'founder' || !selectedFile || isRestoring || isBackingUp}
                variant="destructive"
                className="w-full"
              >
                {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isRestoring ? 'Restaurando...' : (user?.role !== 'founder' ? 'Restaurar (Solo Fundador)' : 'Restaurar Datos')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {(restoreSummary.length > 0 || restoreErrors.length > 0) && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              {restoreErrors.length > 0 ? <XCircle className="mr-2 h-5 w-5 text-destructive" /> : <CheckCircle className="mr-2 h-5 w-5 text-green-600" />}
              Resumen de la Restauración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px] text-xs p-2 border rounded-md bg-muted/30">
              {restoreSummary.map((item, index) => (
                <p key={`summary-${index}`} className="mb-1">{item}</p>
              ))}
              {restoreErrors.map((error, index) => (
                <p key={`error-${index}`} className="text-destructive font-medium mb-1">{error}</p>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> ¡ADVERTENCIA IMPORTANTE (FUNDADOR)!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Estás a punto de restaurar los datos desde el archivo <span className="font-semibold">{selectedFile?.name}</span>.
              <br /><br />
              <span className="font-bold text-destructive">Esta acción ELIMINARÁ PERMANENTEMENTE todos los datos existentes en las colecciones ({FOUNDER_COLLECTIONS_TO_BACKUP.join(', ')}) antes de importar los nuevos datos.</span>
              <br /><br />
              Esta operación no se puede deshacer. Asegúrate de que el archivo seleccionado sea correcto y de que realmente deseas proceder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, Entiendo los Riesgos, Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <PlanLimitDialog
            isOpen={isPlanLimitDialogOpen && accessDenied}
            onOpenChange={(isOpen) => {
                setIsPlanLimitDialogOpen(isOpen);
                if (!isOpen && accessDenied) router.replace('/admin');
            }}
            featureName="la copia de seguridad y restauración"
        />
    </div>
  );
}

