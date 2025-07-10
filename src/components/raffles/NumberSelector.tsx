
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

interface NumberSelectorProps {
  totalNumbers: number;
  soldNumbers: number[];
  pricePerTicket: number;
  currency: 'USD' | 'Bs';
  onSelectionChange: (selected: number[]) => void;
  minTickets?: number | null;
  maxTickets?: number | null;
}

export default function NumberSelector({
  totalNumbers,
  soldNumbers,
  pricePerTicket,
  currency,
  onSelectionChange,
  minTickets,
  maxTickets,
}: NumberSelectorProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const selectionCount = selectedNumbers.length;
    if (selectionCount === 0) {
      setValidationError(null);
      return;
    }
    if (minTickets && selectionCount < minTickets) {
      setValidationError(`Debes seleccionar al menos ${minTickets} boletos.`);
    } else if (maxTickets && selectionCount > maxTickets) {
      setValidationError(`No puedes seleccionar más de ${maxTickets} boletos.`);
    } else {
      setValidationError(null);
    }
  }, [selectedNumbers, minTickets, maxTickets]);

  const handleNumberClick = (number: number) => {
    if (soldNumbers.includes(number)) return;

    const newSelection = selectedNumbers.includes(number)
      ? selectedNumbers.filter((n) => n !== number)
      : [...selectedNumbers, number];
    
    setSelectedNumbers(newSelection);
    onSelectionChange(newSelection);
  };
  
  const currencySymbol = currency === 'Bs' ? 'Bs' : '$';

  const numbersArray = Array.from({ length: totalNumbers }, (_, i) => i + 1);

  return (
    <div>
      <h3 className="text-sm sm:text-base font-headline font-semibold mb-2 sm:mb-2.5">Selecciona tus números:</h3>
      
      {(minTickets || maxTickets) && (
        <Alert variant="default" className="mb-3 text-xs p-2 bg-primary/5 border-primary/20 text-primary">
          <AlertDescription>
            Límites de esta rifa:
            {minTickets && <span className="block">- Compra mínima: {minTickets} boleto(s).</span>}
            {maxTickets && <span className="block">- Compra máxima: {maxTickets} boleto(s).</span>}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-0.5 sm:gap-1 mb-2 sm:mb-2.5">
        {numbersArray.map((number) => {
          const isSold = soldNumbers.includes(number);
          const isSelected = selectedNumbers.includes(number);
          return (
            <motion.button
              key={number}
              onClick={() => handleNumberClick(number)}
              disabled={isSold}
              className={cn(
                'p-1 sm:p-1.5 border rounded-md text-xs transition-all duration-200 ease-in-out focus:outline-none focus:ring-2', // Base classes
                isSold
                  ? 'bg-destructive/10 text-destructive cursor-not-allowed line-through border-destructive/20 dark:bg-destructive/20 dark:text-destructive/70 dark:border-destructive/30 focus:ring-destructive/30'
                  : 'bg-card hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:ring-neutral-400 dark:focus:ring-neutral-500', // Normal available button
                isSelected 
                  ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive/80 shadow-lg transform scale-105 hover:bg-destructive/90 focus:ring-destructive'
                  : ''
              )}
              whileTap={!isSold ? { scale: 0.95 } : {}}
              animate={{ scale: isSelected ? 1.05 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {String(number)}
            </motion.button>
          );
        })}
      </div>
      {selectedNumbers.length > 0 && (
        <div className="mt-2 sm:mt-2.5 p-2 sm:p-2.5 bg-secondary rounded-md shadow">
          <p className="font-medium text-[0.7rem] sm:text-xs">Números seleccionados: {selectedNumbers.map(n => String(n)).join(', ')}</p>
          <p className="font-semibold text-xs sm:text-sm text-destructive">Total a pagar: {currencySymbol}{selectedNumbers.length * pricePerTicket}</p>
        </div>
      )}
       <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '8px' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="p-2 text-xs">
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
