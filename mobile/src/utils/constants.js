// Constantes da aplicação mobile

export const COLORS = {
  primary: '#0E76FF',
  secondary: '#6C757D',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

export const SIZES = {
  base: 8,
  font: 14,
  radius: 12,
  padding: 16,
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 16,
  body: 14,
  small: 12,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  semibold: 'System',
};

// Backend API URL
export const API_URL = 'https://videoconnect-3.preview.emergentagent.com/api';

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk';

// Firebase Cloud Messaging Key
export const FCM_SERVER_KEY = 'BEnfXoF8HRs7W6xx6TehPmTILSki_K9pnnnAlnL94tcraFGSBrQFEwLetP-ZTYkeUuO16LRNtg-vb2fEMQjukTw';

// Stripe Publishable Key
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SIvQJRvLMnnPOKkBnkcMjqTkBCWRjiv2Yzaq7JeNQdTvBxWFldvuIBjfOJ4Ba5FbPcupRDQxAt7bv3AdQLOYYAI007s5wDA8s';

// WebSocket URL
export const WS_URL = 'wss://videotalent-1.preview.emergentagent.com/api/ws';

// Categorias de Jobs
export const JOB_CATEGORIES = [
  { value: 'evento', label: 'Evento' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'casamento', label: 'Casamento' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'produto', label: 'Produto' },
  { value: 'imovel', label: 'Imóvel' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'documentario', label: 'Documentário' },
  { value: 'outro', label: 'Outro' },
];

// Extras disponíveis
export const EXTRAS = [
  { value: 'edicao_basica', label: 'Edição Básica', price: 50 },
  { value: 'edicao_avancada', label: 'Edição Avançada', price: 150 },
  { value: 'drone', label: 'Drone', price: 100 },
  { value: 'equipamento_especial', label: 'Equipamento Especial', price: 80 },
  { value: 'iluminacao_profissional', label: 'Iluminação Profissional', price: 120 },
  { value: 'audio_profissional', label: 'Áudio Profissional', price: 90 },
];

// Status de Jobs
export const JOB_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Status de Propostas
export const PROPOSAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

// Status de Pagamentos
export const PAYMENT_STATUS = {
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
};
