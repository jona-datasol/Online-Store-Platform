/**
 * Centralized error taxonomy and Supabase/PostgreSQL error normalizer.
 * Author: JoNa (https://github.com/jona-datasol)
 */
import type { ZodError } from 'zod';

export type AppErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'BUSINESS'
  | 'DATABASE'
  | 'NETWORK'
  | 'UNEXPECTED';

export type ErrorCategory = AppErrorCategory;

export type ValidationErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT_FORMAT'
  | 'INVALID_PHONE_E164'
  | 'INVALID_HEX_COLOR'
  | 'INVALID_THEME_CONTRAST'
  | 'REASON_REQUIRED'
  | 'STORAGE_INVALID_MIME'
  | 'STORAGE_FILE_TOO_LARGE';

export type AuthErrorCode =
  'INVALID_CREDENTIALS' | 'SESSION_EXPIRED' | 'UNAUTHENTICATED' | 'ACCOUNT_INACTIVE';

export type AuthorizationErrorCode = 'FORBIDDEN' | 'ADMIN_ROLE_REQUIRED' | 'RLS_POLICY_VIOLATION';

export type BusinessErrorCode =
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_STOCK'
  | 'PRICE_CHANGED'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'INVALID_STATUS_TRANSITION'
  | 'CART_EMPTY'
  | 'MAX_QUANTITY_EXCEEDED'
  | 'PRODUCT_UNAVAILABLE'
  | 'VARIANT_UNAVAILABLE'
  | 'PROMOTION_INVALID'
  | 'PROMOTION_EXPIRED'
  | 'PROMOTION_MIN_ORDER_NOT_MET'
  | 'PROMOTION_USAGE_LIMIT_REACHED'
  | 'WHATSAPP_NOT_CONFIGURED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_IN_USE'
  | 'NEGATIVE_STOCK_NOT_ALLOWED'
  | 'RATE_LIMIT_EXCEEDED';

export type DatabaseErrorCode =
  | 'DB_UNIQUE_VIOLATION'
  | 'DB_FOREIGN_KEY_VIOLATION'
  | 'DB_CHECK_VIOLATION'
  | 'DB_CONCURRENCY_CONFLICT'
  | 'DB_LOCK_TIMEOUT'
  | 'DB_QUERY_FAILED';

export type NetworkErrorCode = 'NETWORK_OFFLINE' | 'NETWORK_TIMEOUT' | 'SERVICE_UNAVAILABLE';

export type UnexpectedErrorCode = 'UNEXPECTED_ERROR';

export type AppErrorCode =
  | ValidationErrorCode
  | AuthErrorCode
  | AuthorizationErrorCode
  | BusinessErrorCode
  | DatabaseErrorCode
  | NetworkErrorCode
  | UnexpectedErrorCode;

export interface FieldValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface AppError<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  readonly category: AppErrorCategory;
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly fieldErrors?: readonly FieldValidationError[];
  readonly meta?: Readonly<TMeta>;
  readonly timestamp: string;
}

export interface CreateAppErrorInput<
  TMeta extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly category: AppErrorCategory;
  readonly code: AppErrorCode;
  readonly userMessage: string;
  readonly httpStatus: number;
  readonly retryable?: boolean;
  readonly fieldErrors?: readonly FieldValidationError[];
  readonly meta?: Readonly<TMeta>;
}

const PII_KEYS = new Set([
  'phone',
  'customer_phone',
  'customerPhone',
  'phone_e164',
  'phoneE164',
  'email',
  'customer_email',
  'customerEmail',
  'address',
  'delivery_address',
  'deliveryAddress',
  'address_summary',
  'customer_name',
  'customerName',
  'full_name',
  'fullName',
  'password',
  'token',
  'access_token',
]);

const BUSINESS_ERROR_DEFAULTS: Readonly<
  Record<
    BusinessErrorCode,
    { readonly userMessage: string; readonly httpStatus: number; readonly retryable: boolean }
  >
