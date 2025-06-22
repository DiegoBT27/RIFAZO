
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; 

interface NumberSelectorProps {
  totalNumbers: number;
  soldNumbers: number[];
  pricePerTicket: number;
  onSelectionChange: (selected: number[]) => void;
}

export default function NumberSelector({
  totalNumbers,
  soldNumbers,
  pricePerTicket,
  onSelectionChange,
}: NumberSelectorProps) {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const handleNumberClick = (number: number) => {
    if (soldNumbers.includes(number)) return;

    const newSelection = selectedNumbers.includes(number)
      ? selectedNumbers.filter((n) => n !== number)
      : [...selectedNumbers, number];
    
    setSelectedNumbers(newSelection);
    onSelectionChange(newSelection);
  };

  const numbersArray = Array.from({ length: totalNumbers }, (_, i) => i + 1);

  return (
    <div>
      <h3 className="text-sm sm:text-base font-headline font-semibold mb-2 sm:mb-2.5">Selecciona tus números:</h3>
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
          <p className="font-semibold text-xs sm:text-sm text-destructive">Total a pagar: ${selectedNumbers.length * pricePerTicket}</p>
        </div>
      )}
    </div>
  );
}
