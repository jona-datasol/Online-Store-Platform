/**
 * Online Store Platform — Card Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import type { HTMLAttributes } from 'react';

export type CardElevation = 0 | 1 | 2;
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padding?: CardPadding;
  interactive?: boolean;
}

const ELEVATION_CLASSES: Record<CardElevation, string> = {
  0: 'shadow-elevation-0',
  1: 'shadow-elevation-1',
  2: 'shadow-elevation-2',
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  elevation = 0,
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-border bg-surface text-text-primary',
        ELEVATION_CLASSES[elevation],
        PADDING_CLASSES[padding],
        interactive ? 'transition-shadow duration-150 hover:shadow-elevation-1' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
