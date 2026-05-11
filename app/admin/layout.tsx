'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { OrbitalLoader } from '@/components/ui/orbital-loader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/auth');
      return;
    }
    if (!session.user.is_superadmin) {
      // Non-admins cannot access this area at all
      router.replace('/billing');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <OrbitalLoader message="Authenticating..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone Admin Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/favicon-laabham.svg"
              alt="Logo"
              className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0"
            />
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-medium text-[#0E1F40] dark:text-white">Laabham</span>
              <span className="font-bold text-xl text-[#D4A017]">Pro</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <ShieldAlert className="h-4 w-4" />
                Super Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">Platform Admin</span>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
