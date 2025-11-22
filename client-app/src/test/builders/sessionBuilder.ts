import { Session } from '@/types';

export class SessionBuilder {
  private session: Partial<Session> = {
    id: 'test-session-123',
    vendingMachineId: 'machine_001',
    status: 'active',
    basket: [],
    payments: [],
    totalAmount: 0,
    dispensedItems: [],
    qrCodeData: 'QR-test-session-123',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from now
    extendedCount: 0,
  };

  withId(id: string): this {
    this.session.id = id;
    return this;
  }

  withStatus(status: 'active' | 'completed' | 'expired' | 'cancelled'): this {
    this.session.status = status;
    return this;
  }

  withBasket(items: Array<{ productId: string; productName: string; quantity: number; price: number; slot: number }>): this {
    this.session.basket = items;
    this.session.totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return this;
  }

  withPayment(payment: { transactionId: string; amount: number; method: string; timestamp: Date }): this {
    this.session.payments = [payment];
    return this;
  }

  expired(): this {
    this.session.status = 'expired';
    this.session.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
    return this;
  }

  completed(): this {
    this.session.status = 'completed';
    this.session.completedAt = new Date();
    return this;
  }

  extended(): this {
    this.session.extendedCount = 1;
    this.session.expiresAt = new Date(Date.now() + 3 * 60 * 1000); // Extended by 3 more minutes
    return this;
  }

  build(): Session {
    return this.session as Session;
  }
}
