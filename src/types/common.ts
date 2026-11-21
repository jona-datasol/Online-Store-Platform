/**
 * Shared service result, pagination, and sorting contracts.
 * Author: JoNa (https://github.com/jona-datasol)
 */
import type { AppError } from '@/lib/errors';

export type UUID = string;
export type ISOTimestamp = string;
export type DecimalAmount = number;

export const DEFAULT_PAGE_SIZE = 20 as const;
export const MAX_PAGE_SIZE = 100 as const;

export type ServiceResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: AppError };

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams<TField extends string = string> {
  readonly sortBy?: TField;
  readonly sortDir?: SortDirection;
}

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationMeta;
}

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function err<T = never>(error: AppError): ServiceResult<T> {
  return { ok: false, error };
}

export function unwrapServiceResult<T>(result: ServiceResult<T>): T {
  if (!result.ok) {
    throw result.error;
  }
  return result.data;
}

export function normalizePagination(params?: PaginationParams): {
  readonly page: number;
  readonly pageSize: number;
  readonly from: number;
  readonly to: number;
} {
  const rawPage = params?.page ?? 1;
  const rawPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const clampedPageSize = Number.isFinite(rawPageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawPageSize)))
    : DEFAULT_PAGE_SIZE;

  const from = (page - 1) * clampedPageSize;
  const to = from + clampedPageSize - 1;

  return {
    page,
    pageSize: clampedPageSize,
    from,
    to,
  };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const safeTotal = Math.max(0, totalItems);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / pageSize);

  return {
    page,
    pageSize,
    totalItems: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
