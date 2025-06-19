
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RaffleResult } from '@/types';
import { Award, CalendarDays, Ticket as TicketIcon, Gift, Loader2, ListChecks, Phone as PhoneIcon, UserCircle } from 'lucide-react';
import { getRaffleResults } from '@/lib/firebase/firestoreService'; 
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function ResultsPage() {
  const { isLoading: authIsLoading } = useAuth(); // Only need authIsLoading for initial gate
  const router = useRouter(); // Keep for potential future use, though not redirecting now
  const { toast } = useToast();
  const [results, setResults] = useState<RaffleResult[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setPageIsLoading(true);
    try {
      const loadedResults = await getRaffleResults();
      loadedResults.sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
      setResults(loadedResults);
    } catch (error) {
      console.error("Error loading raffle results:", error);
      toast({ title: "Error", description: "No se pudieron cargar los resultados de los sorteos.", variant: "destructive"});
      setResults([]);
    } finally {
      setPageIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    // Fetch results once authentication status is determined, regardless of login state.
    if (!authIsLoading) {
      fetchResults();
    }
  }, [authIsLoading, fetchResults]); // Depend on authIsLoading to ensure it runs after auth check

  if (authIsLoading || pageIsLoading) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando resultados...</p>
      </div>
    );
  }
  
  return (
    <div>
      <SectionTitle className="mb-[30px]">Resultados de Sorteos Anteriores</SectionTitle>
      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="shadow-lg hover:shadow-md transition-shadow duration-200 overflow-hidden bg-card border border-border/80">
              <CardHeader className="p-3">
                <CardTitle className="font-headline text-sm text-foreground flex items-center">
                  <Gift className="h-4 w-4 mr-1.5 text-accent" />
                  {result.raffleName}
                </CardTitle>
                <CardDescription className="flex items-center text-xs text-muted-foreground pt-0.5">
                  <CalendarDays className="h-3 w-3 mr-1 text-accent/80" />
                  Sorteado el: {new Date(result.drawDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <Separator className="mx-3 w-auto" />
              <CardContent className="p-3 space-y-2">
                
                <div className="flex items-center p-2 border rounded-md bg-primary/5 border-primary/20">
                  <TicketIcon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[0.65rem] font-medium text-primary leading-tight">Número Ganador:</p>
                    <p className="text-lg font-bold text-primary leading-tight">{String(result.winningNumber)}</p>
                  </div>
                </div>

                <div className="p-2 border rounded-md bg-secondary/10">
                  <div className="flex items-center">
                    <ListChecks className="h-3.5 w-3.5 mr-1.5 text-accent/80 flex-shrink-0" />
                    <div>
                      <p className="text-[0.65rem] font-medium text-foreground leading-tight">Premio Otorgado:</p>
                      <p className="text-xs font-semibold text-foreground leading-tight">{result.prize}</p>
                    </div>
                  </div>
                </div>

                { (result.winnerName || result.winnerPhone) && (
                  <div className="p-2 border rounded-md bg-secondary/10 space-y-1">
                    <h4 className="text-[0.65rem] font-semibold text-foreground flex items-center leading-tight">
                      <Award className="h-3.5 w-3.5 mr-1 text-accent/80" />
                      Detalles del Ganador
                    </h4>
                    {result.winnerName && (
                      <div className="flex items-center text-xs">
                        <UserCircle className="h-3 w-3 mr-1 text-muted-foreground" />
                        <p className="text-foreground leading-tight">{result.winnerName}</p>
                      </div>
                    )}
                    {result.winnerPhone && (
                      <div className="flex items-center text-xs">
                        <PhoneIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                        <p className="text-foreground leading-tight">{result.winnerPhone}</p>
                      </div>
                    )}
                  </div>
                )}

                {!(result.winnerName || result.winnerPhone) && ( 
                  <div className="text-center text-[0.65rem] text-muted-foreground p-1.5 bg-muted/10 rounded-md">
                    Datos del ganador no disponibles.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Gift className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">Aún no hay resultados de sorteos.</p>
          <p className="text-sm text-muted-foreground mt-1">Vuelve más tarde para ver los números ganadores.</p>
        </div>
      )}
    </div>
  );
}
