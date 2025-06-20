
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
import { useRouter } from 'next/navigation'; // Added for router.push

const ADMIN_WHATSAPP_NUMBER = "584141135956";

export default function PlansPage() {
  const { user } = useAuth();
  const router = useRouter(); // Added for router.push
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

  return (
    <div>
      <SectionTitle className="text-center mb-4">Nuestros Planes para Organizadores</SectionTitle>
      <p className="text-center text-muted-foreground text-xs mb-10 max-w-xl mx-auto">
        Elige el plan que mejor se adapte a tus necesidades para crear y gestionar tus rifas en RIFAZO. Los planes se asignan manualmente por el fundador después de contactar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {PLAN_NAMES_ORDERED.map((planNameKey) => {
          const plan = PLAN_CONFIG[planNameKey];
          const isCurrentUserPlan = user?.plan === plan.name && user?.planActive;
          
          let countdownDisplay = null;
          if (isCurrentUserPlan && user?.planEndDate) {
            if (!isClient) {
              countdownDisplay = <p className="text-xs text-muted-foreground italic mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />Cargando...</p>;
            } else {
              const endDate = new Date(user.planEndDate);
              const now = new Date();
              if (isPast(endDate, now)) {
                countdownDisplay = <p className="text-xs text-destructive font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />Plan vencido</p>;
              } else {
                const daysLeft = differenceInDays(endDate, now);
                if (daysLeft > 0) {
                  countdownDisplay = <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{daysLeft} {daysLeft === 1 ? 'día restante' : 'días restantes'}</p>;
                } else {
                  const hoursLeft = differenceInHours(endDate, now);
                  if (hoursLeft > 0) {
                    countdownDisplay = <p className="text-xs text-yellow-600 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{hoursLeft} {hoursLeft === 1 ? 'hora restante' : 'horas restantes'}</p>;
                  } else {
                    const minutesLeft = differenceInMinutes(endDate, now);
                    countdownDisplay = <p className="text-xs text-orange-500 font-semibold mt-1.5 flex items-center justify-center"><Clock className="h-3.5 w-3.5 mr-1" />{minutesLeft > 0 ? `${minutesLeft} ${minutesLeft === 1 ? 'minuto restante' : 'minutos restantes'}` : 'Vence muy pronto / Vencido'}</p>;
                  }
                }
              }
            }
          }

          const isContratarButton = !(isCurrentUserPlan && plan.name !== 'free');
          let buttonText = "CONTRATAR"; // Default
          if (isCurrentUserPlan && plan.name !== 'free') {
            buttonText = "Ya tienes este plan";
          } else if (plan.name === 'free') {
            buttonText = "GRATIS";
          } else if (plan.name === 'standard') {
            buttonText = "2$ Semanal";
          } else if (plan.name === 'pro') {
            buttonText = "5$ por 30 días";
          }
          if (isCurrentUserPlan && plan.name === 'free') {
            buttonText = "GRATIS (Tu Plan Actual)";
          }


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
                {countdownDisplay}
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-0">
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                   <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                   Duración del plan: <span className="font-medium text-foreground ml-1">{plan.durationDays} días</span>
                </div>
                
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {plan.featureListIds.map((featureId, index) => {
                    const status = getFeatureStatus(featureId, plan);
                    return (
                      <li key={`${plan.name}-${featureId}-${index}`} className="flex items-start">
                        {status.included ? (
                          <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={cn(
                          "flex-grow",
                          !status.included && "line-through"
                        )}>
                          {status.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground italic mt-4 pt-3 border-t border-dashed">{plan.tagline}</p>
              </CardContent>
              <CardFooter>
                <Button
                  className={cn(
                    "w-full",
                    isContratarButton && "bg-accent hover:bg-accent/90 text-accent-foreground"
                  )}
                  onClick={() => handleContactToHire(plan.displayName)}
                  disabled={isCurrentUserPlan && plan.name !== 'free'}
                  variant={isContratarButton ? 'default' : 'outline'}
                >
                  {buttonText}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
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

