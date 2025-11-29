export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  slot: number;
  price: number; // in cents
  quantity: number;
  vendingMachineId: string;
  category: string;
  isActive: boolean;
  allergens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BasketItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  slot: number;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  timestamp: Date;
  transactionId?: string;
}

export interface DispensedItem {
  productId: string;
  slot: number;
  status: 'pending' | 'dispensed' | 'failed';
  timestamp: Date;
  retryCount?: number;
}

export interface Session {
  id: string;
  vendingMachineId: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  basket: BasketItem[];
  payments: Payment[];
  totalAmount: number;
  dispensedItems: DispensedItem[];
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
  updatedAt?: Date;
  qrCodeData: string;
  extendedCount?: number; // Track how many times session has been extended
}

export type EventType =
  | 'ProductDispatch'
  | 'PaymentReceived'
  | 'SessionCreated'
  | 'SessionExpired'
  | 'DispenseSuccess'
  | 'DispenseFailed'
  | 'StockLow'
  | 'RefundRequested';

// Payload types for different event types
export interface ProductDispatchPayload {
  productId: string;
  productName: string;
  slot: number;
  price: number;
}

export interface PaymentReceivedPayload {
  transactionId: string;
  amount: number;
}

export interface RefundRequestedPayload {
  productId: string;
  productName: string;
  slot: number;
  refundAmount: number;
  reason: string;
}

export interface StockLowPayload {
  productId: string;
  productName?: string;
  quantity: number;
  threshold?: number;
}

export interface SessionPayload {
  sessionId: string;
}

export interface DispenseResultPayload {
  productId: string;
  slot: number;
}

export type EventPayload =
  | ProductDispatchPayload
  | PaymentReceivedPayload
  | RefundRequestedPayload
  | StockLowPayload
  | SessionPayload
  | DispenseResultPayload
  | Record<string, unknown>;

export interface VendingEvent {
  id: string;
  type: EventType;
  sessionId: string;
  vendingMachineId: string;
  payload: EventPayload;
  timestamp: Date;
  processed: boolean;
  sequenceNumber?: number;
}

export interface VendingMachineConfiguration {
  sessionTimeout?: number; // in minutes
  maxRetries?: number;
  enableDropSensor?: boolean;
  lowStockThreshold?: number;
  maintenanceMode?: boolean;
}

export interface VendingMachine {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  currentSessionId?: string;
  lastHeartbeat: Date;
  configuration: VendingMachineConfiguration;
}

export interface AppConfig {
  sessionTimeoutMinutes: number;
  maxRetries: number;
  enableAnalytics: boolean;
  maintenanceMode: boolean;
}

export interface TransactionLog {
  id: string;
  type: 'session_created' | 'basket_updated' | 'payment_completed' | 'product_dispensed' | 'inventory_updated' | 'session_extended' | 'refund_requested';
  userId?: string;
  sessionId?: string;
  vendingMachineId?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
