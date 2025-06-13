
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { mockRaffleResults } from '@/lib/mock-data';
import type { RaffleResult } from '@/types';
import { Award, CalendarDays, Ticket as TicketIcon, Gift, Loader2 } from 'lucide-react';

export default function ResultsPage() {
  const { isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const results: RaffleResult[] = mockRaffleResults;

  useEffect(() => {
    if (!authIsLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, authIsLoading, router]);

  if (authIsLoading || (!isLoggedIn && !authIsLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Verificando sesión...</p>
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
                  Sorteado el: {new Date(result.drawDate).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start p-4 border rounded-lg flex-grow">
                    <TicketIcon className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Número Ganador:</p>
                      <p className="text-2xl font-bold text-accent">{String(result.winningNumber).padStart(2, '0')}</p>
                    </div>
                  </div>
                  {result.winnerName && (
                    <div className="flex items-start p-4 border rounded-lg flex-grow">
                      <Award className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Ganador(a):</p>
                        <p className="text-lg font-semibold text-foreground">{result.winnerName}</p>
                      </div>
                    </div>
                  )}
                   <div className="flex items-start p-4 border rounded-lg flex-grow md:col-span-2">
                    <Gift className="h-6 w-6 mr-3 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Premio Otorgado:</p>
                      <p className="text-base font-semibold text-foreground">{result.prize}</p>
                    </div>
                  </div>
                </div>
                 {!result.winnerName && results.length === 1 && ( 
                  <div className="text-center text-sm text-muted-foreground p-3 bg-muted/20 rounded-md mt-4">
                    El nombre del ganador aún no ha sido anunciado o no está disponible.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
           {results.some(r => !r.winnerName) && results.length > 1 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Algunos nombres de ganadores podrían no estar disponibles o anunciados aún.
            </p>
           )}
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
