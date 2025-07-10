

export type PlanName = 'free' | 'standard' | 'pro';

export interface Prize {
  description: string;
  lotteryName?: string | null;
  drawTime?: string | null;
}

export interface AcceptedPaymentMethod {
  id: string; 
  name: string; 
  category: string;
  adminProvidedDetails?: string; 
}

export interface Raffle {
  id: string;
  name: string;
  description: string;
  image: string;
  drawDate: string; // YYYY-MM-DD format
  publicationDate?: string | null; // ISO Date string for scheduled publication
  pricePerTicket: number;
  currency: 'USD' | 'Bs';
  totalNumbers: number;
  soldTicketsCount: number;
  confirmedPaymentsCount: number; // New field for data integrity
  minTicketsPerPurchase?: number | null; // Optional minimum tickets
  maxTicketsPerPurchase?: number | null; // Optional maximum tickets
  prizes: Prize[];
  acceptedPaymentMethods?: AcceptedPaymentMethod[];
  creatorUsername?: string;
  winningNumbers?: (number | null)[];
  winnerNames?: (string | null)[];
  winnerPhones?: (string | null)[];
  status: 'active' | 'pending_draw' | 'completed' | 'cancelled' | 'scheduled';
}

export interface RaffleResult {
  id: string; // Firestore ID
  raffleId: string; // ID de la rifa original
  raffleName: string;
  winningNumbers: (number | null)[]; 
  winnerNames?: (string | null)[]; 
  winnerPhones?: (string | null)[]; 
  drawDate: string; // Fecha en que se realizó el sorteo (de la rifa original)
  prizes: Prize[]; 
  creatorUsername?: string; // Username del creador de la rifa
}

export interface Participation {
  id: string;
  raffleId: string;
  raffleName: string;
  creatorUsername?: string;
  participantUsername?: string; // Username of the user who bought the ticket
  numbers: number[];
  paymentStatus: 'pending' | 'confirmed' | 'rejected';
  purchaseDate: string; // ISO Date string
  participantName?: string;
  participantLastName?: string;
  participantIdCard?: string;
  participantPhone?: string;
  paymentNotes?: string;
  userHasRatedOrganizerForRaffle?: boolean; 
}

export interface ManagedUser {
  id: string;
  username: string;
  role: 'user' | 'admin' | 'founder';
  password?: string;
  isBlocked?: boolean; 
  sessionId?: string | null;
  failedLoginAttempts?: number;
  lockoutUntil?: string | null;
  
  organizerType?: 'individual' | 'company';
  publicAlias?: string;
  whatsappNumber?: string;
  locationState?: string;
  locationCity?: string;
  email?: string;
  bio?: string;
  adminPaymentMethodsInfo?: string;

  fullName?: string;

  companyName?: string;
  rif?: string;

  averageRating?: number;
  ratingCount?: number;

  favoriteRaffleIds?: string[];

  // Plan fields
  plan?: PlanName | null;
  planActive?: boolean;
  planStartDate?: string | null; // ISO Date string
  planEndDate?: string | null; // ISO Date string
  planAssignedBy?: string | null; // username of the founder who assigned the plan
  rafflesCreatedThisPeriod?: number;
}

export type ActivityLogActionType = 
  | 'PAYMENT_CONFIRMED' | 'PAYMENT_REJECTED' | 'PARTICIPATION_DELETED'
  | 'RAFFLE_CREATED' | 'RAFFLE_EDITED' | 'RAFFLE_DELETED'
  | 'USER_CREATED' | 'USER_EDITED' | 'USER_DELETED'
  | 'USER_BLOCKED' | 'USER_UNBLOCKED' | 'WINNER_REGISTERED'
  | 'ADMIN_LOGIN' | 'ADMIN_LOGOUT' 
  | 'PROFILE_UPDATED'
  | 'ORGANIZER_RATED'
  | 'ADMIN_PLAN_ASSIGNED'
  | 'ADMIN_PLAN_EXPIRED'
  | 'ADMIN_PLAN_REMOVED' 
  | 'ADMIN_PLAN_SCHEDULED' 
  | 'ADMIN_PLAN_ACTIVATED_SCHEDULED'
  | 'USER_ACCOUNT_UNLOCKED';


export interface ActivityLog {
  id: string; // Firestore ID
  timestamp: any; // Firestore ServerTimestamp, se convertirá a Date al leer
  adminUsername: string; 
  actionType: ActivityLogActionType;
  targetInfo?: string; 
  details?: Record<string, any> | string; 
}

export interface Rating {
  id: string; // Firestore ID
  raffleId: string;
  raffleName: string;
  organizerUsername: string; // Username of the admin being rated
  raterUsername: string; // Username of the user who submitted the rating
  ratingStars: number; // e.g., 1-5
  comment?: string; // Optional comment
  createdAt: any; // Firestore ServerTimestamp
}
