/**
 * Online Store Platform — Skeleton Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import type { CSSProperties, HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded-xs',
  rect: 'rounded-md',
  circle: 'rounded-full',
};

export function Skeleton({
  variant = 'rect',
  width,
  height,
  style,
  className = '',
  ...rest
}: SkeletonProps) {
  const inlineStyle: CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyle}
      className={[
        'bg-surface-variant animate-pulse motion-reduce:animate-none',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
