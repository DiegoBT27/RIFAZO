
import type { AdminPagoMovilDetails } from '@/types';

export interface PaymentMethodOption {
  id: string;
  name: string;
  category: string;
  /** Indicates if this payment method requires specific admin details to be configured. */
  requiresAdminDetails?: 'pagoMovil' | 'paypal' | 'zinli' | 'transferenciaBancaria' | 'zelle' | 'depositoBancario' | 'binancePay' | 'airtm';
}

export const AVAILABLE_PAYMENT_METHODS: PaymentMethodOption[] = [
  // Nacionales
  { id: 'pagoMovil', name: 'Pago Móvil', category: 'Nacionales', requiresAdminDetails: 'pagoMovil' },
  { id: 'transferenciaBancaria', name: 'Transferencia Bancaria', category: 'Nacionales', requiresAdminDetails: 'transferenciaBancaria' },
  { id: 'depositoBancario', name: 'Depósito Bancario', category: 'Nacionales', requiresAdminDetails: 'depositoBancario' },
  // Internacionales
  { id: 'zelle', name: 'Zelle', category: 'Internacionales', requiresAdminDetails: 'zelle' },
  { id: 'paypal', name: 'PayPal', category: 'Internacionales', requiresAdminDetails: 'paypal' },
  { id: 'zinli', name: 'Zinli', category: 'Internacionales', requiresAdminDetails: 'zinli' },
  { id: 'binancePay', name: 'Binance Pay', category: 'Internacionales', requiresAdminDetails: 'binancePay' },
  { id: 'airtm', name: 'Airtm', category: 'Internacionales', requiresAdminDetails: 'airtm' },
  // Otros
  { id: 'efectivoUSD', name: 'Efectivo (USD)', category: 'Otros' },
  { id: 'efectivoBs', name: 'Efectivo (Bs)', category: 'Otros' },
];

export const PAYMENT_METHOD_CATEGORIES = [
  'Nacionales',
  'Internacionales',
  'Otros',
];

export function getPaymentMethodsByCategory() {
  const grouped: Record<string, PaymentMethodOption[]> = {};
  PAYMENT_METHOD_CATEGORIES.forEach(category => {
    grouped[category] = AVAILABLE_PAYMENT_METHODS.filter(pm => pm.category === category);
  });
  return grouped;
}

