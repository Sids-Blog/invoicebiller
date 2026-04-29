'use client';

import { useState, useEffect } from 'react';
import { getSession, onAuthStateChange, type AuthSession } from '@/lib/auth';

export const useAuth = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const fetchRole = async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/role?userId=${userId}`);
      const data = await res.json();
      setRole(data.role || null);
    } catch {
      setRole(null);
    }
  };

  useEffect(() => {
    // Bootstrap from localStorage
    const currentSession = getSession();
    setSession(currentSession);
    if (currentSession) {
      fetchRole(currentSession.user.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for cross-tab sign-in/sign-out
    const unsubscribe = onAuthStateChange((newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchRole(newSession.user.id);
      } else {
        setRole(null);
      }
    });

    return unsubscribe;
  }, []);

  return { session, loading, role };
};