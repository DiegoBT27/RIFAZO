
'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlanLimitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string; // e.g., "crear más rifas", "editar esta rifa"
}

export default function PlanLimitDialog({ isOpen, onOpenChange, featureName = "realizar esta acción" }: PlanLimitDialogProps) {
  const router = useRouter();

  const handleViewPlans = () => {
    onOpenChange(false);
    router.push('/plans');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-destructive" />
            Límite del Plan Actual Alcanzado
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2">
            Has excedido el límite de tu plan actual para {featureName}.
            Considera mejorar tu plan para acceder a más funcionalidades.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Cerrar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleViewPlans}
            className="bg-primary hover:bg-primary/90 text-xs h-9"
          >
            Ver Planes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
