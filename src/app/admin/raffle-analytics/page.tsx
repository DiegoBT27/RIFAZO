
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart as BarChartIconLucide, Loader2, AlertCircle, ListChecks, TrendingUp, DollarSign, Percent, CheckCircle, XCircle, Clock, Inbox } from 'lucide-react';
import type { Raffle, Participation } from '@/types';
import { getRaffles, getParticipations } from '@/lib/firebase/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, BarChart as RechartsBarChartComponent } from "recharts";
import { getPlanDetails } from '@/lib/config/plans';
import PlanLimitDialog from '@/components/admin/PlanLimitDialog';

interface RaffleAnalyticsData {
  raffle: Raffle;
  totalConfirmedTickets: number;
  estimatedIncome: number;
  pendingTickets: number;
  rejectedTickets: number;
  paymentStatusCounts: { pending: number; confirmed: number; rejected: number };
  mostChosenNumbers: { number: number; count: number }[];
}

const chartConfig = {};

export default function RaffleAnalyticsPage() {
  const { user, isLoggedIn, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [analyticsData, setAnalyticsData] = useState<RaffleAnalyticsData[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPlanLimitDialogOpen, setIsPlanLimitDialogOpen] = useState(false);

  useEffect(() => {
    if (!authIsLoading) {
      if (!isLoggedIn) {
        router.replace('/login');
      } else if (user?.role === 'founder') {
        // Founder always has access
        setAccessDenied(false);
      } else if (user?.role === 'admin') { // Check plan only for admin
        const planDetails = getPlanDetails(user.planActive ? user.plan : null);
        if (!planDetails.includesDetailedAnalytics) {
          setAccessDenied(true);
          setIsPlanLimitDialogOpen(true);
        } else {
          setAccessDenied(false); 
        }
      } else { // Not founder or admin
        router.replace('/');
      }
    }
  }, [isLoggedIn, user, authIsLoading, router]);

  const calculateAnalytics = useCallback(async () => {
    if (!isLoggedIn || !user || (user.role !== 'admin' && user.role !== 'founder') || accessDenied) {
      setPageIsLoading(false);
      return;
    }
    setPageIsLoading(true);
    try {
      const [allRaffles, allParticipations] = await Promise.all([
        getRaffles(),
        getParticipations()
      ]);

      const filteredRaffles = user.role === 'founder'
        ? allRaffles
        : allRaffles.filter(r => r.creatorUsername === user.username);

      const calculatedData: RaffleAnalyticsData[] = filteredRaffles.map(raffle => {
        const raffleParticipations = allParticipations.filter(p => p.raffleId === raffle.id);

        let totalConfirmedTickets = 0;
        let pendingTickets = 0;
        let rejectedTickets = 0;
        const paymentStatusCounts = { pending: 0, confirmed: 0, rejected: 0 };
        const numberCounts: Record<number, number> = {};

        raffleParticipations.forEach(p => {
          p.numbers.forEach(num => {
            numberCounts[num] = (numberCounts[num] || 0) + 1;
          });

          if (p.paymentStatus === 'confirmed') {
            totalConfirmedTickets += p.numbers.length;
            paymentStatusCounts.confirmed++;
          } else if (p.paymentStatus === 'pending') {
            pendingTickets += p.numbers.length;
            paymentStatusCounts.pending++;
          } else if (p.paymentStatus === 'rejected') {
            rejectedTickets += p.numbers.length;
            paymentStatusCounts.rejected++;
          }
        });

        const estimatedIncome = totalConfirmedTickets * raffle.pricePerTicket;

        const sortedNumberCounts = Object.entries(numberCounts)
          .map(([num, count]) => ({ number: parseInt(num), count }))
          .sort((a, b) => b.count - a.count);

        const mostChosenNumbers = sortedNumberCounts.slice(0, 5);

        return {
          raffle,
          totalConfirmedTickets,
          estimatedIncome,
          pendingTickets,
          rejectedTickets,
          paymentStatusCounts,
          mostChosenNumbers,
        };
      });

      calculatedData.sort((a, b) => new Date(b.raffle.drawDate).getTime() - new Date(a.raffle.drawDate).getTime());

      setAnalyticsData(calculatedData);
    } catch (error) {
      console.error("[RaffleAnalyticsPage] Error calculating analytics:", error);
      toast({ title: "Error de Cálculo", description: "No se pudieron generar las analíticas.", variant: "destructive" });
      setAnalyticsData([]);
    } finally {
      setPageIsLoading(false);
    }
  }, [isLoggedIn, user, toast, accessDenied]);

  useEffect(() => {
    if (!authIsLoading && isLoggedIn && (user?.role === 'admin' || user?.role === 'founder') && !accessDenied) {
      calculateAnalytics();
    } else if (accessDenied) {
      // If access is denied, we should also ensure pageIsLoading is false so the denied message shows
      setPageIsLoading(false);
    }
  }, [authIsLoading, isLoggedIn, user, calculateAnalytics, accessDenied]);


  if (authIsLoading || pageIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando analíticas de rifas...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-semibold">Acceso Denegado</p>
                <p className="text-muted-foreground">Tu plan actual no incluye acceso a esta función.</p>
            </div>
            <PlanLimitDialog
                isOpen={isPlanLimitDialogOpen}
                onOpenChange={setIsPlanLimitDialogOpen}
                featureName="las analíticas de rifas"
            />
        </>
    );
  }

  if (!isLoggedIn || (user?.role !== 'admin' && user?.role !== 'founder')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-semibold">Acceso Denegado</p>
        <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
      </div>
    );
  }

  const getRaffleStatusBadge = (raffle: Raffle) => {
    const drawDate = new Date(raffle.drawDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);

    if (raffle.status === 'completed') {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">Completada</Badge>;
    }
    if (raffle.status === 'cancelled') {
      return <Badge variant="destructive" className="text-xs">Cancelada</Badge>;
    }
    if (drawDate < today && (raffle.status === 'active' || raffle.status === 'pending_draw')) {
      return <Badge variant="secondary" className="bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90 text-xs">Pendiente Sorteo</Badge>;
    }
    if (raffle.status === 'active') {
      return <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Activa</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Desconocido</Badge>;
  };

  return (
    <div>
      <SectionTitle className="flex items-center">
        <BarChartIconLucide className="mr-3 h-7 w-7 text-primary" /> Analíticas de Rifas
      </SectionTitle>

      {analyticsData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analyticsData.map((data) => {
            const paymentChartData = [
              { name: 'Confirmados', value: data.paymentStatusCounts.confirmed, fill: 'hsl(var(--chart-2))' },
              { name: 'Pendientes', value: data.paymentStatusCounts.pending, fill: 'hsl(var(--chart-3))' },
              { name: 'Rechazados', value: data.paymentStatusCounts.rejected, fill: 'hsl(var(--chart-5))' },
            ];

            return (
            <Card key={data.raffle.id} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-lg text-foreground line-clamp-2 flex-grow pr-2">{data.raffle.name}</CardTitle>
                    {getRaffleStatusBadge(data.raffle)}
                </div>
                <CardDescription className="text-xs">
                  Sorteo: {new Date(data.raffle.drawDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })} |
                  Precio: ${data.raffle.pricePerTicket}
                </CardDescription>
                {user?.role === 'founder' && data.raffle.creatorUsername && (
                    <CardDescription className="text-xs italic pt-0.5">
                        Creador: {data.raffle.creatorUsername}
                    </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-secondary/30 rounded-md">
                    <p className="text-xs text-muted-foreground flex items-center"><ListChecks className="mr-1.5 h-3.5 w-3.5"/>Boletos Vendidos (Conf.)</p>
                    <p className="text-xl font-bold text-primary">{data.totalConfirmedTickets}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-md">
                    <p className="text-xs text-muted-foreground flex items-center"><DollarSign className="mr-1.5 h-3.5 w-3.5"/>Ingresos Estimados</p>
                    <p className="text-xl font-bold text-primary">${data.estimatedIncome.toFixed(2)}</p>
                  </div>
                </div>

                {(data.paymentStatusCounts.pending > 0 || data.paymentStatusCounts.rejected > 0) && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-yellow-500/10 rounded-md border border-yellow-500/30">
                      <p className="text-xs text-yellow-700 flex items-center"><Clock className="mr-1.5 h-3.5 w-3.5"/>Boletos Pendientes</p>
                      <p className="text-base font-semibold text-yellow-800">{data.pendingTickets}</p>
                    </div>
                    <div className="p-2 bg-red-500/10 rounded-md border border-red-500/30">
                      <p className="text-xs text-red-700 flex items-center"><XCircle className="mr-1.5 h-3.5 w-3.5"/>Boletos Rechazados</p>
                      <p className="text-base font-semibold text-red-800">{data.rejectedTickets}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Estado de Pagos (Participaciones)</h4>
                  {(data.paymentStatusCounts.confirmed + data.paymentStatusCounts.pending + data.paymentStatusCounts.rejected) > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChartComponent data={paymentChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                           <XAxis type="number" hide />
                           <YAxis type="category" dataKey="name" hide />
                           <RechartsTooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent hideIndicator />}
                           />
                          <Bar dataKey="value" radius={5} />
                        </RechartsBarChartComponent>
                      </ResponsiveContainer>
                    </ChartContainer>
                   ) : (
                     <p className="text-xs text-muted-foreground italic">No hay datos de pagos de participaciones para esta rifa.</p>
                   )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1 text-foreground">Números Más Elegidos (Top 5)</h4>
                  {data.mostChosenNumbers.length > 0 ? (
                    <ul className="space-y-1 text-xs">
                      {data.mostChosenNumbers.map(item => (
                        <li key={item.number} className="flex justify-between items-center p-1.5 bg-muted/50 rounded">
                          <span>Número: <Badge variant="outline" className="text-xs">{item.number}</Badge></span>
                          <span>Elegido: <Badge variant="secondary" className="text-xs">{item.count} {item.count === 1 ? 'vez' : 'veces'}</Badge></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No hay números elegidos aún o no hay participaciones confirmadas.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <Inbox className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            No hay datos de analíticas disponibles.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.role === 'admin' ? 'Asegúrate de haber creado rifas y que tengan participaciones.' : 'No hay rifas en la plataforma para analizar.'}
          </p>
        </div>
      )}
    </div>
  );
}
