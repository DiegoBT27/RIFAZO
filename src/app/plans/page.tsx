
'use client';

import { useState, useEffect } from 'react';
import SectionTitle from '@/components/shared/SectionTitle';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PLAN_CONFIG, PLAN_NAMES_ORDERED, getFeatureStatus } from '@/lib/config/plans';
import { Check, X, CalendarDays, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_WHATSAPP_NUMBER = "584141135956";

const PlanCardSkeleton = () => (
  <Card className="flex flex-col shadow-lg">
    <CardHeader className="text-center pb-4">
      <Skeleton className="h-7 w-32 mx-auto" />
      <Skeleton className="h-4 w-24 mx-auto mt-2" />
    </CardHeader>
    <CardContent className="flex-grow space-y-3 pt-0">
      <div className="flex items-center mb-3">
        <Skeleton className="h-5 w-5 rounded-full mr-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-1.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start">
            <Skeleton className="h-5 w-5 rounded-sm mr-2 flex-shrink-0" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="pt-4 mt-4 border-t border-dashed">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4 mt-1" />
      </div>
    </CardContent>
    <CardFooter>
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
);


export default function PlansPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleContactToHire = (planName: string) => {
    const message = encodeURIComponent(
      `¡Hola! Estoy interesado/a en el plan "${planName}" de RIFAZO. ¿Podrían darme más información o ayudarme a activarlo?`
    );
    const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const isLoading = !isClient || authIsLoading;

  return (
    <div>
      <SectionTitle className="text-center mb-4">Nuestros Planes para Organizadores</SectionTitle>
      <p className="text-center text-muted-foreground text-xs mb-10 max-w-xl mx-auto">
        Elige el plan que mejor se adapte a tus necesidades para crear y gestionar tus rifas en RIFAZO. Los planes se asignan manualmente por el fundador después de contactar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {isLoading ? (
          <>
            <PlanCardSkeleton />
            <PlanCardSkeleton />
            <PlanCardSkeleton />
          </>
        ) : (
          PLAN_NAMES_ORDERED.map((planNameKey) => {
            const plan = PLAN_CONFIG[planNameKey];
            
            const isCurrentUserPlan = user?.plan === plan.name && user?.planActive;

            const features = plan.featureListIds
              .map(featureId => getFeatureStatus(featureId, plan))
              .sort((a, b) => (b.included ? 1 : 0) - (a.included ? 1 : 0));

            return (
              <Card key={plan.name} className={cn(
                  "flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300",
                  isCurrentUserPlan ? 'border-2 border-primary ring-2 ring-primary/50' : 'border-border'
                )}>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="font-headline text-2xl text-foreground uppercase">{plan.displayName.toUpperCase()}</CardTitle>
                  {isCurrentUserPlan && (
                    <p className="text-xs text-primary font-semibold mt-1">(Tu Plan Actual)</p>
                  )}
                  
                  {isCurrentUserPlan && user?.planEndDate ? (
                    (() => {
                      const endDate = new Date(user.planEndDate!);
                      if (isPast(endDate)) {
                        return <p className="text-xs text-destructive font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />Plan vencido</p>;
                      }
                      const daysLeft = differenceInDays(endDate, new Date());
                      if (daysLeft > 0) {
                        return <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}</p>;
                      }
                      const hoursLeft = differenceInHours(endDate, new Date());
                      if (hoursLeft > 0) {
                        return <p className="text-xs text-yellow-600 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{hoursLeft} {hoursLeft === 1 ? 'hora restante' : 'horas restantes'}</p>;
                      }
                      const minutesLeft = differenceInMinutes(endDate, new Date());
                      return <p className="text-xs text-orange-500 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{minutesLeft > 0 ? `${minutesLeft} ${minutesLeft === 1 ? 'minuto restante' : 'minutos restantes'}` : 'Vence muy pronto'}</p>;
                    })()
                  ) : (isCurrentUserPlan && <div className="h-[22px] mt-1.5" />)}

                  {user && !user.planActive && user.plan === plan.name && user.planEndDate && isPast(new Date(user.planEndDate)) && (
                    <p className="text-xs text-destructive font-semibold mt-1.5 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />Plan Vencido
                    </p>
                  )}

                </CardHeader>
                <CardContent className="flex-grow space-y-3 pt-0">
                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                    Duración del plan: <span className="font-medium text-foreground ml-1">{plan.durationDays} días</span>
                  </div>
                  
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {features.map((status) => (
                      <li key={`${plan.name}-${status.id}`} className="flex items-start">
                        {status.included ? (
                          <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={cn("flex-grow", !status.included && "line-through text-muted-foreground/70")}>
                          {status.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground italic mt-4 pt-3 border-t border-dashed">{plan.tagline}</p>
                </CardContent>
                <CardFooter>
                  <Button
                    className={cn(
                      "w-full",
                      !(isCurrentUserPlan && plan.name !== 'free') && "bg-accent hover:bg-accent/90 text-accent-foreground"
                    )}
                    onClick={() => handleContactToHire(plan.displayName)}
                    disabled={isCurrentUserPlan && plan.name !== 'free'}
                    variant={(isCurrentUserPlan && plan.name !== 'free') ? 'outline' : 'default'}
                  >
                    {isCurrentUserPlan && plan.name !== 'free' ? 'Ya tienes este plan' :
                    isCurrentUserPlan && plan.name === 'free' ? 'GRATIS (Tu Plan Actual)' :
                    plan.name === 'free' ? 'GRATIS' :
                    plan.name === 'standard' ? '2.5$ por 30 días' :
                    plan.name === 'pro' ? '5$ por 30 días' :
                    'CONTRATAR'
                    }
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
       <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Tienes preguntas sobre los planes o necesitas algo personalizado?
          </p>
          <Button variant="link" className="text-primary" asChild>
            <a href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent("¡Hola! Tengo una consulta sobre los planes de RIFAZO.")}`} target="_blank" rel="noopener noreferrer">
              Contáctanos por WhatsApp
            </a>
          </Button>
        </div>
    </div>
  );
}
