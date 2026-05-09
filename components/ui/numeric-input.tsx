'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number) => void;
  /** Allow clearing the field back to empty (commits 0 on blur). Default: true */
  allowEmpty?: boolean;
  decimals?: number;
}

/**
 * A controlled numeric input that:
 * - Shows an empty field when value is 0/null/undefined (instead of "0")
 * - Lets the user clear the field without it snapping back to 0
 * - Commits 0 when the field is blurred empty
 * - Prevents non-numeric input
 */
export function NumericInput({
  value,
  onChange,
  allowEmpty = true,
  decimals,
  className,
  onBlur,
  ...props
}: NumericInputProps) {
  // Internal string state allows intermediate empty/partial states
  const [internal, setInternal] = useState<string>(
    value != null && value !== 0 ? String(value) : ''
  );

  // Sync when the parent value changes externally (e.g. form reset, product selection)
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      // Only override internal if user isn't mid-edit
      const parsed = parseFloat(internal);
      const externalChanged = value !== (isNaN(parsed) ? 0 : parsed);
      if (externalChanged) {
        setInternal(value != null && value !== 0 ? String(value) : '');
      }
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow: empty, digits, single decimal point, negative sign at start
    if (raw === '' || raw === '-' || raw === '.') {
      setInternal(raw);
      return;
    }

    // Reject anything that doesn't look like a number
    if (!/^-?\d*\.?\d*$/.test(raw)) return;

    setInternal(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(decimals != null ? parseFloat(num.toFixed(decimals)) : num);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Normalize on blur: empty string → 0
    if (internal === '' || internal === '-' || internal === '.') {
      setInternal('');
      onChange(0);
    } else {
      // Re-format to remove trailing dots / leading zeros
      const num = parseFloat(internal);
      if (!isNaN(num)) {
        const formatted = decimals != null ? num.toFixed(decimals) : String(num);
        // Only update display if it actually differs (avoid cursor jump)
        if (formatted !== internal) setInternal(formatted);
        onChange(num);
      }
    }
    onBlur?.(e);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={internal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
    />
  );
}
