'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react';

// ── Password strength indicator ────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number or symbol', ok: /[0-9!@#$%^&*]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
      <ul className="space-y-0.5">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <CheckCircle2 className={`h-3 w-3 ${c.ok ? 'opacity-100' : 'opacity-30'}`} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Inner component (uses useSearchParams) ─────────────────────────────────
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid' | 'used' | 'expired'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Pre-flight token validation
  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setTokenStatus('valid');
        else if (d.reason === 'already_used') setTokenStatus('used');
        else if (d.reason === 'expired') setTokenStatus('expired');
        else setTokenStatus('invalid');
      })
      .catch(() => setTokenStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? 'Reset failed. Please request a new link.');
      } else {
        setDone(true);
        // Redirect to login after 3 seconds
        setTimeout(() => router.replace('/auth'), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (tokenStatus === 'loading') {
    return (
      <Card className="shadow-lg border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Validating reset link…</p>
        </CardContent>
      </Card>
    );
  }

  if (tokenStatus !== 'valid' && !done) {
    const messages: Record<string, { title: string; body: string }> = {
      expired: {
        title: 'Link expired',
        body: 'This password reset link expired after 1 hour. Please request a new one.',
      },
      used: {
        title: 'Link already used',
        body: 'This link has already been used to reset a password. Please request a new one if needed.',
      },
      invalid: {
        title: 'Invalid link',
        body: 'This reset link is invalid or doesn\'t exist. Please request a new one.',
      },
    };
    const msg = messages[tokenStatus] ?? messages.invalid;

    return (
      <Card className="shadow-lg border-border/50">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-center">{msg.title}</CardTitle>
          <CardDescription className="text-center">{msg.body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request new reset link</Link>
          </Button>
          <div className="text-center">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="shadow-lg border-border/50">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Password reset!</CardTitle>
          <CardDescription className="text-center">
            Your password has been updated. All other sessions have been signed out for security.
            Redirecting you to login…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth">Go to login now</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-center">Set new password</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Choose a strong password for your account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className="pr-10"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                className="pr-10"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-destructive">Passwords don't match</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full font-semibold"
            disabled={loading || password.length < 8 || password !== confirm}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting password…
              </>
            ) : (
              'Reset password'
            )}
          </Button>

          <div className="text-center">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Page wrapper (Suspense required for useSearchParams) ───────────────────
export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D4A017] text-[#0E1F40] font-bold text-lg shadow border-2 border-[#D4A017]">
            ₹
          </div>
          <span className="text-xl font-serif font-medium text-foreground">Laabham</span>
          <span className="text-xl font-bold text-[#D4A017] -ml-2">Pro</span>
        </div>

        <Suspense fallback={
          <Card className="shadow-lg">
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
