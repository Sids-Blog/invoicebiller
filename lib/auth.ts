const SESSION_KEY = 'kb_session';

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  is_superadmin: boolean;
  company_id: string | null;
  // NOTE: session_token is intentionally NOT stored here.
  // It lives in an HttpOnly cookie set by the server and is never accessible
  // to client-side JavaScript — protecting against XSS token theft.
}

export interface AuthSession {
  user: AuthUser;
}

/**
 * Sign in with email + password.
 * The server sets an HttpOnly cookie for the session token.
 * Only safe user metadata (no token) is stored in localStorage.
 */
export const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // Ensures the Set-Cookie header is accepted
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { error: data.error || 'Login failed' };
    }

    // Store only safe metadata — never the token
    const session: AuthSession = data.session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { error: null };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
};

/**
 * Sign out the current user.
 * Clears local session metadata and calls the server to invalidate the
 * HttpOnly cookie and terminate the DB session record.
 */
export const signOut = (): void => {
  localStorage.removeItem(SESSION_KEY);
  // Fire-and-forget: clear HttpOnly cookie and terminate DB session
  fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
};

/**
 * Get the current session metadata from localStorage.
 * NOTE: This does NOT contain the session token — that lives in an HttpOnly cookie.
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
 * Listen for auth state changes across tabs (storage events).
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
