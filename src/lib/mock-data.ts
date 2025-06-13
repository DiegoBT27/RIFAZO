
import type { Raffle, RaffleResult, Participation, ManagedUser } from '@/types';

// Data will be primarily managed by Firestore. These can be empty.
export const mockRaffles: Raffle[] = [];
export const mockRaffleResults: RaffleResult[] = [];
export const mockParticipations: Participation[] = [];

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
export const initialPlatformUsers: ManagedUser[] = [
  {
    id: 'firestore-fundador-id', // Placeholder ID, Firestore will generate one
    username: 'fundador',
    password: '27978916',
    role: 'founder',
    ...fundadorProfileBase,
  },
  {
    id: 'firestore-user-id', // Placeholder ID
    username: 'user',
    password: 'user',
    role: 'user',
  },
];

    