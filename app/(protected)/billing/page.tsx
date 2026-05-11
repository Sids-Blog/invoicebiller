'use client';
import { Billing } from "@/components/billing/Billing";
import { Suspense } from "react";

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading billing...</div>}>
      <Billing />
    </Suspense>
  );
}
