import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.compose');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('gmail_access_token') : null;

// Helper to determine if token is expired (using 1 hour standard lifetime)
export const isTokenExpired = (): boolean => {
  if (typeof window === 'undefined') return true;
  const token = localStorage.getItem('gmail_access_token');
  if (!token) return true;
  const expiresAt = localStorage.getItem('gmail_access_token_expires_at');
  if (!expiresAt) return true;
  // Return true if current time is past or within 30 seconds of expiration
  return Date.now() >= (parseInt(expiresAt, 10) - 30 * 1000);
};

// Helper to check token status
export interface TokenStatus {
  status: 'connected' | 'expired' | 'disconnected';
  message: string;
}

export const getTokenStatus = (): TokenStatus => {
  if (typeof window === 'undefined') {
    return { status: 'disconnected', message: 'Gmail disconnected' };
  }
  const token = localStorage.getItem('gmail_access_token');
  if (!token) {
    return { status: 'disconnected', message: 'Gmail disconnected' };
  }
  if (isTokenExpired()) {
    return { status: 'expired', message: 'Authentication expired' };
  }
  return { status: 'connected', message: 'Gmail connected successfully' };
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (status: 'disconnected' | 'expired') => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = localStorage.getItem('gmail_access_token');
      if (token && !isTokenExpired()) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (token && isTokenExpired()) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure('expired');
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure('disconnected');
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gmail_access_token');
        localStorage.removeItem('gmail_access_token_expires_at');
      }
      if (onAuthFailure) onAuthFailure('disconnected');
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gmail_access_token', cachedAccessToken);
      // Store expiry (typically 3600 seconds, so let's set it to 1 hour from now)
      const expiresAt = Date.now() + 3600 * 1000;
      localStorage.setItem('gmail_access_token_expires_at', expiresAt.toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (isTokenExpired()) {
    return null;
  }
  return cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem('gmail_access_token') : null);
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_access_token_expires_at');
  }
};
