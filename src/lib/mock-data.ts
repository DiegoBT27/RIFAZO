
import type { Raffle, RaffleResult, Participation, ManagedUser } from '@/types';

// Base profile for the founder
const fundadorProfileBase = {
  organizerType: 'individual' as 'individual' | 'company',
  fullName: 'Fundador Principal',
  publicAlias: 'RIFAZO_Fundador',
  whatsappNumber: '+1234567890',
  locationState: 'Distrito Capital',
  locationCity: 'Caracas',
  email: 'fundador@rifazo.app',
  bio: 'El creador y fundador de la plataforma RIFAZO. Comprometido con rifas justas y emocionantes.',
  adminPaymentMethodsInfo: 'Acepto todos los métodos de pago principales. ¡Contacta para más detalles!',
};

// Initial platform users to seed Firestore if empty
export const initialPlatformUsers: Omit<ManagedUser, 'id'>[] = [
  {
    username: 'fundador',
    password: '27978916', // Keep the original password
    role: 'founder',
    isBlocked: false,
    ...fundadorProfileBase,
  },
];

// Initialize mockRaffles array - now empty
export const mockRaffles: Raffle[] = [];

// These were already empty but kept for structure
export const mockRaffleResults: RaffleResult[] = [];
export const mockParticipations: Participation[] = [];
