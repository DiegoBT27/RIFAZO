
export interface PaymentMethodField {
  id: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'textarea'; 
  maxLength?: number;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  category: string;
  detailType?: 'specificFields' | 'generic' | 'none' | 'freeformText'; 
  fields?: PaymentMethodField[];
  placeholder?: string; 
}

export const AVAILABLE_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'pagoMovil',
    name: 'Pago Móvil',
    category: 'Nacionales',
    detailType: 'specificFields',
    fields: [
      { id: 'ci', label: 'Cédula del Titular', placeholder: 'V-12345678' },
      { id: 'phone', label: 'Celular del Titular', placeholder: '04XX-1234567', type: 'tel' },
      { id: 'bank', label: 'Banco del Titular', placeholder: 'Ej: Mercantil' },
    ],
  },
  { 
    id: 'efectivoUSD', 
    name: 'Efectivo (USD)', 
    category: 'Nacionales',
    detailType: 'none',
  },
  {
    id: 'zinli',
    name: 'Zinli',
    category: 'Internacionales',
    detailType: 'generic',
    placeholder: 'Ingresa tu correo o usuario Zinli',
  },
  {
    id: 'otro',
    name: 'Otro Método (describir abajo)', // Name shown in checkbox list
    category: 'Otros',
    detailType: 'freeformText',
    placeholder: 'Ej: Transferencia al Banco ABC, Cta. Corriente Nro. 123..., a nombre de X, CI: V-123. O: Contáctame para acordar método de pago.',
  },
];

export const PAYMENT_METHOD_CATEGORIES = Array.from(new Set(AVAILABLE_PAYMENT_METHODS.map(pm => pm.category)));

export function getPaymentMethodsByCategory() {
  const grouped: Record<string, PaymentMethodOption[]> = {};
  PAYMENT_METHOD_CATEGORIES.forEach(category => {
    grouped[category] = AVAILABLE_PAYMENT_METHODS.filter(pm => pm.category === category);
  });
  return grouped;
}
