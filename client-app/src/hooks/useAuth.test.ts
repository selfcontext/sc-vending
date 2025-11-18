import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import toast from 'react-hot-toast';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock Firebase config
vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAuth Hook', () => {
  const mockAnonymousUser: Partial<User> = {
    uid: 'anonymous-123',
    isAnonymous: true,
    email: null,
  };

  const mockAdminUser: Partial<User> = {
    uid: 'admin-456',
    isAnonymous: false,
    email: 'admin@test.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auto Sign-In', () => {
    it('should auto sign-in anonymously when no user is present', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        // Simulate no user initially, then anonymous user
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockResolvedValue({
        user: mockAnonymousUser as User,
      } as any);

      const { result } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(signInAnonymously).toHaveBeenCalled();
      expect(result.current.user).toBeTruthy();
      expect(result.current.isAdmin).toBe(false);
    });

    it('should set existing user without auto sign-in', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(signInAnonymously).not.toHaveBeenCalled();
      expect(result.current.user).toBeTruthy();
    });

    it('should handle auto sign-in failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Auto sign-in failed:',
        expect.any(Error)
      );
      expect(result.current.user).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Admin Sign In', () => {
    it('should sign in admin with valid credentials', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockAdminUser as User,
      } as any);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInAsAdmin('admin@test.com', 'password123');
      });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'admin@test.com',
        'password123'
      );
      expect(toast.success).toHaveBeenCalledWith('Signed in successfully');
      expect(result.current.isAdmin).toBe(true);
    });

    it('should handle invalid credentials', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      const authError = { message: 'Invalid credentials' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(authError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await act(async () => {
          await result.current.signInAsAdmin('wrong@test.com', 'wrongpass');
        });
      } catch (error) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalled();
      const errorCallArg = vi.mocked(toast.error).mock.calls[0][0];
      expect(errorCallArg).toContain('Invalid credentials');
    });

    it('should handle network errors during sign in', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      const networkError = { message: 'Network request failed' };
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await act(async () => {
          await result.current.signInAsAdmin('admin@test.com', 'password');
        });
      } catch (error) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalled();
      const errorCallArg = vi.mocked(toast.error).mock.calls[0][0];
      expect(errorCallArg).toContain('Network request failed');
    });

    it('should update user state after successful sign in', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockAdminUser as User,
      } as any);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.uid).toBe('anonymous-123');
      expect(result.current.isAdmin).toBe(false);

      await act(async () => {
        await result.current.signInAsAdmin('admin@test.com', 'password');
      });

      expect(result.current.user?.uid).toBe('admin-456');
      expect(result.current.isAdmin).toBe(true);
    });
  });

  describe('Sign Out', () => {
    it('should sign out and re-authenticate as anonymous', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAdminUser as User), 0);
        return vi.fn();
      });

      vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
      vi.mocked(signInAnonymously).mockResolvedValue({
        user: mockAnonymousUser as User,
      } as any);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);

      await act(async () => {
        await result.current.signOut();
      });

      expect(firebaseSignOut).toHaveBeenCalled();
      expect(signInAnonymously).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Signed out successfully');
      expect(result.current.user?.isAnonymous).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it('should handle sign out failure', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAdminUser as User), 0);
        return vi.fn();
      });

      const signOutError = { message: 'Sign out failed' };
      vi.mocked(firebaseSignOut).mockRejectedValue(signOutError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await act(async () => {
          await result.current.signOut();
        });
      } catch (error) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalled();
      const errorCallArg = vi.mocked(toast.error).mock.calls[0][0];
      expect(errorCallArg).toContain('Sign out failed');
    });

    it('should handle failure to re-authenticate after sign out', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAdminUser as User), 0);
        return vi.fn();
      });

      vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
      vi.mocked(signInAnonymously).mockRejectedValue(new Error('Re-auth failed'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await act(async () => {
          await result.current.signOut();
        });
      } catch (error) {
        // Expected to throw
      }

      expect(firebaseSignOut).toHaveBeenCalled();
      expect(signInAnonymously).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('isAdmin Check', () => {
    it('should identify anonymous user as not admin', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
    });

    it('should identify email user as admin', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAdminUser as User), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should return false when no user', () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        // Don't call callback, user stays null
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth());

      // User is null, isAdmin should be false (falsy check)
      expect(result.current.user).toBeNull();
      // isAdmin() returns user && !user.isAnonymous, which is false when user is null
      expect(Boolean(result.current.isAdmin)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle auth state changes during hook lifetime', async () => {
      let authCallback: any;
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        authCallback = callback;
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.uid).toBe('anonymous-123');

      // Simulate auth state change
      act(() => {
        authCallback(mockAdminUser as User);
      });

      await waitFor(() => {
        expect(result.current.user?.uid).toBe('admin-456');
      });
    });

    it('should cleanup auth listener on unmount', async () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return unsubscribeMock;
      });

      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(unsubscribeMock).not.toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should handle rapid sign in/out cycles', async () => {
      vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockAnonymousUser as User), 0);
        return vi.fn();
      });

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockAdminUser as User,
      } as any);

      vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
      vi.mocked(signInAnonymously).mockResolvedValue({
        user: mockAnonymousUser as User,
      } as any);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Rapid sign in/out
      await act(async () => {
        await result.current.signInAsAdmin('admin@test.com', 'password');
        await result.current.signOut();
        await result.current.signInAsAdmin('admin@test.com', 'password');
        await result.current.signOut();
      });

      expect(result.current.isAdmin).toBe(false);
    });
  });
});
