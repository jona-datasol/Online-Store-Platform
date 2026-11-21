/**
 * Online Store Platform — Responsive DataTable Primitive (Precision Retail)
 * Author: JoNa (https://github.com/jona-datasol)
 *
 * Renders a semantic HTML <table> on tablet/desktop (>= 768px) and a Stacked Card List
 * on mobile (< 768px) with zero forced horizontal scroll (DESIGN_SYSTEM.md Section 8).
 */

import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export type DataTableAlign = 'left' | 'right' | 'center';

export interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly align?: DataTableAlign;
  readonly isNumeric?: boolean;
  readonly isPrimary?: boolean;
  readonly isBadge?: boolean;
  readonly isAction?: boolean;
  readonly hideOnMobile?: boolean;
  readonly headerClassName?: string;
  readonly cellClassName?: string;
}

export interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly data: readonly T[];
  readonly keyExtractor: (row: T) => string;
  readonly loading?: boolean;
  readonly skeletonRows?: number;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: ReactNode;
  readonly caption?: string;
  readonly className?: string;
}

const ALIGN_CLASSES: Record<DataTableAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 5,
  emptyTitle = 'No hay registros para mostrar',
  emptyDescription = 'Intenta ajustar los filtros o crea un nuevo registro.',
  emptyAction,
  caption,
  className = '',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div
        aria-label="Cargando datos"
        className={['space-y-3', className].filter(Boolean).join(' ')}
      >
        {/* Mobile skeleton cards */}
        <div className="space-y-3 md:hidden">
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton variant="text" className="h-4 w-1/2" />
                <Skeleton variant="rect" className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton variant="text" className="h-4 w-3/4" />
                <Skeleton variant="text" className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop skeleton table */}
        <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
          <div className="border-b border-border bg-surface-subtle px-4 py-3">
            <Skeleton variant="text" className="h-4 w-full" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <div key={index} className="px-4 py-3.5">
                <Skeleton variant="text" className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  const primaryCol = columns.find((col) => col.isPrimary) ?? columns[0];
  const badgeCol = columns.find((col) => col.isBadge && col !== primaryCol);
  const actionCol = columns.find((col) => col.isAction);
  const bodyCols = columns.filter(
    (col) => col !== primaryCol && col !== badgeCol && col !== actionCol && !col.hideOnMobile
  );

  return (
    <div className={className}>
      {/* Mobile Stacked Card List (< 768px) */}
      <ul className="space-y-3 md:hidden" aria-label={caption ?? 'Listado de registros'}>
        {data.map((row) => (
          <li
            key={keyExtractor(row)}
            className="space-y-3 rounded-lg border border-border bg-surface p-4"
          >
            {(primaryCol || badgeCol) && (
              <div className="flex items-start justify-between gap-3">
                {primaryCol && (
                  <div className="min-w-0 text-sm font-semibold text-text-primary">
                    {primaryCol.render(row)}
                  </div>
                )}
                {badgeCol && <div className="shrink-0">{badgeCol.render(row)}</div>}
              </div>
            )}

            {bodyCols.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {bodyCols.map((col) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-xs font-medium text-text-secondary">{col.header}</dt>
                    <dd
                      className={[
                        'mt-0.5 text-sm text-text-primary',
                        col.isNumeric ? 'tabular-nums' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {actionCol && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                {actionCol.render(row)}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Tablet & Desktop Semantic Table (>= 768px) */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-border bg-surface-subtle">
            <tr>
              {columns.map((col) => {
                const align = col.align ?? (col.isNumeric ? 'right' : 'left');
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={[
                      'px-4 py-3 text-[13px] font-medium tracking-[0.01em] text-text-secondary',
                      ALIGN_CLASSES[align],
                      col.headerClassName ?? '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="transition-colors duration-150 hover:bg-surface-variant/60"
              >
                {columns.map((col) => {
                  const align = col.align ?? (col.isNumeric ? 'right' : 'left');
                  return (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-3.5 text-text-primary',
                        ALIGN_CLASSES[align],
                        col.isNumeric ? 'tabular-nums' : '',
                        col.cellClassName ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
