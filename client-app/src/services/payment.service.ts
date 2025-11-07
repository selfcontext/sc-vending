/**
 * Mock Payment Service
 * Replace this with your actual payment gateway implementation
 */

export interface PaymentRequest {
  amount: number;
  sessionId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process payment through your payment gateway
   * This is a mock implementation that simulates a 2-second processing time
   */
  static async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log('Processing payment:', request);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock success response (90% success rate for testing)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } else {
      return {
        success: false,
        error: 'Payment declined - insufficient funds (mock error)',
      };
    }
  }

  /**
   * Verify payment status
   */
  static async verifyPayment(transactionId: string): Promise<boolean> {
    console.log('Verifying payment:', transactionId);
    await new Promise(resolve => setTimeout(resolve, 500));
    return transactionId.startsWith('mock_txn_');
  }

  /**
   * Request refund
   */
  static async requestRefund(transactionId: string, amount: number): Promise<PaymentResponse> {
    console.log('Requesting refund:', { transactionId, amount });
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      transactionId: `refund_${transactionId}`,
    };
  }
}
