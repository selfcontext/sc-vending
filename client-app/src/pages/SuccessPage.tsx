import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, CheckCircle, XCircle, Loader } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Session } from '@/types';
import Lottie from 'lottie-react';
import successAnimation from '@/assets/animations/success.json';

export default function SuccessPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const snapshot = await getDoc(sessionRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSession({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
          } as Session);
        } else {
          setError('Session not found');
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load session'}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const failedItems = session.dispensedItems.filter((item) => item.status === 'failed');
  const refundAmount = failedItems.reduce((sum, item) => {
    const basketItem = session.basket.find((b) => b.productId === item.productId);
    return sum + (basketItem?.price || 0);
  }, 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl max-w-2xl w-full overflow-hidden text-center"
      >
        <div className="p-12">
          {/* Success Animation */}
          <div className="w-64 h-64 mx-auto mb-8">
            <Lottie animationData={successAnimation} loop={false} />
          </div>

          {/* Heart Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center">
              <Heart className="w-12 h-12 text-white fill-current" />
            </div>
          </motion.div>

          <h1 className="text-5xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-2xl text-gray-600 mb-8">Enjoy your treats</p>

          {/* Amount Paid */}
          <div className="mb-12">
            <p className="text-gray-600 mb-2">Total Paid</p>
            <p className="text-5xl font-bold text-primary-600">
              ${(session.totalAmount / 100).toFixed(2)}
            </p>
          </div>

          {/* Items Summary */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Items</h2>

            {session.basket.map((item) => {
              const itemDispenses = session.dispensedItems.filter((di) => di.productId === item.productId);
              const successCount = itemDispenses.filter((di) => di.status === 'dispensed').length;
              const failCount = itemDispenses.filter((di) => di.status === 'failed').length;

              return (
                <div key={item.productId} className="p-4 rounded-2xl bg-white/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {failCount === 0 ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-600">
                        {successCount > 0 && `${successCount} dispensed`}
                        {failCount > 0 && ` • ${failCount} failed`}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ${((item.price * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Refund Notice */}
          {failedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-blue-50 border border-blue-200 mb-8"
            >
              <h3 className="font-semibold text-blue-900 mb-2">Refund Processed</h3>
              <p className="text-blue-800">
                ${(refundAmount / 100).toFixed(2)} has been refunded for items that couldn't be dispensed
              </p>
            </motion.div>
          )}

          <p className="text-gray-600 text-lg">
            Have a wonderful day! 🎉
          </p>
        </div>
      </motion.div>
    </div>
  );
}
