# Architecture Decision Records — Resumen Ejecutivo (Sanitizado)

**Autor y Propietario Exclusivo:** [JoNa](https://github.com/jona-datasol)  
**Propósito:** Documentar las decisiones arquitectónicas clave de **Online Store Platform** sin exponer código propietario ni credenciales internas.

---

## ADR-001: Separación estricta de 5 capas en Frontend + RPC Transaccional en PostgreSQL
- **Contexto:** Un catálogo comercial con checkout vía WhatsApp corre alto riesgo de manipulación de precios en el cliente y sobreventa en concurrencia si el navegador calcula totales o descuenta inventario directamente.
- **Decisión:**
  - El frontend sigue una arquitectura de 5 capas: `UI -> Aplicación (TanStack Query/Hooks) -> Dominio (Zod/Theme) -> Capa de Servicios -> Supabase (PostgreSQL + RLS + RPC)`.
  - Toda operación crítica (creación de pedido, ajuste de stock, transición de estado) se ejecuta dentro de funciones RPC atómicas en PostgreSQL.
- **Consecuencias:** Cero lógica de precios o descuentos confiada al cliente; el navegador solo muestra estimaciones y recibe el folio y totales definitivos desde el servidor.

## ADR-002: Integridad de Inventario con Bloqueo Pesimista (`FOR UPDATE`) y Ledger Append-Only
- **Contexto:** Dos clientes comprando simultáneamente la última unidad pueden causar saldo negativo o ventas duplicadas si solo se valida stock en React.
- **Decisión:**
  - Las transacciones de pedido bloquean deterministamente las filas de `inventory` ordenadas por `variant_id` usando `SELECT ... FOR UPDATE` (evitando deadlocks circulares).
  - La tabla `inventory_movements` opera como **ledger append-only** (sin `UPDATE`/`DELETE` permitidos para ningún rol de aplicación) y soporta `idempotency_key` única por operación.
  - `available_quantity` es una columna generada (`GENERATED ALWAYS AS (quantity - reserved_quantity) STORED`), eliminando desincronización.

## ADR-003: Flujo WhatsApp Transaccional con Persistencia Previa e Idempotencia
- **Contexto:** Redirigir al usuario a WhatsApp antes de persistir el pedido provoca pérdida de trazabilidad, pedidos fantasma o duplicados cuando el cliente reintenta por mala conexión.
- **Decisión:**
  - El cliente genera un `idempotency_key` determinista por intento de checkout.
  - El RPC valida stock, recalcula precios y promociones en servidor, persiste el pedido + snapshots inmutables de `order_items` y devuelve el folio verificado **antes** de construir la URL `wa.me` y el respaldo de copiado.
  - Si un reintento envía la misma `idempotency_key`, PostgreSQL devuelve el pedido existente sin duplicar orden ni descuento de stock.

## ADR-004: Seguridad Fail Closed (RLS + Allowlist de Errores + Same-Origin Telemetry)
- **Contexto:** Exponer tablas administrativas o filtrar PII en mensajes de error compromete datos de clientes y operación del negocio.
- **Decisión:**
  - Todas las tablas tienen Row Level Security (RLS) habilitado con denegación por defecto.
  - La normalización de errores (`src/lib/errors.ts`) usa una **allowlist estricta** (`SAFE_ERROR_META_KEYS`) para metadatos devueltos al cliente, descartando automáticamente PII o campos desconocidos.
  - El endpoint de telemetría (`/api/track`) valida `Origin`/`Referer` Same-Origin, excluye tráfico autenticado de administradores y aplica rate-limit en servidor.

## ADR-005: Analítica Verificable de 4 Capas (SQL/Reglas + IA Acotada)
- **Contexto:** Delegar cálculos de KPIs o diagnósticos directamente a un LLM produce alucinaciones numéricas y recomendaciones sin respaldo.
- **Decisión:**
  - **Descriptiva:** KPIs y series agregadas exclusivamente en SQL.
  - **Diagnóstica:** Detección de anomalías y productos sin conversión mediante reglas estadísticas deterministas.
  - **Predictiva:** Proyección de ingresos (regresión lineal) y *Days of Supply* (estimación de agotamiento de stock) calculados en PostgreSQL + motor estadístico.
  - **Prescriptiva:** Sistema de puntuación de prioridad determinista + capa explicativa acotada. Cada KPI exhibe metadatos de calidad de datos (período, observaciones, criterio de inclusión y fecha de corte).
