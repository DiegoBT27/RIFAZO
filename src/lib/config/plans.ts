
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
  includesDetailedAnalytics: boolean; 
  includesFeaturedListing: boolean;
  includesAiReceiptValidation: boolean;
  includesAutomatedBackups: boolean; 
  includesActivityLog: boolean;
  includesBackupRestore: boolean; 
  includesExclusiveSupport: boolean;

  featureListIds: string[];
  tagline: string;
}

export const ALL_PLAN_FEATURES_DEFINITIONS: PlanFeatureItem[] = [
  { id: 'raffleLimit', text: "Límite de rifas activas" }, // Texto genérico, se especializa en getFeatureStatus
  { id: 'ticketLimit', text: "Límite de boletos por rifa" }, // Texto genérico
  { id: 'editRaffles', text: "Edición de rifas" },
  { id: 'basicStats', text: "Ver estadísticas básicas" },
  { id: 'whatsappIntegration', text: "Contactar por WhatsApp" },
  { id: 'downloadLists', text: "Descarga de listas" },
  { id: 'publicProfile', text: "Perfil público visible" },
  { id: 'publicRatingsVisible', text: "Calificaciones públicas visibles" },
  { id: 'manualPaymentConfirmation', text: "Gestionar pagos" },
  { id: 'customImagePerRaffle', text: "Imagen personalizada" },
  { id: 'detailedStats', text: "Estadísticas detalladas" }, // Usado internamente para pro
  { id: 'analyticsAccess', text: "Acceso a Analíticas Avanzadas" },
  { id: 'featuredListing', text: "Rifas destacadas" },
  { id: 'aiReceiptValidation', text: "Validación IA de recibos" },
  { id: 'automatedBackups', text: "Copias de seguridad automáticas" },
  { id: 'backupRestoreAccess', text: "Respaldo y Restauración de datos" },
  { id: 'activityLogAccess', text: "Panel de actividad" },
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
    includesDetailedAnalytics: false,
    includesFeaturedListing: false,
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesBackupRestore: false, 
    includesExclusiveSupport: false,
    featureListIds: [
      // Incluidas
      'raffleLimit',
      'ticketLimit',
      'manualPaymentConfirmation',
      'basicStats', 
      'whatsappIntegration',
      'downloadLists',
      'publicProfile',
      // No incluidas (el texto se definirá en getFeatureStatus)
      'editRaffles',
      'customImagePerRaffle',
      'featuredListing',
      'analyticsAccess', 
      'backupRestoreAccess',
      'activityLogAccess',
    ],
    tagline: "Ideal para probar. Crea hasta 2 rifas, gestiona pagos, registra ganadores y accede a estadísticas básicas.",
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
    includesDetailedAnalytics: false, 
    includesFeaturedListing: true, 
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesBackupRestore: false,
    includesExclusiveSupport: false,
    featureListIds: [
      'raffleLimit',
      'ticketLimit',
      'editRaffles',
      'customImagePerRaffle',
      'basicStats', 
      'whatsappIntegration',
      'downloadLists',
      'publicProfile', 
      'manualPaymentConfirmation',
      'featuredListing',
      'analyticsAccess', // No incluido
      'backupRestoreAccess', // No incluido
      'activityLogAccess', // No incluido
      'aiReceiptValidation', // No incluido
      'exclusiveSupport', // No incluido
    ],
    tagline: "Más control y personalización, con edición limitada de rifas e imágenes propias.",
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
    includesDetailedAnalytics: true,
    includesFeaturedListing: true,
    includesAiReceiptValidation: true,
    includesAutomatedBackups: true, 
    includesActivityLog: true,
    includesBackupRestore: true, 
    includesExclusiveSupport: true,
    featureListIds: [
      'raffleLimit',
      'ticketLimit',
      'editRaffles',
      'customImagePerRaffle',
      'analyticsAccess', 
      'whatsappIntegration',
      'downloadLists',
      'publicProfile',
      'publicRatingsVisible', 
      'manualPaymentConfirmation',
      'aiReceiptValidation',
      'featuredListing',
      'automatedBackups',
      'backupRestoreAccess', 
      'activityLogAccess',
      'exclusiveSupport',
    ],
    tagline: "La solución completa para profesionales: sin límites, con IA y soporte prioritario.",
  },
};

export const PLAN_NAMES_ORDERED: PlanName[] = ['free', 'standard', 'pro'];

