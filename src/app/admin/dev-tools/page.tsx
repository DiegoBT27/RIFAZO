
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, DatabaseZap, Trash2 } from 'lucide-react';
// import { clearAllTestDataFromFirestore } from '@/lib/firebase/firestoreService'; // Import commented out
import { ScrollArea } from '@/components/ui/scroll-area';
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

export default function DevToolsPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ summary: string[]; errors: string[] } | null>(null);
  const [isCleanConfirmOpen, setIsCleanConfirmOpen] = useState(false);

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role !== 'founder') {
        router.replace('/admin');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const handleClearData = async () => {
    setIsCleanConfirmOpen(false);
    setIsCleaning(true);
    setCleanResult(null);
    toast({ title: 'Función Deshabilitada', description: 'La limpieza de datos de prueba está actualmente deshabilitada.' });
    // try {
    //   // const result = await clearAllTestDataFromFirestore(); // Function call commented out
    //   // setCleanResult(result);
    //   // if (result.errors.length > 0) {
    //   //   toast({
    //   //     title: 'Limpieza Completada con Errores',
    //   //     description: `Se encontraron ${result.errors.length} errores. Revisa el resumen.`,
    //   //     variant: 'destructive',
    //   //     duration: 7000,
    //   //   });
    //   // } else {
    //   //   toast({
    //   //     title: 'Limpieza de Datos Exitosa',
    //   //     description: 'Los datos de prueba han sido eliminados de Firestore.',
    //   //   });
    //   // }
    // } catch (error: any) {
    //   console.error('Error cleaning database:', error);
    //   setCleanResult({ summary: [], errors: [`Error general durante la limpieza: ${error.message}`] });
    //   toast({ title: 'Error en la Limpieza', description: 'No se pudieron eliminar los datos de prueba.', variant: 'destructive' });
    // } finally {
    //   setIsCleaning(false);
    // }
    setIsCleaning(false); // Ensure loading state is reset
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
        <DatabaseZap className="mr-3 h-7 w-7 text-primary" /> Herramientas de Desarrollo
      </SectionTitle>

      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-destructive">
            <Trash2 className="mr-2 h-5 w-5" /> Limpiar Todos los Datos de Prueba (Deshabilitado)
          </CardTitle>
          <CardDescription className="text-destructive/90">
            <span className="font-bold">¡ADVERTENCIA!</span> Esta acción eliminaría permanentemente todas las rifas, participaciones, resultados de rifas y todos los usuarios excepto el usuario 'fundador'.
            <span className="block mt-1">Actualmente deshabilitado.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsCleanConfirmOpen(true)} 
            disabled={true} // Button is now permanently disabled
            className="w-full bg-destructive hover:bg-destructive/80"
          >
            {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {isCleaning ? 'Limpiando Datos...' : 'Limpiar Datos de Prueba (Deshabilitado)'}
          </Button>
        </CardContent>
      </Card>

      {cleanResult && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              {cleanResult.errors.length > 0 ? <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> : <CheckCircle className="mr-2 h-5 w-5 text-green-600" />}
              Resumen de la Limpieza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px] text-xs p-2 border rounded-md bg-muted/30">
              {cleanResult.summary.map((item, index) => (
                <p key={`summary-${index}`}>{item}</p>
              ))}
              {cleanResult.errors.length > 0 && (
                <>
                  <p className="font-semibold mt-2 text-destructive">Errores ({cleanResult.errors.length}):</p>
                  {cleanResult.errors.map((error, index) => (
                    <p key={`error-${index}`} className="text-destructive mb-1">{error}</p>
                  ))}
                </>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isCleanConfirmOpen} onOpenChange={setIsCleanConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-xl">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" /> ¡CONFIRMACIÓN EXTREMA!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base py-2">
              Esta función está actualmente deshabilitada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCleaning || true} className="text-xs">Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isCleaning || true} // Action is also disabled
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Acción Deshabilitada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
