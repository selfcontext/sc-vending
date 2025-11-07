import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';

interface SessionTimerProps {
  expiresAt: Date;
  sessionId: string;
  extendedCount: number;
  onExtend: () => void;
}

export default function SessionTimer({ expiresAt, sessionId, extendedCount, onExtend }: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    // Calculate initial total duration
    const now = Date.now();
    const expires = expiresAt.getTime();
    setTotalDuration(expires - (now - (expires - now)));

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = expiresAt.getTime();
      const remaining = Math.max(0, expires - now);

      setTimeLeft(remaining);

      // Show warning 15 seconds before expiry
      if (remaining <= 15000 && remaining > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const progress = totalDuration > 0 ? (timeLeft / totalDuration) * 100 : 0;

  // Color based on time remaining
  const getColor = () => {
    if (timeLeft <= 15000) return '#ef4444'; // red
    if (timeLeft <= 60000) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const canExtend = extendedCount < 1;

  if (timeLeft <= 0) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg">
        <p className="font-semibold">Session Expired</p>
      </div>
    );
  }

  return (
    <>
      {/* Compact Timer Display */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/95 backdrop-blur rounded-full shadow-lg">
          <div className="relative w-10 h-10">
            <svg className="transform -rotate-90 w-10 h-10">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="#e5e7eb"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke={getColor()}
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <Clock
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: getColor() }}
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-xs text-gray-600">Time left</p>
          </div>
        </div>
      </div>

      {/* Extension Warning Modal */}
      <AnimatePresence>
        {showWarning && canExtend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
                Session Expiring Soon
              </h2>

              <p className="text-center text-gray-600 mb-2">
                Your session will expire in
              </p>

              <p className="text-center text-4xl font-bold text-amber-600 mb-6">
                {seconds} seconds
              </p>

              <p className="text-center text-sm text-gray-600 mb-8">
                Extend your session to continue shopping?
              </p>

              <div className="flex gap-4">
                <button
                  onClick={onExtend}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                >
                  Extend Session
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                You can extend once per session
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cannot extend warning */}
      <AnimatePresence>
        {showWarning && !canExtend && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-amber-500 text-white rounded-full shadow-lg"
          >
            <p className="font-semibold">Session expiring in {seconds}s - Complete checkout now!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
