import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Session, BasketItem } from '@/types';
import toast from 'react-hot-toast';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  updateBasket: (items: BasketItem[]) => Promise<void>;
  extendSession: () => Promise<void>;
  refreshSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  sessionId: string | undefined;
  children: ReactNode;
}

export function SessionProvider({ sessionId, children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sessionRef = doc(db, 'sessions', sessionId);

    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSession({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Session);
        } else {
          setSession(null);
          setError(new Error('Session not found'));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Session listener error:', err);
        setError(err as Error);
        setLoading(false);
        toast.error('Failed to load session');
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  const updateBasket = useCallback(
    async (items: BasketItem[]) => {
      if (!sessionId || !session) return;

      try {
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        await updateDoc(doc(db, 'sessions', sessionId), {
          basket: items,
          totalAmount,
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to update basket:', err);
        toast.error('Failed to update basket');
        throw err;
      }
    },
    [sessionId, session]
  );

  const extendSession = useCallback(async () => {
    if (!sessionId || !session) return;

    try {
      const newExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // +2 minutes

      await updateDoc(doc(db, 'sessions', sessionId), {
        expiresAt: newExpiresAt,
        extendedCount: increment(1),
        updatedAt: new Date(),
      });

      toast.success('Session extended by 2 minutes');
    } catch (err) {
      console.error('Failed to extend session:', err);
      toast.error('Failed to extend session');
      throw err;
    }
  }, [sessionId, session]);

  const refreshSession = useCallback(() => {
    // Force a re-fetch by toggling a state
    // The listener will automatically update
  }, []);

  const value: SessionContextValue = {
    session,
    loading,
    error,
    updateBasket,
    extendSession,
    refreshSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
