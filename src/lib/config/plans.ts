
import type { PlanName } from '@/types';

export interface PlanFeatureItem {
  id: string;
  text: string;
}

export interface PlanDetails {
  name: PlanName;
  displayName: string;
  durationDays: number;
  raffleLimit: number | Infinity;
  maxTicketsPerRaffle: number | Infinity;
  canEditRaffles: boolean | 'own' | 'limited';
  editRaffleLimit?: number;
  canDisplayRatingsPublicly: boolean;

  includesCustomImage: boolean;
  includesAdvancedStats: boolean;
  includesDetailedAnalytics: boolean; // Controls access to /admin/raffle-analytics
  includesFeaturedListing: boolean;
  includesAiReceiptValidation: boolean;
  includesAutomatedBackups: boolean;
  includesActivityLog: boolean;
  includesExclusiveSupport: boolean;

  featureListIds: string[];
  tagline: string;
}

export const ALL_PLAN_FEATURES_DEFINITIONS: PlanFeatureItem[] = [
  { id: 'raffleLimit', text: "Límite de rifas activas" },
  { id: 'ticketLimit', text: "Límite de boletos por rifa" },
  { id: 'editRaffles', text: "Edición de rifas" },
  { id: 'basicStats', text: "Acceso a estadísticas básicas de participación" },
  { id: 'whatsappIntegration', text: "Integración con WhatsApp para contactar participantes" },
  { id: 'downloadLists', text: "Descarga de lista de boletos y comprobantes" },
  { id: 'publicProfile', text: "Perfil público del organizador visible" },
  { id: 'publicRatingsVisible', text: "Visibilidad de calificaciones públicas" },
  { id: 'manualPaymentConfirmation', text: "Permite confirmar o rechazar pagos manuales" },
  { id: 'customImagePerRaffle', text: "Imagen personalizada en cada rifa" },
  { id: 'detailedStats', text: "Estadísticas detalladas y filtros avanzados" }, // Different from the analytics page
  { id: 'analyticsAccess', text: "Acceso al panel de analíticas de rifas detallado" },
  { id: 'featuredListing', text: "Posicionamiento preferencial en la lista de rifas" },
  { id: 'aiReceiptValidation', text: "Acceso a funciones con IA para validación de recibos" },
  { id: 'automatedBackups', text: "Copias de seguridad automáticas (datos de tus rifas)" },
  { id: 'activityLogAccess', text: "Registro de actividad en su cuenta" },
  { id: 'exclusiveSupport', text: "Soporte exclusivo 1 a 1" },
];

export const PLAN_CONFIG: Record<PlanName, PlanDetails> = {
  free: {
    name: 'free',
    displayName: 'Gratis',
    durationDays: 7,
    raffleLimit: 2,
    maxTicketsPerRaffle: 50,
    canEditRaffles: false,
    canDisplayRatingsPublicly: false,
    includesCustomImage: false,
    includesAdvancedStats: true,
    includesDetailedAnalytics: false, // Free plan does NOT include detailed analytics page
    includesFeaturedListing: false,
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesExclusiveSupport: false,
    featureListIds: [
      'raffleLimit',
      'ticketLimit',
      'editRaffles',
      'basicStats',
      'whatsappIntegration',
      'downloadLists',
      'publicProfile',
      'publicRatingsVisible',
      'manualPaymentConfirmation'
    ],
    tagline: "Ideal para probar la plataforma sin compromiso. Suficiente para completar tus primeras rifas.",
  },
  standard: {
    name: 'standard',
    displayName: 'Estándar',
    durationDays: 7,
    raffleLimit: 10,
    maxTicketsPerRaffle: 100,
    canEditRaffles: 'limited',
    editRaffleLimit: 5,
    canDisplayRatingsPublicly: false,
    includesCustomImage: true,
    includesAdvancedStats: true,
    includesDetailedAnalytics: false, // Standard plan does NOT include detailed analytics page
    includesFeaturedListing: false,
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesExclusiveSupport: false,
    featureListIds: [
      'raffleLimit',
      'ticketLimit',
      'editRaffles',
      'customImagePerRaffle',
      // 'detailedStats', // Removed as per request
      'whatsappIntegration',
      'downloadLists',
      'publicProfile',
      'publicRatingsVisible',
      'manualPaymentConfirmation',
      'featuredListing',
    ],
    tagline: "Recomendado para rifadores activos que desean más control y personalización sin ir al límite.",
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    durationDays: 30,
    raffleLimit: Infinity,
    maxTicketsPerRaffle: Infinity,
    canEditRaffles: true,
    canDisplayRatingsPublicly: true,
    includesCustomImage: true,
    includesAdvancedStats: true,
    includesDetailedAnalytics: true, // Pro plan DOES include detailed analytics page
    includesFeaturedListing: true,
    includesAiReceiptValidation: true,
    includesAutomatedBackups: true,
    includesActivityLog: true,
    includesExclusiveSupport: true,
    featureListIds: [
      'raffleLimit',
      'ticketLimit',
      'editRaffles',
      'customImagePerRaffle',
      'detailedStats', // This feature remains for Pro
      'analyticsAccess', // Feature ID for the detailed analytics page
      'whatsappIntegration',
      'downloadLists',
      'publicProfile',
      'publicRatingsVisible', // Pro can display ratings
      'manualPaymentConfirmation',
      'aiReceiptValidation',
      'featuredListing',
      'automatedBackups',
      'activityLogAccess',
      'exclusiveSupport',
    ],
    tagline: "La solución más completa para profesionales de las rifas.",
  },
};

export const PLAN_NAMES_ORDERED: PlanName[] = ['free', 'standard', 'pro'];

