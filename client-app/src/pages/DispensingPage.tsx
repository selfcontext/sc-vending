import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Session } from '@/types';
import Lottie from 'lottie-react';
import dispensingAnimation from '@/assets/animations/dispensing.json';

const DISPENSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout

export default function DispensingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Timeout effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTimedOut(true);
    }, DISPENSE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const sessionData = {
          id: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as Session;

        setSession(sessionData);

        // Check if all items are dispensed or failed
        const allItemsProcessed =
          sessionData.dispensedItems.length === sessionData.basket.reduce((sum, item) => sum + item.quantity, 0) &&
          sessionData.dispensedItems.every((item) => item.status !== 'pending');

        if (allItemsProcessed) {
          setTimeout(() => {
            navigate(`/success/${sessionId}`);
          }, 2000);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId, navigate]);

  // Handle timeout - show error with option to proceed
  const handleProceedAnyway = () => {
    navigate(`/success/${sessionId}`);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  // Timeout state - show error with proceed option
  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl max-w-lg w-full p-8 text-center"
        >
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dispensing Taking Longer Than Expected</h2>
          <p className="text-gray-600 mb-6">
            The dispensing process is taking longer than usual. This may be due to a machine issue.
            Please check if your items have been dispensed.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleProceedAnyway}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              View Order Summary
            </button>
            <p className="text-sm text-gray-500">
              Any unprocessed items will be refunded automatically.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const totalItems = session.basket.reduce((sum, item) => sum + item.quantity, 0);
  const dispensedCount = session.dispensedItems.filter((item) => item.status === 'dispensed').length;
  const failedItems = session.dispensedItems.filter((item) => item.status === 'failed');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl max-w-2xl w-full overflow-hidden"
      >
        <div className="p-12 text-center">
          {/* Animation */}
          <div className="w-64 h-64 mx-auto mb-8">
            <Lottie animationData={dispensingAnimation} loop />
          </div>

          {/* Status */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Dispensing Your Items</h1>
          <p className="text-xl text-gray-600 mb-8">Please wait while we prepare your order</p>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="w-6 h-6 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">
                {dispensedCount} / {totalItems}
              </span>
              <span className="text-gray-600">items dispensed</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(dispensedCount / totalItems) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-700"
              />
            </div>
          </div>

          {/* Item Status List */}
          <div className="space-y-3 mb-8">
            {session.basket.map((item) => {
              // Filter and sort by timestamp to ensure correct ordering regardless of processing order
              const itemDispenseStatuses = session.dispensedItems
                .filter((di) => di.productId === item.productId)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

              return (
                <div key={item.productId}>
                  {Array.from({ length: item.quantity }).map((_, idx) => {
                    const dispenseStatus = itemDispenseStatuses[idx];
                    const status = dispenseStatus?.status || 'pending';

                    return (
                      <motion.div
                        key={`${item.productId}-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/50"
                      >
                        <div className="flex items-center gap-3">
                          {status === 'pending' && <Loader className="w-5 h-5 animate-spin text-gray-400" />}
                          {status === 'dispensed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                          <span className="font-medium text-gray-900">{item.productName}</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          status === 'pending' ? 'text-gray-500' :
                          status === 'dispensed' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {status === 'pending' && 'Dispensing...'}
                          {status === 'dispensed' && 'Dispensed'}
                          {status === 'failed' && 'Failed'}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Failed Items Notice */}
          {failedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-amber-50 border border-amber-200"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <h3 className="font-semibold text-amber-900 mb-2">Refund Notice</h3>
                  <p className="text-sm text-amber-800">
                    {failedItems.length} item(s) could not be dispensed. A refund will be processed automatically.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <p className="text-gray-600 mt-8">
            Please collect your items from the vending machine
          </p>
        </div>
      </motion.div>
    </div>
  );
}
