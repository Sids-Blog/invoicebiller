'use client';

import { useState, useEffect } from 'react';
import { getSession, onAuthStateChange, type AuthSession } from '@/lib/auth';

export const useAuth = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const deriveRole = (s: AuthSession | null) => {
    if (!s) { setRole(null); return; }
    // Derive role directly from session — no extra API call needed
    if (s.user.is_superadmin) {
      setRole('superadmin');
    } else {
      setRole('company_admin');
    }
  };

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);
    deriveRole(currentSession);
    setLoading(false);

    const unsubscribe = onAuthStateChange((newSession) => {
      setSession(newSession);
      deriveRole(newSession);
    });

    return unsubscribe;
  }, []);

  return { session, loading, role };
};