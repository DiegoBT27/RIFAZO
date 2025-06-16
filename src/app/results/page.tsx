
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RaffleResult } from '@/types';
import { Award, CalendarDays, Ticket as TicketIcon, Gift, Loader2, ListChecks, Phone as PhoneIcon } from 'lucide-react'; // Added PhoneIcon
import { getRaffleResults } from '@/lib/firebase/firestoreService'; 
import { useToast } from '@/hooks/use-toast';

export default function ResultsPage() {
  const { isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
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
    if (!authIsLoading && !isLoggedIn) {
      router.replace('/login');
    } else if (!authIsLoading && isLoggedIn) {
      fetchResults();
    }
  }, [isLoggedIn, authIsLoading, router, fetchResults]);

  if (authIsLoading || (pageIsLoading && isLoggedIn)) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando resultados...</p>
      </div>
    );
  }
  
  return (
    <div>
      <SectionTitle>Resultados de Sorteos Anteriores</SectionTitle>
      {results.length > 0 ? (
        <div className="space-y-6">
          {results.map((result) => (
            <Card key={result.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden bg-card">
              <CardHeader className="p-6">
                <CardTitle className="font-headline text-xl text-foreground flex items-center">
                  <Gift className="h-6 w-6 mr-3 text-accent" />
                  {result.raffleName}
                </CardTitle>
                <CardDescription className="flex items-center text-sm text-foreground pt-1">
                  <CalendarDays className="h-4 w-4 mr-2 text-accent" />
                  Sorteado el: {new Date(result.drawDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start p-4 border rounded-lg flex-grow bg-secondary/20">
                    <TicketIcon className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Número Ganador:</p>
                      <p className="text-2xl font-bold text-accent">{String(result.winningNumber)}</p> 
                    </div>
                  </div>
                  {result.winnerName && (
                    <div className="flex items-start p-4 border rounded-lg flex-grow bg-secondary/20">
                      <Award className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Ganador(a):</p>
                        <p className="text-lg font-semibold text-foreground">{result.winnerName}</p>
                      </div>
                    </div>
                  )}
                  {result.winnerPhone && (
                    <div className="flex items-start p-4 border rounded-lg flex-grow bg-secondary/20">
                      <PhoneIcon className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Teléfono Ganador:</p>
                        <p className="text-base font-semibold text-foreground">{result.winnerPhone}</p>
                      </div>
                    </div>
                  )}
                   <div className="flex items-start p-4 border rounded-lg flex-grow md:col-span-2 bg-secondary/20">
                    <ListChecks className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Premio Otorgado:</p>
                      <p className="text-base font-semibold text-foreground">{result.prize}</p>
                    </div>
                  </div>
                </div>
                 {!(result.winnerName || result.winnerPhone) && ( 
                  <div className="text-center text-sm text-muted-foreground p-3 bg-muted/20 rounded-md mt-4">
                    Los datos del ganador (nombre/teléfono) aún no han sido anunciados o no están disponibles.
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

