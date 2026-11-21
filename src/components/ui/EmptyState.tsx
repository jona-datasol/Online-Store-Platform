/**
 * Online Store Platform — EmptyState Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import type { ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-12 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-variant text-text-secondary"
        aria-hidden="true"
      >
        {icon ?? <PackageOpen className="h-6 w-6" strokeWidth={1.5} />}
      </div>

      <h3 className="text-base font-semibold leading-snug text-text-primary">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-secondary">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
