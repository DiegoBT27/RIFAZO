
export interface AcceptedPaymentMethod {
  id: string; 
  name: string; 
  category: string;
  adminProvidedDetails?: string; // Optional: For admin to provide specific details for THIS raffle's payment method
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
}

export interface RaffleResult {
  id: string;
  raffleId: string;
  raffleName: string;
  winningNumber: number;
  winnerName?: string;
  drawDate: string;
  prize: string;
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
