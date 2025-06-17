
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
import { Loader2, Download, Upload, AlertTriangle, DatabaseZap, CheckCircle, XCircle } from 'lucide-react';
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

const COLLECTIONS_TO_BACKUP = ['users', 'raffles', 'participations', 'activityLogs', 'raffleResults'];

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


  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'founder') {
        router.replace('/admin');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setRestoreSummary([]);
    setRestoreErrors([]);
    toast({ title: 'Iniciando Copia de Seguridad', description: 'Exportando datos de Firestore...' });
    try {
      const data = await exportFirestoreCollections(COLLECTIONS_TO_BACKUP);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      link.download = `rifapati_backup_${timestamp}.json`;
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
    setIsRestoreConfirmOpen(false); // Close confirmation dialog
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
          
          // Validate basic structure
          let isValidStructure = true;
          for (const col of COLLECTIONS_TO_BACKUP) {
            if (!dataToImport[col] || !Array.isArray(dataToImport[col])) {
              isValidStructure = false;
              break;
            }
          }
          if (!isValidStructure) {
            throw new Error('El archivo de respaldo no tiene la estructura esperada para las colecciones.');
          }

          const importResult = await importFirestoreCollections(dataToImport, COLLECTIONS_TO_BACKUP);
          
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
          // Reset file input visually (though state is already null)
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

  if (authIsLoading || (!isLoggedIn && user?.role !== 'founder')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando acceso...</p>
      </div>
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
              Descarga una copia de seguridad de todas las colecciones importantes de Firestore en formato JSON.
              Guarda este archivo en un lugar seguro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={isBackingUp || isRestoring} className="w-full">
              {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isBackingUp ? 'Creando Copia...' : 'Descargar Copia de Seguridad'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Colecciones incluidas: {COLLECTIONS_TO_BACKUP.join(', ')}.
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
                  disabled={isRestoring || isBackingUp}
                  className="text-xs"
                />
              </div>
              <Button
                onClick={() => {
                  if (selectedFile) setIsRestoreConfirmOpen(true);
                  else toast({ title: 'No hay archivo', description: 'Selecciona un archivo .json para restaurar.', variant: 'destructive' });
                }}
                disabled={!selectedFile || isRestoring || isBackingUp}
                variant="destructive"
                className="w-full"
              >
                {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isRestoring ? 'Restaurando...' : 'Restaurar Datos'}
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
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> ¡ADVERTENCIA IMPORTANTE!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Estás a punto de restaurar los datos desde el archivo <span className="font-semibold">{selectedFile?.name}</span>.
              <br /><br />
              <span className="font-bold text-destructive">Esta acción ELIMINARÁ PERMANENTEMENTE todos los datos existentes en las colecciones ({COLLECTIONS_TO_BACKUP.join(', ')}) antes de importar los nuevos datos.</span>
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
    </div>
  );
}
