import { PaymentRequest } from '@/services/payment.service';

export class PaymentRequestBuilder {
  private request: PaymentRequest = {
    amount: 3500,
    sessionId: 'test-session-123',
    items: [
      {
        name: 'Test Product',
        quantity: 1,
        price: 3500,
      },
    ],
  };

  withAmount(amount: number): this {
    this.request.amount = amount;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.request.sessionId = sessionId;
    return this;
  }

  withItems(items: Array<{ name: string; quantity: number; price: number }>): this {
    this.request.items = items;
    this.request.amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return this;
  }

  withEmptyItems(): this {
    this.request.items = [];
    this.request.amount = 0;
    return this;
  }

  withNegativeAmount(): this {
    this.request.amount = -100;
    return this;
  }

  withZeroAmount(): this {
    this.request.amount = 0;
    return this;
  }

  withLargeAmount(): this {
    this.request.amount = Number.MAX_SAFE_INTEGER;
    return this;
  }

  build(): PaymentRequest {
    return this.request;
  }
}
