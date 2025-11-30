import { useEffect, useState } from 'react';
import {
  User,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        // Auto sign-in anonymously
        // Note: successful sign-in will trigger onAuthStateChanged again with the new user
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Auto sign-in failed:', error);
          setLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  const signInAsAdmin = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      toast.success('Signed in successfully');
      return result.user;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Re-authenticate anonymously after sign out
      const result = await signInAnonymously(auth);
      setUser(result.user);
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  const isAdmin = () => {
    return user && !user.isAnonymous;
  };

  return {
    user,
    loading,
    signInAsAdmin,
    signOut,
    isAdmin: isAdmin(),
  };
}
