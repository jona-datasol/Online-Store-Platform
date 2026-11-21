/**
 * Online Store Platform — Alert Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

const VARIANT_STYLES: Record<
  AlertVariant,
  { container: string; iconColor: string; Icon: typeof Info }
> = {
  info: {
    container: 'bg-info-soft text-info-text border-info/30',
    iconColor: 'text-info',
    Icon: Info,
  },
  success: {
    container: 'bg-success-soft text-success-text border-success/30',
    iconColor: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-warning-soft text-warning-text border-warning/30',
    iconColor: 'text-warning',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-error-soft text-error-text border-error/30',
    iconColor: 'text-error',
    Icon: AlertCircle,
  },
};

export function Alert({
  variant = 'info',
  title,
  action,
  role,
  className = '',
  children,
  ...rest
}: AlertProps) {
  const { container, iconColor, Icon } = VARIANT_STYLES[variant];
  const resolvedRole = role ?? (variant === 'error' || variant === 'warning' ? 'alert' : 'status');

  return (
    <div
      role={resolvedRole}
      className={[
        'flex items-start gap-3 rounded-md border p-4 text-sm leading-relaxed',
        container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <Icon
        className={['mt-0.5 h-5 w-5 shrink-0', iconColor].join(' ')}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        <div>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
