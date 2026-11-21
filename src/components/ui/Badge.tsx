/**
 * Online Store Platform — Badge Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-variant text-text-secondary border-border',
  success: 'bg-success-soft text-success-text border-success/25',
  warning: 'bg-warning-soft text-warning-text border-warning/25',
  error: 'bg-error-soft text-error-text border-error/25',
  info: 'bg-info-soft text-info-text border-info/25',
  brand: 'bg-primary-soft text-primary-text border-primary-text/20',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border font-medium leading-tight tracking-[0.02em] tabular-nums',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </span>
  );
}
