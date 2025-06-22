
import type { PlanName } from '@/types';

export interface PlanDetails {
  name: PlanName;
  displayName: string;
  durationDays: number;
  raffleLimit: number | Infinity;
  maxTicketsPerRaffle: number | Infinity;
  canEditRaffles: boolean;
  canDisplayRatingsPublicly: boolean;
  includesMultiplePrizes: boolean; // New feature

  includesCustomImage: boolean;
  includesAdvancedStats: boolean;
  includesDetailedAnalytics: boolean; 
  includesFeaturedListing: boolean;
  includesBackupRestore: boolean; 
  includesExclusiveSupport: boolean;

  featureListIds: string[];
  tagline: string;
}

// A single, canonical list of feature IDs in a consistent display order.
// This ensures server and client render the same structure, preventing hydration errors.
export const CANONICAL_FEATURE_LIST: string[] = [
  'raffleLimit',
  'ticketLimit',
  'multiplePrizes',
  'editRaffles',
  'saveToFavorites',
  'customImagePerRaffle',
  'featuredListing',
  'publicRatingsVisible',
  'manualPaymentConfirmation',
  'whatsappIntegration',
  'publicProfile',
  'analyticsAccess',
  'backupRestoreAccess',
  'exclusiveSupport',
];


export const PLAN_CONFIG: Record<PlanName, PlanDetails> = {
  free: {
    name: 'free',
    displayName: 'Gratis',
    durationDays: 7,
    raffleLimit: 2,
    maxTicketsPerRaffle: 50,
    canEditRaffles: true,
    canDisplayRatingsPublicly: false,
    includesMultiplePrizes: false,
    includesCustomImage: true,
    includesAdvancedStats: true, 
    includesDetailedAnalytics: false,
    includesFeaturedListing: false,
    includesBackupRestore: false, 
    includesExclusiveSupport: true,
    featureListIds: CANONICAL_FEATURE_LIST,
    tagline: "Ideal para probar. Crea hasta 2 rifas, edítalas, gestiona pagos y accede a estadísticas.",
  },
  standard: {
    name: 'standard',
    displayName: 'Estándar',
    durationDays: 7,
    raffleLimit: 10,
    maxTicketsPerRaffle: 100,
    canEditRaffles: true,
    canDisplayRatingsPublicly: false,
    includesMultiplePrizes: false,
    includesCustomImage: true,
    includesAdvancedStats: true, 
    includesDetailedAnalytics: false, 
    includesFeaturedListing: true, 
    includesBackupRestore: false,
    includesExclusiveSupport: true,
    featureListIds: CANONICAL_FEATURE_LIST,
    tagline: "Más control y personalización, con rifas destacadas e imágenes propias.",
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    durationDays: 30,
    raffleLimit: Infinity,
    maxTicketsPerRaffle: Infinity,
    canEditRaffles: true,
    canDisplayRatingsPublicly: true,
    includesMultiplePrizes: true,
    includesCustomImage: true,
    includesAdvancedStats: true,
    includesDetailedAnalytics: true,
    includesFeaturedListing: true,
    includesBackupRestore: true, 
    includesExclusiveSupport: true,
    featureListIds: CANONICAL_FEATURE_LIST,
    tagline: "La solución completa para profesionales: sin límites y con todas las herramientas avanzadas.",
  },
};

export const PLAN_NAMES_ORDERED: PlanName[] = ['free', 'standard', 'pro'];

// This new function is more explicit and safer against hydration errors.
export const getFeatureStatus = (featureId: string, plan: PlanDetails): { id: string, included: boolean; text: string } => {
  const featureTextMap: Record<string, string> = {
    raffleLimit: plan.raffleLimit === Infinity ? "Rifas activas ilimitadas" : `Crear hasta ${plan.raffleLimit} rifas activas`,
    ticketLimit: plan.maxTicketsPerRaffle === Infinity ? "Boletos ilimitados por rifa" : `Hasta ${plan.maxTicketsPerRaffle} boletos por rifa`,
    multiplePrizes: "Rifas con Múltiples Premios",
    editRaffles: "Edición de rifas creadas",
    saveToFavorites: "Guarda rifas en favoritos",
    customImagePerRaffle: "Imagen personalizada en cada rifa",
    featuredListing: "Posicionamiento preferencial de rifas",
    publicRatingsVisible: "Calificaciones públicas visibles en perfil",
    manualPaymentConfirmation: "Gestionar pagos (confirmar/rechazar)",
    whatsappIntegration: "Contactar participantes por WhatsApp",
    publicProfile: "Perfil público de organizador visible",
    analyticsAccess: "Acceso al panel de analíticas detallado",
    backupRestoreAccess: "Respaldo y Restauración de datos",
    exclusiveSupport: "Soporte 24/7",
  };

  const featureInclusionMap: Record<string, boolean> = {
    raffleLimit: plan.raffleLimit > 0,
    ticketLimit: plan.maxTicketsPerRaffle > 0,
    multiplePrizes: plan.includesMultiplePrizes,
    editRaffles: plan.canEditRaffles,
    saveToFavorites: true,
    customImagePerRaffle: plan.includesCustomImage,
    featuredListing: plan.includesFeaturedListing,
    publicRatingsVisible: plan.canDisplayRatingsPublicly,
    manualPaymentConfirmation: true, // Always included
    whatsappIntegration: true, // Always included
    publicProfile: true, // Always included
    analyticsAccess: plan.includesDetailedAnalytics,
    backupRestoreAccess: plan.includesBackupRestore,
    exclusiveSupport: plan.includesExclusiveSupport,
  };
  
  const included = featureInclusionMap[featureId] ?? false;
  let text = featureTextMap[featureId] || `Característica '${featureId}' no definida`;

  // Special text adjustments for non-included features to be more descriptive
  if (!included) {
    const notIncludedTextMap: Record<string, string> = {
        customImagePerRaffle: "Imagen Personalizada no disponible",
        featuredListing: "Rifas no aparecen como destacadas",
        analyticsAccess: "Analíticas avanzadas no disponibles",
        backupRestoreAccess: "Respaldo de datos no disponible",
        publicRatingsVisible: "Calificaciones públicas no visibles",
        multiplePrizes: "Solo un premio por rifa",
    };
    text = notIncludedTextMap[featureId] || text;
  }

  return { id: featureId, included, text };
};


export function getPlanDetails(planName?: PlanName | null): PlanDetails {
  if (planName && PLAN_CONFIG[planName]) {
    return PLAN_CONFIG[planName];
  }
  return {
    name: 'free', 
    displayName: 'Sin Plan / Vencido',
    durationDays: 0,
    raffleLimit: 0,
    maxTicketsPerRaffle: 0,
    canEditRaffles: false,
    canDisplayRatingsPublicly: false,
    includesMultiplePrizes: false,
    includesCustomImage: false,
    includesAdvancedStats: false,
    includesDetailedAnalytics: false,
    includesFeaturedListing: false,
    includesBackupRestore: false,
    includesExclusiveSupport: false,
    featureListIds: [],
    tagline: "Contacta a soporte para activar o renovar un plan.",
  };
}
