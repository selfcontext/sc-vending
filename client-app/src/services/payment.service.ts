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

/**
 * Generate a cryptographically secure random string
 * Uses crypto.getRandomValues() instead of Math.random()
 */
function generateSecureId(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure random number between 0 and 1
 */
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

export class PaymentService {
  /**
   * Process payment through your payment gateway
   * This is a mock implementation that simulates a 2-second processing time
   */
  static async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Note: Remove console.log in production to prevent information leakage
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing payment:', request);
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock success response (90% success rate for testing)
    // Uses cryptographically secure random instead of Math.random()
    const isSuccess = secureRandom() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        // Use crypto-based secure ID generation
        transactionId: `mock_txn_${Date.now()}_${generateSecureId(9)}`,
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Verifying payment:', transactionId);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    return transactionId.startsWith('mock_txn_');
  }

  /**
   * Request refund
   */
  static async requestRefund(transactionId: string, amount: number): Promise<PaymentResponse> {
    if (process.env.NODE_ENV === 'development') {
      console.log('Requesting refund:', { transactionId, amount });
    }
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      transactionId: `refund_${generateSecureId(8)}_${transactionId}`,
    };
  }
}
