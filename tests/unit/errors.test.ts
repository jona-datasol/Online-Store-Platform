/**
 * Unit tests for centralized AppError taxonomy and Supabase/PostgreSQL error mapping.
 * Author: JoNa (https://github.com/jona-datasol)
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createAppError,
  isAppError,
  mapSupabaseError,
  mapZodError,
  sanitizeErrorMeta,
} from '@/lib/errors';

describe('errors — AppError taxonomy and mapSupabaseError', () => {
  it('creates a valid AppError and recognizes it with isAppError', () => {
    const error = createAppError({
      category: 'BUSINESS',
      code: 'OUT_OF_STOCK',
      userMessage: 'Sin existencias.',
      httpStatus: 409,
      meta: { variantId: 'var-1' },
    });

    expect(isAppError(error)).toBe(true);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({ message: 'raw' })).toBe(false);
    expect(error.retryable).toBe(false);
    expect(error.timestamp).toBeTruthy();
  });

  it('passes through an existing AppError without mutating it', () => {
    const existing = createAppError({
      category: 'AUTHORIZATION',
      code: 'FORBIDDEN',
      userMessage: 'Acceso denegado.',
      httpStatus: 403,
    });

    expect(mapSupabaseError(existing)).toBe(existing);
  });

  it('parses P0001 raised business exception with JSON DETAIL and strips PII', () => {
    const mapped = mapSupabaseError({
      code: 'P0001',
      message: 'INSUFFICIENT_STOCK',
      details: JSON.stringify({
        code: 'INSUFFICIENT_STOCK',
        items: [{ variantId: 'v-100', requested: 5, available: 2 }],
        customer_phone: '5215512345678',
        customer_email: 'buyer@example.com',
      }),
    });

    expect(mapped.category).toBe('BUSINESS');
    expect(mapped.code).toBe('INSUFFICIENT_STOCK');
    expect(mapped.httpStatus).toBe(409);
    expect(mapped.retryable).toBe(false);
    expect(mapped.meta).toEqual({
      items: [{ variantId: 'v-100', requested: 5, available: 2 }],
    });
  });

  it('maps P0001 PRICE_CHANGED, DUPLICATE_IDEMPOTENCY_KEY, INVALID_STATUS_TRANSITION, and FORBIDDEN', () => {
    const priceChanged = mapSupabaseError({
      code: 'P0001',
      message: 'PRICE_CHANGED',
      details: JSON.stringify({
        code: 'PRICE_CHANGED',
        items: [{ variantId: 'v-1', previousPrice: 10, currentPrice: 12 }],
      }),
    });
    expect(priceChanged.category).toBe('BUSINESS');
    expect(priceChanged.code).toBe('PRICE_CHANGED');
    expect(priceChanged.httpStatus).toBe(409);

    const dupKey = mapSupabaseError({
      code: 'P0001',
      message: 'DUPLICATE_IDEMPOTENCY_KEY',
      details: JSON.stringify({
        code: 'DUPLICATE_IDEMPOTENCY_KEY',
        orderId: 'ord-1',
        orderNumber: 'ORD-20261121-0001',
      }),
    });
    expect(dupKey.category).toBe('BUSINESS');
    expect(dupKey.code).toBe('DUPLICATE_IDEMPOTENCY_KEY');
    expect(dupKey.meta).toEqual({
      orderId: 'ord-1',
      orderNumber: 'ORD-20261121-0001',
    });

    const invalidTransition = mapSupabaseError({
      code: 'P0001',
      message: 'INVALID_STATUS_TRANSITION',
    });
    expect(invalidTransition.category).toBe('BUSINESS');
    expect(invalidTransition.code).toBe('INVALID_STATUS_TRANSITION');
    expect(invalidTransition.httpStatus).toBe(422);

    const forbidden = mapSupabaseError({
      code: 'P0001',
      message: 'FORBIDDEN',
    });
    expect(forbidden.category).toBe('AUTHORIZATION');
    expect(forbidden.code).toBe('FORBIDDEN');
    expect(forbidden.httpStatus).toBe(403);
  });

  it('maps PostgreSQL SQLSTATE codes cleanly without exposing SQL internals', () => {
    const uniqueSku = mapSupabaseError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_product_variants_sku"',
    });
    expect(uniqueSku.category).toBe('BUSINESS');
    expect(uniqueSku.code).toBe('RESOURCE_ALREADY_EXISTS');
    expect(uniqueSku.fieldErrors?.[0]?.field).toBe('sku');

    const fkRestrict = mapSupabaseError({ code: '23503', message: 'violates foreign key' });
    expect(fkRestrict.category).toBe('BUSINESS');
    expect(fkRestrict.code).toBe('RESOURCE_IN_USE');

    const negStock = mapSupabaseError({
      code: '23514',
      message:
        'new row for relation "inventory" violates check constraint "chk_inventory_quantity"',
    });
    expect(negStock.category).toBe('BUSINESS');
    expect(negStock.code).toBe('NEGATIVE_STOCK_NOT_ALLOWED');

    const rlsViolation = mapSupabaseError({ code: '42501', message: 'permission denied' });
    expect(rlsViolation.category).toBe('AUTHORIZATION');
    expect(rlsViolation.code).toBe('RLS_POLICY_VIOLATION');

    const deadlock = mapSupabaseError({ code: '40P01', message: 'deadlock detected' });
    expect(deadlock.category).toBe('DATABASE');
    expect(deadlock.code).toBe('DB_CONCURRENCY_CONFLICT');
    expect(deadlock.retryable).toBe(true);

    const lockTimeout = mapSupabaseError({ code: '55P03', message: 'could not obtain lock' });
    expect(lockTimeout.category).toBe('DATABASE');
    expect(lockTimeout.code).toBe('DB_LOCK_TIMEOUT');
    expect(lockTimeout.retryable).toBe(true);
  });

  it('maps PostgREST, Auth, Storage, Network, and fallback unexpected errors', () => {
    expect(mapSupabaseError({ code: 'PGRST116' }).code).toBe('RESOURCE_NOT_FOUND');
    expect(mapSupabaseError({ code: 'PGRST301' }).code).toBe('SESSION_EXPIRED');
    expect(
      mapSupabaseError({ code: 'invalid_credentials', message: 'Invalid login credentials' }).code
    ).toBe('INVALID_CREDENTIALS');
    expect(mapSupabaseError({ statusCode: '413', message: 'Payload too large' }).code).toBe(
      'STORAGE_FILE_TOO_LARGE'
    );
    expect(mapSupabaseError({ status: 415, message: 'mime type not supported' }).code).toBe(
      'STORAGE_INVALID_MIME'
    );
    expect(mapSupabaseError(new TypeError('Failed to fetch')).code).toBe('NETWORK_OFFLINE');
    expect(mapSupabaseError(new Error('raw internal error')).code).toBe('UNEXPECTED_ERROR');
  });

  it('maps ZodError into VALIDATION AppError with fieldErrors', () => {
    const schema = z.object({ store_name: z.string().min(2) });
    const result = schema.safeParse({ store_name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const mapped = mapZodError(result.error);
      expect(mapped.category).toBe('VALIDATION');
      expect(mapped.code).toBe('VALIDATION_ERROR');
      expect(mapped.fieldErrors?.[0]?.field).toBe('store_name');
    }
  });

  it('enforces strict Fail-Closed allowlist in sanitizeErrorMeta and drops PII and unknown keys', () => {
    const clean = sanitizeErrorMeta({
      orderId: 'ord-99',
      phone: '5215500000000',
      whatsapp_number: '50499999999',
      dni: '0801-1990-00001',
      ip_address: '198.51.100.12',
      raw_sql_detail: 'Key (email)=(secret@example.com) already exists',
      items: [
        {
          sku: 'SKU-1',
          requested: 3,
          available: 1,
          delivery_address: 'Calle 123',
          internal_notes: 'VIP client',
        },
      ],
    });

    expect(clean).toEqual({
      orderId: 'ord-99',
      items: [{ sku: 'SKU-1', requested: 3, available: 1 }],
    });
  });
});
