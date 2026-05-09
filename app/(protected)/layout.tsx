'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, signOut } from "@/lib/auth";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Loader2 } from "lucide-react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace('/auth');
      return;
    }

    // Client-side guard for superadmin-only routes
    if (pathname?.startsWith('/superadmin') && !session.user.is_superadmin) {
      router.replace('/billing');
      return;
    }

    // Validate server-side session via HttpOnly cookie (no manual token needed)
    const validateSession = async () => {
      try {
        const res = await fetch('/api/auth/validate', {
          method: 'POST',
          credentials: 'same-origin', // Sends the HttpOnly cookie automatically
        });
        const data = await res.json();

        if (!data.valid) {
          signOut();
          router.replace('/auth?reason=' + encodeURIComponent(data.reason || 'session_expired'));
          return;
        }
      } catch {
        // Network error — allow through (fail open for UX resilience)
      }
      setLoading(false);
    };

    validateSession();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <OrbitalLoader message="Preparing your workspace..." />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
