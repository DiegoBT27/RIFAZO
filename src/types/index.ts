
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
  pricePerTicket: number;
  totalNumbers: number;
  soldNumbers: number[];
  prize: string;
  acceptedPaymentMethods?: AcceptedPaymentMethod[];
  creatorUsername?: string;
  effectiveSoldNumbers?: number[];
  lotteryName?: string | null;
  drawTime?: string | null;
  winningNumber?: number | null;
  winnerName?: string | null;
  winnerPhone?: string | null; // Nuevo campo para el teléfono del ganador
  status?: 'active' | 'pending_draw' | 'completed' | 'cancelled';
}

export interface RaffleResult {
  id: string; // Firestore ID
  raffleId: string; // ID de la rifa original
  raffleName: string;
  winningNumber: number;
  winnerName?: string | null;
  winnerPhone?: string | null; // Nuevo campo para el teléfono del ganador
  drawDate: string; // Fecha en que se realizó el sorteo (de la rifa original)
  prize: string; // Premio otorgado (de la rifa original)
  creatorUsername?: string; // Username del creador de la rifa
}

export interface Participation {
  id: string;
  raffleId: string;
  raffleName: string;
  creatorUsername?: string;
  participantUsername?: string;
  numbers: number[];
  paymentStatus: 'pending' | 'confirmed' | 'rejected';
  purchaseDate: string; // ISO Date string
  participantName?: string;
  participantLastName?: string;
  participantIdCard?: string;
  participantPhone?: string;
  paymentNotes?: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  role: 'user' | 'admin' | 'founder';
  password?: string;
  
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
}
