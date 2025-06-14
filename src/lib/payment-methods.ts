
export interface PaymentMethodOption {
  id: string;
  name: string;
  category: string;
}

export const AVAILABLE_PAYMENT_METHODS: PaymentMethodOption[] = [
  // Nacionales
  { id: 'pagoMovil', name: 'Pago Móvil', category: 'Nacionales' },
  { id: 'transferenciaBancaria', name: 'Transferencia Bancaria', category: 'Nacionales' },
  { id: 'depositoBancario', name: 'Depósito Bancario', category: 'Nacionales' },
  // Internacionales
  { id: 'zelle', name: 'Zelle', category: 'Internacionales' },
  { id: 'paypal', name: 'PayPal', category: 'Internacionales' },
  { id: 'zinli', name: 'Zinli', category: 'Internacionales' },
  { id: 'binancePay', name: 'Binance Pay', category: 'Internacionales' },
  { id: 'airtm', name: 'Airtm', category: 'Internacionales' },
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
