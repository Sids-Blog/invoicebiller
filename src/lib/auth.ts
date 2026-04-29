const SESSION_KEY = 'kb_session';

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

/**
 * Sign in with email + password.
 * Delegates to the /api/auth/login serverless API route.
 * Password is sent over HTTPS and verified server-side — never exposed.
 */
export const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { error: data.error || 'Login failed' };
    }

    const session: AuthSession = data.session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { error: null };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
};

/**
 * Sign out the current user.
 */
export const signOut = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

/**
 * Get the current session from localStorage.
 */
export const getSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
};

/**
 * Listen for auth state changes (storage events across tabs).
 * Returns an unsubscribe function.
 */
export const onAuthStateChange = (
  callback: (session: AuthSession | null) => void
): (() => void) => {
  const handler = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      callback(getSession());
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
