'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OrbitalLoader } from "@/components/ui/orbital-loader";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(session.user.is_superadmin ? '/admin' : '/dashboard');
    } else {
      router.replace('/auth');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <OrbitalLoader message="Loading Laabham Pro..." />
    </div>
  );
}
