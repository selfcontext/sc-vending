import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  // Ref to track session existence for stable callbacks (avoids recreating on every session update)
  const sessionExistsRef = useRef(false);

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
          sessionExistsRef.current = true;
        } else {
          setSession(null);
          sessionExistsRef.current = false;
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
      if (!sessionId || !sessionExistsRef.current) return;

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
    [sessionId]
  );

  const extendSession = useCallback(async () => {
    if (!sessionId || !sessionExistsRef.current) return;

    try {
      // Use Cloud Function to extend session with proper validation and logging
      const functions = getFunctions();
      const extendSessionFn = httpsCallable(functions, 'extendSession');
      await extendSessionFn({ sessionId });

      toast.success('Session extended successfully!');
    } catch (err: any) {
      console.error('Failed to extend session:', err);
      if (err.code === 'functions/failed-precondition') {
        toast.error(err.message || 'Session cannot be extended');
      } else {
        toast.error('Failed to extend session');
      }
      throw err;
    }
  }, [sessionId]);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Force a re-read of the session document
      const sessionRef = doc(db, 'sessions', sessionId);
      const snapshot = await (await import('firebase/firestore')).getDoc(sessionRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setSession({
          id: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Session);
        sessionExistsRef.current = true;
        setError(null);
      } else {
        setSession(null);
        sessionExistsRef.current = false;
        setError(new Error('Session not found'));
      }
    } catch (err) {
      console.error('Failed to refresh session:', err);
      setError(err as Error);
    }
  }, [sessionId]);

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