> = {
  OUT_OF_STOCK: {
    userMessage: 'Uno o mas productos se encuentran agotados.',
    httpStatus: 409,
    retryable: false,
  },
  INSUFFICIENT_STOCK: {
    userMessage: 'No hay stock suficiente para completar la operacion.',
    httpStatus: 409,
    retryable: false,
  },
  PRICE_CHANGED: {
    userMessage: 'El precio de uno o mas productos cambio. Revisa tu carrito antes de continuar.',
    httpStatus: 409,
    retryable: false,
  },
  DUPLICATE_IDEMPOTENCY_KEY: {
    userMessage: 'Esta solicitud ya fue registrada previamente.',
    httpStatus: 409,
    retryable: false,
  },
  INVALID_STATUS_TRANSITION: {
    userMessage: 'La transicion de estado solicitada no esta permitida.',
    httpStatus: 422,
    retryable: false,
  },
  CART_EMPTY: {
    userMessage: 'El carrito esta vacio.',
    httpStatus: 422,
    retryable: false,
  },
  MAX_QUANTITY_EXCEEDED: {
    userMessage: 'La cantidad solicitada supera el maximo permitido por articulo.',
    httpStatus: 422,
    retryable: false,
  },
  PRODUCT_UNAVAILABLE: {
    userMessage: 'El producto solicitado no esta disponible.',
    httpStatus: 409,
    retryable: false,
  },
  VARIANT_UNAVAILABLE: {
    userMessage: 'La variante seleccionada no esta disponible.',
    httpStatus: 409,
    retryable: false,
  },
  PROMOTION_INVALID: {
    userMessage: 'El codigo promocional no es valido.',
    httpStatus: 422,
    retryable: false,
  },
  PROMOTION_EXPIRED: {
    userMessage: 'La promocion ha expirado o aun no esta vigente.',
    httpStatus: 422,
    retryable: false,
  },
  PROMOTION_MIN_ORDER_NOT_MET: {
    userMessage: 'El pedido no alcanza el monto minimo requerido para esta promocion.',
    httpStatus: 422,
    retryable: false,
  },
  PROMOTION_USAGE_LIMIT_REACHED: {
    userMessage: 'La promocion alcanzo su limite maximo de usos.',
    httpStatus: 409,
    retryable: false,
  },
  WHATSAPP_NOT_CONFIGURED: {
    userMessage: 'La tienda esta completando su configuracion de WhatsApp. Intenta mas tarde.',
    httpStatus: 422,
    retryable: false,
  },
  RESOURCE_NOT_FOUND: {
    userMessage: 'El recurso solicitado no existe o no esta disponible.',
    httpStatus: 404,
    retryable: false,
  },
  RESOURCE_ALREADY_EXISTS: {
    userMessage: 'Ya existe un registro con el mismo identificador unico.',
    httpStatus: 409,
    retryable: false,
  },
  RESOURCE_IN_USE: {
    userMessage:
      'No se puede eliminar este registro porque tiene historial asociado. Usa archivado logico.',
    httpStatus: 409,
    retryable: false,
  },
  NEGATIVE_STOCK_NOT_ALLOWED: {
    userMessage: 'El inventario no puede quedar en saldo negativo ni menor a las reservas activas.',
    httpStatus: 422,
    retryable: false,
  },
  RATE_LIMIT_EXCEEDED: {
    userMessage: 'Has realizado demasiadas solicitudes. Espera un momento antes de reintentar.',
    httpStatus: 429,
    retryable: true,
  },
};

const UNIQUE_CONSTRAINT_FIELD_MAP: Readonly<
  Record<string, { readonly field: string; readonly message: string }>
> = {
  uq_products_slug: { field: 'slug', message: 'Ya existe un producto con este slug.' },
  uq_categories_slug: { field: 'slug', message: 'Ya existe una categoria con este slug.' },
  uq_brands_slug: { field: 'slug', message: 'Ya existe una marca con este slug.' },
  uq_product_variants_sku: { field: 'sku', message: 'Ya existe una variante con este SKU.' },
  uq_promotions_code: { field: 'code', message: 'Ya existe una promocion con este codigo.' },
  uq_customers_phone_e164: {
    field: 'phone_e164',
    message: 'Ya existe un cliente registrado con este telefono.',
  },
  uq_orders_order_number: {
    field: 'order_number',
    message: 'El numero de pedido ya existe.',
  },
};

