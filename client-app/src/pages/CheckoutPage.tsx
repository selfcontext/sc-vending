import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Loader, ArrowLeft, CheckCircle } from 'lucide-react';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { Session } from '@/types';
import { PaymentService } from '@/services/payment.service';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [processing, setProcessing] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSession({
          id: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Session);

        // Check if payment completed (with navigation guard to prevent multiple triggers)
        if (data.payments?.some((p: { status: string }) => p.status === 'completed') && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(`/dispensing/${sessionId}`);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, navigate]);

  const handlePayment = async () => {
    if (!session || !sessionId) return;

    // VALIDATION: Check if session is expired before allowing payment
    if (session.expiresAt && new Date() > session.expiresAt) {
      toast.error('Session has expired. Please start a new session.');
      return;
    }

    // VALIDATION: Check if session is still active
    if (session.status !== 'active') {
      toast.error('Session is no longer active.');
      return;
    }

    // VALIDATION: Check if basket is empty
    if (!session.basket || session.basket.length === 0) {
      toast.error('Your basket is empty.');
      return;
    }

    setProcessing(true);
    try {
      // Process payment through mock service
      const result = await PaymentService.processPayment({
        amount: session.totalAmount,
        sessionId,
        items: session.basket.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      if (result.success) {
        const transactionId = result.transactionId || `pay_${Date.now()}`;

        // Call Cloud Function FIRST to validate and create events atomically
        // The Cloud Function handles session status update + event creation in a batch
        // This prevents the double-write race condition
        try {
          const functions = getFunctions();
          const processPaymentFn = httpsCallable(functions, 'processPayment');
          await processPaymentFn({
            sessionId,
            transactionId,
            amount: session.totalAmount,
          });
        } catch (fnError: unknown) {
          console.error('Cloud Function error:', fnError);
          const errorMessage = fnError instanceof Error ? fnError.message : 'Payment processing failed';
          // Check for specific error types
          if (errorMessage.includes('already processed')) {
            toast.error('Payment was already processed for this session.');
          } else if (errorMessage.includes('not active')) {
            toast.error('Session is no longer active.');
          } else if (errorMessage.includes('Insufficient stock')) {
            toast.error('Some items are out of stock. Please update your basket.');
          } else {
            toast.error('Payment processing failed. Please try again.');
          }
          return;
        }

        // Update local session with payment info (for UI display)
        // Note: Cloud Function already updated the session status
        const payment = {
          id: transactionId,
          amount: session.totalAmount,
          status: 'completed' as const,
          method: 'mock_payment',
          timestamp: new Date(),
          transactionId,
        };

        await updateDoc(doc(db, 'sessions', sessionId), {
          payments: arrayUnion(payment),
        });

        toast.success('Payment successful!');
        hasNavigatedRef.current = true;
        navigate(`/dispensing/${sessionId}`);
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-8">
          <button
            onClick={() => navigate(`/session/${sessionId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to shopping
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Order Summary */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {session.basket.map((item) => (
                <div key={item.productId} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ${((item.price * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-3xl font-bold text-primary-600">
                ${(session.totalAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <CreditCard className="w-8 h-8" />
                <span className="text-sm">Mock Payment</span>
              </div>
              <p className="text-sm opacity-90">
                This is a mock payment for testing purposes
              </p>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Pay ${(session.totalAmount / 100).toFixed(2)}
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Your items will be dispensed after payment confirmation
          </p>
        </div>
      </motion.div>
    </div>
  );
}