export const getFeatureStatus = (featureId: string, plan: PlanDetails): { included: boolean; text: string } => {
  let included = false;
  let text = ALL_PLAN_FEATURES_DEFINITIONS.find(f => f.id === featureId)?.text || featureId;

  switch (featureId) {
    // --- CARACTERÍSTICAS INCLUIDAS POR DEFECTO O CON LÓGICA ESPECIAL ---
    case 'raffleLimit':
      included = plan.raffleLimit > 0 || plan.raffleLimit === Infinity;
      if (plan.name === 'free') text = "Crear hasta 2 rifas activas";
      else if (plan.name === 'standard') text = "Crear hasta 10 rifas activas";
      else if (plan.name === 'pro') text = "Rifas activas ilimitadas";
      break;
    case 'ticketLimit':
      included = plan.maxTicketsPerRaffle > 0 || plan.maxTicketsPerRaffle === Infinity;
      if (plan.name === 'free') text = "Hasta 50 boletos por rifa";
      else if (plan.name === 'standard') text = "Hasta 100 boletos por rifa";
      else if (plan.name === 'pro') text = "Boletos ilimitados por rifa";
      break;
    case 'manualPaymentConfirmation':
      included = true; text = "Gestionar pagos (confirmar/rechazar)";
      break;
    case 'basicStats':
      included = plan.includesAdvancedStats; // Todos los planes tienen al menos esto
      text = "Ver estadísticas básicas de participación";
      break;
    case 'whatsappIntegration':
      included = true; text = "Contactar participantes por WhatsApp";
      break;
    case 'downloadLists':
      included = true; text = "Descarga de lista de boletos y participantes";
      break;
    case 'publicProfile':
      included = true;
      text = plan.canDisplayRatingsPublicly ? "Perfil público con calificación visible" : "Perfil público visible (sin calificación)";
      break;

    // --- CARACTERÍSTICAS CON LÓGICA DE INCLUSIÓN ESPECÍFICA DEL PLAN ---
    case 'editRaffles':
      included = !!plan.canEditRaffles;
      if (plan.name === 'free') text = "Edición de rifas no disponible";
      else if (plan.name === 'standard') text = `Edición limitada a ${plan.editRaffleLimit || 0} rifas propias`;
      else if (plan.name === 'pro') text = "Edición completa de rifas";
      break;
    case 'customImagePerRaffle':
      included = plan.includesCustomImage;
      text = plan.includesCustomImage ? "Imagen personalizada en cada rifa" : "Imagen Personalizada no disponible";
      break;
    case 'featuredListing':
      included = plan.includesFeaturedListing;
      text = plan.includesFeaturedListing ? "Posicionamiento preferencial de rifas" : "Rifas no aparecen como destacadas";
      break;
    case 'analyticsAccess':
      included = plan.includesDetailedAnalytics;
      text = plan.includesDetailedAnalytics ? "Acceso al panel de analíticas detallado" : "Estadísticas avanzadas no disponibles";
      break;
    case 'backupRestoreAccess':
      included = plan.includesBackupRestore;
      text = plan.includesBackupRestore ? "Respaldo y Restauración de datos" : "Respaldo de datos no disponible";
      break;
    case 'activityLogAccess':
      included = plan.includesActivityLog;
      text = plan.includesActivityLog ? "Acceso a Registro de Actividad" : "Panel de actividad no disponible";
      break;
    
    // Para PRO específicamente o características booleanas directas
    case 'publicRatingsVisible': included = plan.canDisplayRatingsPublicly; break;
    case 'aiReceiptValidation': included = plan.includesAiReceiptValidation; break;
    case 'automatedBackups': included = plan.includesAutomatedBackups; break;
    case 'exclusiveSupport': included = plan.includesExclusiveSupport; break;
    case 'detailedStats': included = plan.includesDetailedAnalytics; break; // Mapeo para consistencia si se usa este ID

    default:
      // Intenta inferir para otras características booleanas si no están en los casos anteriores
      const propName = `includes${featureId.charAt(0).toUpperCase() + featureId.slice(1).replace(/Access$/, '')}`;
      if (propName in plan && typeof (plan as any)[propName] === 'boolean') {
        included = (plan as any)[propName] as boolean;
      } else {
        // Si no se encuentra, se asume no incluida para evitar mostrarla como tal por error.
        // Esto podría pasar si un ID en featureListIds no tiene un caso aquí.
        console.warn(`[PlanConfig] Feature ID '${featureId}' no tiene lógica de inclusión explícita en getFeatureStatus. Asumiendo no incluida.`);
        included = false;
        text = `Característica '${featureId}' no definida para este plan`;
      }
  }
  return { included, text };
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
    includesCustomImage: false,
    includesAdvancedStats: false,
    includesDetailedAnalytics: false,
    includesFeaturedListing: false,
    includesAiReceiptValidation: false,
    includesAutomatedBackups: false,
    includesActivityLog: false,
    includesBackupRestore: false,
    includesExclusiveSupport: false,
    featureListIds: [],
    tagline: "Contacta a soporte para activar o renovar un plan.",
  };
}