export function createAppError<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  input: CreateAppErrorInput<TMeta>
): AppError<TMeta> {
  return {
    category: input.category,
    code: input.code,
    userMessage: input.userMessage,
    httpStatus: input.httpStatus,
    retryable: input.retryable ?? false,
    ...(input.fieldErrors ? { fieldErrors: input.fieldErrors } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.category === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.userMessage === 'string' &&
    typeof candidate.httpStatus === 'number' &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.timestamp === 'string'
  );
}

export function sanitizeErrorMeta(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (PII_KEYS.has(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? sanitizeErrorMeta(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorMeta(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function mapZodError(error: ZodError): AppError {
  const fieldErrors: FieldValidationError[] = error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '_root',
    code: issue.code,
    message: issue.message,
  }));

  return createAppError({
    category: 'VALIDATION',
    code: 'VALIDATION_ERROR',
    userMessage: 'Revisa los datos ingresados antes de continuar.',
    httpStatus: 400,
    retryable: false,
    fieldErrors,
  });
}

interface RawSupabaseLikeError {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly details?: unknown;
  readonly hint?: unknown;
  readonly status?: unknown;
  readonly statusCode?: unknown;
  readonly name?: unknown;
}

function asRawError(error: unknown): RawSupabaseLikeError {
  if (typeof error === 'object' && error !== null) {
    return error as RawSupabaseLikeError;
  }
  return {};
}

function isBusinessErrorCode(value: string): value is BusinessErrorCode {
  return Object.prototype.hasOwnProperty.call(BUSINESS_ERROR_DEFAULTS, value);
}

function parseJsonDetail(details: unknown): Record<string, unknown> | null {
  if (typeof details !== 'string' || details.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(details);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function extractNumericStatus(raw: RawSupabaseLikeError): number | null {
  if (typeof raw.status === 'number') {
    return raw.status;
  }
  if (typeof raw.statusCode === 'number') {
    return raw.statusCode;
  }
  if (typeof raw.statusCode === 'string') {
    const parsed = Number.parseInt(raw.statusCode, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function mapUniqueConstraintError(raw: RawSupabaseLikeError): AppError {
  const combinedText = `${String(raw.message ?? '')} ${String(raw.details ?? '')}`;
  for (const [constraintName, mapping] of Object.entries(UNIQUE_CONSTRAINT_FIELD_MAP)) {
    if (combinedText.includes(constraintName)) {
      return createAppError({
        category: 'BUSINESS',
        code: 'RESOURCE_ALREADY_EXISTS',
        userMessage: mapping.message,
        httpStatus: 409,
        retryable: false,
        fieldErrors: [
          {
            field: mapping.field,
            code: 'unique_violation',
            message: mapping.message,
          },
        ],
      });
    }
  }

  return createAppError({
    category: 'DATABASE',
    code: 'DB_UNIQUE_VIOLATION',
    userMessage: 'Ya existe un registro con los mismos datos unicos.',
    httpStatus: 409,
    retryable: false,
  });
}

function mapRaisedBusinessException(raw: RawSupabaseLikeError): AppError {
  const rawMessage = typeof raw.message === 'string' ? raw.message.trim() : '';
  const parsedDetail = parseJsonDetail(raw.details);
  const detailCode =
    parsedDetail && typeof parsedDetail.code === 'string' ? parsedDetail.code.trim() : '';
  const resolvedCode = detailCode || rawMessage;

  if (resolvedCode === 'FORBIDDEN' || resolvedCode === 'ADMIN_ROLE_REQUIRED') {
    return createAppError({
      category: 'AUTHORIZATION',
      code: resolvedCode === 'ADMIN_ROLE_REQUIRED' ? 'ADMIN_ROLE_REQUIRED' : 'FORBIDDEN',
      userMessage: 'No tienes permisos suficientes para realizar esta operacion.',
      httpStatus: 403,
      retryable: false,
    });
  }

  if (resolvedCode === 'REASON_REQUIRED') {
    return createAppError({
      category: 'VALIDATION',
      code: 'REASON_REQUIRED',
      userMessage: 'Debes indicar un motivo valido para completar esta accion.',
      httpStatus: 400,
      retryable: false,
    });
  }

  if (isBusinessErrorCode(resolvedCode)) {
    const defaults = BUSINESS_ERROR_DEFAULTS[resolvedCode];
    const meta = parsedDetail ? sanitizeErrorMeta(parsedDetail) : undefined;
    if (meta && 'code' in meta) {
      delete meta.code;
    }

    return createAppError({
      category: 'BUSINESS',
      code: resolvedCode,
      userMessage: defaults.userMessage,
      httpStatus: defaults.httpStatus,
      retryable: defaults.retryable,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    });
  }

  return createAppError({
    category: 'BUSINESS',
    code: 'VALIDATION_ERROR',
    userMessage: 'La operacion no cumple las reglas comerciales vigentes.',
    httpStatus: 422,
    retryable: false,
  });
}

export function mapSupabaseError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createAppError({
      category: 'NETWORK',
      code: 'NETWORK_TIMEOUT',
      userMessage: 'La solicitud tardo demasiado en responder. Intenta nuevamente.',
      httpStatus: 504,
      retryable: true,
    });
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return createAppError({
      category: 'NETWORK',
      code: 'NETWORK_OFFLINE',
      userMessage: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.',
      httpStatus: 0,
      retryable: true,
    });
  }

  const raw = asRawError(error);
  const code = typeof raw.code === 'string' ? raw.code.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message : '';
  const status = extractNumericStatus(raw);

  // PostgreSQL SQLSTATE codes
  if (code === 'P0001') {
    return mapRaisedBusinessException(raw);
  }

  if (code === '23505') {
    return mapUniqueConstraintError(raw);
  }

  if (code === '23503') {
    return createAppError({
      category: 'BUSINESS',
      code: 'RESOURCE_IN_USE',
      userMessage: BUSINESS_ERROR_DEFAULTS.RESOURCE_IN_USE.userMessage,
      httpStatus: 409,
      retryable: false,
    });
  }

  if (code === '23514') {
    const combined = `${message} ${String(raw.details ?? '')}`.toLowerCase();
    if (
      combined.includes('inventory') ||
      combined.includes('quantity') ||
      combined.includes('stock')
    ) {
      return createAppError({
        category: 'BUSINESS',
        code: 'NEGATIVE_STOCK_NOT_ALLOWED',
        userMessage: BUSINESS_ERROR_DEFAULTS.NEGATIVE_STOCK_NOT_ALLOWED.userMessage,
        httpStatus: 422,
        retryable: false,
      });
    }

    return createAppError({
      category: 'VALIDATION',
      code: 'DB_CHECK_VIOLATION',
      userMessage: 'Uno o mas valores estan fuera del rango permitido.',
      httpStatus: 422,
      retryable: false,
    });
  }

  if (code === '23502') {
    return createAppError({
      category: 'VALIDATION',
      code: 'VALIDATION_ERROR',
      userMessage: 'Faltan campos obligatorios para completar la operacion.',
      httpStatus: 400,
      retryable: false,
    });
  }

  if (code === '22P02') {
    return createAppError({
      category: 'VALIDATION',
      code: 'INVALID_INPUT_FORMAT',
      userMessage: 'El formato de uno de los datos enviados no es valido.',
      httpStatus: 400,
      retryable: false,
    });
  }

  if (code === '42501') {
    return createAppError({
      category: 'AUTHORIZATION',
      code: 'RLS_POLICY_VIOLATION',
      userMessage: 'No tienes permisos para acceder o modificar este recurso.',
      httpStatus: 403,
      retryable: false,
    });
  }

  if (code === '40001' || code === '40P01') {
    return createAppError({
      category: 'DATABASE',
      code: 'DB_CONCURRENCY_CONFLICT',
      userMessage: 'Otro proceso modifico este recurso al mismo tiempo. Intenta nuevamente.',
      httpStatus: 409,
      retryable: true,
    });
  }

  if (code === '55P03') {
    return createAppError({
      category: 'DATABASE',
      code: 'DB_LOCK_TIMEOUT',
      userMessage: 'El recurso esta temporalmente ocupado. Intenta nuevamente en unos segundos.',
      httpStatus: 503,
      retryable: true,
    });
  }

  // PostgREST codes
  if (code === 'PGRST116') {
    return createAppError({
      category: 'BUSINESS',
      code: 'RESOURCE_NOT_FOUND',
      userMessage: BUSINESS_ERROR_DEFAULTS.RESOURCE_NOT_FOUND.userMessage,
      httpStatus: 404,
      retryable: false,
    });
  }

  if (code === 'PGRST301' || /jwt expired/i.test(message)) {
    return createAppError({
      category: 'AUTHENTICATION',
      code: 'SESSION_EXPIRED',
      userMessage: 'Tu sesion ha expirado. Inicia sesion nuevamente.',
      httpStatus: 401,
      retryable: false,
    });
  }

  // Supabase Auth errors
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return createAppError({
      category: 'AUTHENTICATION',
      code: 'INVALID_CREDENTIALS',
      userMessage: 'Correo electronico o contrasena incorrectos.',
      httpStatus: 401,
      retryable: false,
    });
  }

  if (code === 'over_request_rate_limit' || status === 429) {
    return createAppError({
      category: 'BUSINESS',
      code: 'RATE_LIMIT_EXCEEDED',
      userMessage: BUSINESS_ERROR_DEFAULTS.RATE_LIMIT_EXCEEDED.userMessage,
      httpStatus: 429,
      retryable: true,
    });
  }

  // Supabase Storage errors
  if (status === 413 || /payload too large|maximum allowed size/i.test(message)) {
    return createAppError({
      category: 'VALIDATION',
      code: 'STORAGE_FILE_TOO_LARGE',
      userMessage: 'El archivo excede el tamano maximo permitido.',
      httpStatus: 400,
      retryable: false,
    });
  }

  if (status === 415 || /mime type.*not supported|invalid mime/i.test(message)) {
    return createAppError({
      category: 'VALIDATION',
      code: 'STORAGE_INVALID_MIME',
      userMessage: 'El formato del archivo no esta permitido.',
      httpStatus: 400,
      retryable: false,
    });
  }

  if (status === 401) {
    return createAppError({
      category: 'AUTHENTICATION',
      code: 'UNAUTHENTICATED',
      userMessage: 'Debes iniciar sesion para continuar.',
      httpStatus: 401,
      retryable: false,
    });
  }

  if (status === 403) {
    return createAppError({
      category: 'AUTHORIZATION',
      code: 'FORBIDDEN',
      userMessage: 'No tienes permisos para realizar esta operacion.',
      httpStatus: 403,
      retryable: false,
    });
  }

  if (status === 503 || status === 504) {
    return createAppError({
      category: 'NETWORK',
      code: 'SERVICE_UNAVAILABLE',
      userMessage: 'El servicio no esta disponible temporalmente. Intenta nuevamente.',
      httpStatus: status,
      retryable: true,
    });
  }

  if (code.length > 0 && /^[0-9A-Z]{5}$/.test(code)) {
    return createAppError({
      category: 'DATABASE',
      code: 'DB_QUERY_FAILED',
      userMessage: 'Ocurrio un error al procesar los datos. Intenta nuevamente.',
      httpStatus: 500,
      retryable: false,
    });
  }

  return createAppError({
    category: 'UNEXPECTED',
    code: 'UNEXPECTED_ERROR',
    userMessage: 'Ocurrio un error inesperado. Intenta nuevamente.',
    httpStatus: 500,
    retryable: false,
  });
}