export const getFeatureStatus = (featureId: string, plan: PlanDetails): { included: boolean; text: string } => {
  let included = false;
  let text = ALL_PLAN_FEATURES_DEFINITIONS.find(f => f.id === featureId)?.text || featureId;

  switch (featureId) {
    case 'raffleLimit':
      included = plan.raffleLimit > 0 || plan.raffleLimit === Infinity;
      if (plan.name === 'free') text = "Hasta 2 rifas activas simultáneamente";
      else if (plan.name === 'standard') text = "Hasta 10 rifas activas al mismo tiempo";
      else if (plan.name === 'pro') text = "Rifas activas ilimitadas";
      break;
    case 'ticketLimit':
      included = plan.maxTicketsPerRaffle > 0 || plan.maxTicketsPerRaffle === Infinity;
      if (plan.name === 'free') text = "50 boletos por rifa como máximo";
      else if (plan.name === 'standard') text = "100 boletos por rifa";
      else if (plan.name === 'pro') text = "Boletos ilimitados por rifa";
      break;
    case 'editRaffles':
      included = !!plan.canEditRaffles;
      if (plan.name === 'free') text = "Edición de rifas no disponible";
      else if (plan.name === 'standard') text = `Edición habilitada para hasta ${plan.editRaffleLimit || 0} rifas propias`;
      else if (plan.name === 'pro') text = "Edición completa de todas sus rifas";
      break;
    case 'basicStats':
      included = plan.includesAdvancedStats; // Assuming basic stats are part of advanced stats logic
      text = "Acceso a estadísticas básicas de participación";
      break;
    case 'detailedStats':
      included = plan.includesAdvancedStats; // Controlled by the flag
      if (plan.name === 'pro') text = "Estadísticas completas y filtros avanzados";
      else text = "Estadísticas detalladas y filtros avanzados"; // Default text if not pro, though it shouldn't be listed
      break;
    case 'analyticsAccess':
      included = plan.includesDetailedAnalytics; // Driven by the flag
      text = "Acceso al panel de analíticas de rifas detallado";
      break;
    case 'publicProfile':
      included = true; // All plans have a public profile
      if (plan.canDisplayRatingsPublicly) text = "Perfil público destacado y calificación visible";
      else text = "Perfil público del organizador visible (sin calificación)";
      break;
    case 'publicRatingsVisible':
      included = plan.canDisplayRatingsPublicly;
      if (plan.canDisplayRatingsPublicly) text = "Calificaciones públicas visibles en perfil";
      else text = "Calificaciones públicas no visibles en perfil";
      break;
    case 'customImagePerRaffle':
      included = plan.includesCustomImage;
      text = "Imagen personalizada en cada rifa";
      break;
    case 'featuredListing':
      included = plan.includesFeaturedListing;
      if (plan.includesFeaturedListing) text = "Posicionamiento preferencial en la lista de rifas";
      else text = "Rifas no aparecen como destacadas o en prioridad";
      break;
    case 'aiReceiptValidation':
      included = plan.includesAiReceiptValidation;
      if (plan.includesAiReceiptValidation) text = "Acceso a funciones con IA para validación de recibos";
      else text = "Validación de recibos con IA no incluida";
      break;
    case 'automatedBackups':
      included = plan.includesAutomatedBackups;
      text = "Copias de seguridad automáticas (datos de tus rifas)";
      break;
    case 'activityLogAccess':
      included = plan.includesActivityLog;
      text = "Registro de actividad en su cuenta";
      break;
    case 'exclusiveSupport':
      included = plan.includesExclusiveSupport;
      text = "Soporte exclusivo 1 a 1";
      break;
    case 'whatsappIntegration':
      included = true; // Assuming all plans have this
      text = "Integración con WhatsApp para contactar participantes";
      break;
    case 'downloadLists':
      included = true; // Assuming all plans have this
      text = "Descarga de lista de boletos y participantes";
      break;
    case 'manualPaymentConfirmation':
      included = true; // Assuming all plans have this
      text = "Permite confirmar o rechazar pagos manuales";
      break;
    default:
      const featureDef = ALL_PLAN_FEATURES_DEFINITIONS.find(f => f.id === featureId);
      if (featureDef) {
        text = featureDef.text;
        // Generic way to check boolean flags starting with "includes"
        const propName = `includes${featureId.charAt(0).toUpperCase() + featureId.slice(1)}`;
        if (propName in plan && typeof (plan as any)[propName] === 'boolean') {
          included = (plan as any)[propName] as boolean;
        } else {
          // Fallback for other types of features or if naming convention isn't "includes"
          // This part might need more specific logic if features are very diverse
          included = false; 
        }
      } else {
        included = false;
        text = featureId; // Fallback to featureId if no definition found
      }
  }
  return { included, text };
};

export function getPlanDetails(planName?: PlanName | null): PlanDetails {
  if (planName && PLAN_CONFIG[planName]) {
    return PLAN_CONFIG[planName];
  }
  // Default "empty" plan details for users without an active plan or if plan is unrecognized
  return {
    name: 'free', // Default to 'free' or a specific "no plan" identifier if preferred
    displayName: 'Sin Plan / Vencido',
    durationDays: 0,
    raffleLimit: 0,
    maxTicketsPerRaffle: 0,
    canEditRaffles: false,
    canDisplayRatingsPublicly: false,
    includesCustomImage: false,
    includesAdvancedStats: false,
    includesDetailedAnalytics: false,
    includesFeaturedListing: false,
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesExclusiveSupport: false,
    featureListIds: [],
    tagline: "Contacta a soporte para activar o renovar un plan.",
  };
}

