
export interface AdminPagoMovilDetails {
  phone: string;
  ci: string;
  bank: string;
}

export interface AdminPayPalDetails {
  email: string;
}

export interface AdminZinliDetails {
  accountIdentifier: string; // Can be email or username
}

export interface AdminTransferenciaBancariaDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  accountType: 'Ahorro' | 'Corriente' | string; // Allow string for other types if needed
  holderId: string; // CI/RIF
}

export interface AdminZelleDetails {
  associatedName: string;
  emailOrPhone: string;
}

export interface AdminDepositoBancarioDetails {
  instructions: string; // Could include bank, account number, holder, etc.
}

export interface AdminBinancePayDetails {
  identifier: string; // E.g., Pay ID, email, or phone
}

export interface AdminAirtmDetails {
  email: string;
}

export interface AcceptedPaymentMethod {
  id: string;
  name: string;
  category: string;
  adminPagoMovilDetails?: AdminPagoMovilDetails;
  adminPayPalDetails?: AdminPayPalDetails;
  adminZinliDetails?: AdminZinliDetails;
  adminTransferenciaBancariaDetails?: AdminTransferenciaBancariaDetails;
  adminZelleDetails?: AdminZelleDetails;
  adminDepositoBancarioDetails?: AdminDepositoBancarioDetails;
  adminBinancePayDetails?: AdminBinancePayDetails;
  adminAirtmDetails?: AdminAirtmDetails;
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
  effectiveSoldNumbers?: number[]; // Array de números realmente vendidos (LS + mock, sin duplicados, no rechazados)
  lotteryName?: string;
  drawTime?: string;
}

export interface RaffleResult {
  id: string;
  raffleId: string;
  raffleName: string;
  winningNumber: number;
  winnerName?: string; // Optional: if winner is known
  drawDate: string;
  prize: string;
}

export interface Participation {
  id: string;
  raffleId: string;
  raffleName: string;
  creatorUsername?: string; // Username of the raffle creator
  participantUsername?: string; // Username of the user who made the purchase
  numbers: number[];
  paymentStatus: 'pending' | 'confirmed' | 'rejected';
  purchaseDate: string; // ISO Date string
  participantName?: string; // Name provided by user at purchase (for ticket display)
  participantLastName?: string; // Last name provided by user
  participantIdCard?: string; // ID card provided by user
  participantPhone?: string; // Phone provided by user
  paymentNotes?: string; // Optional notes from the user about the payment
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

    