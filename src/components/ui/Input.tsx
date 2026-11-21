/**
 * Online Store Platform — Input Primitive
 * Author: JoNa (https://github.com/jona-datasol)
 */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helperText,
    error,
    leftAddon,
    rightAddon,
    required,
    disabled,
    className = '',
    containerClassName = '',
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const describedBy = [ariaDescribedBy, errorId, helperId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  return (
    <div className={['flex flex-col gap-1.5', containerClassName].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium leading-tight text-text-primary"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-error-text" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftAddon && (
          <span
            className="pointer-events-none absolute left-3 inline-flex items-center text-text-muted"
            aria-hidden="true"
          >
            {leftAddon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={[
            'min-h-11 w-full rounded-sm border bg-surface px-3 py-2',
            'text-base md:text-sm text-text-primary placeholder:text-text-muted',
            'transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
            'disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border',
            hasError ? 'border-error' : 'border-border-strong',
            leftAddon ? 'pl-10' : '',
            rightAddon ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />

        {rightAddon && (
          <span
            className="absolute right-3 inline-flex items-center text-text-muted"
            aria-hidden="true"
          >
            {rightAddon}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-[13px] leading-snug text-error-text">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p id={helperId} className="text-[13px] leading-snug text-text-secondary">
          {helperText}
        </p>
      )}
    </div>
  );
});
