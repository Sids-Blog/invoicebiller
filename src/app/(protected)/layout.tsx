'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Loader2 } from "lucide-react";

const routePermissions: Record<string, string[]> = {
  '/dashboard': ['admin', 'manager'],
  '/billing': ['admin', 'manager'],
  '/orders': ['admin', 'manager', 'staff'],
  '/inventory': ['admin', 'manager'],
  '/payments': ['admin', 'manager'],
  '/customers': ['admin', 'manager'],
  '/damaged-stock': ['admin', 'manager'],
  '/financial-analytics': ['admin', 'manager'],
  '/admin': ['admin'],
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace('/auth');
      return;
    }

    // Fetch role from API
    fetch(`/api/auth/role?userId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        const userRole = data.role || null;
        setRole(userRole);

        const allowedRoles = routePermissions[pathname || ''];
        if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
          router.replace('/dashboard');
        }

        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
