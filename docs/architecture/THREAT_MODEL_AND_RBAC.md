# Modelo de Amenazas y Matriz de Permisos RBAC (Sanitizado)

**Autor y Propietario Exclusivo:** [JoNa](https://github.com/jona-datasol)  
**Enfoque:** Seguridad *Fail Closed* por defecto en PostgreSQL (RLS), capa de servicios y cabeceras HTTP.

---

## Modelo de Amenazas y Controles Aplicados

| Amenaza (OWASP / E-commerce) | Riesgo | Control Implementado |
| :--- | :--- | :--- |
| **Manipulación de precios en cliente** | Crítico | El frontend envía únicamente `variant_id` y `quantity`; el RPC en PostgreSQL recalcula precios, impuestos y promociones desde tablas autoritativas. |
| **Sobreventa por condición de carrera** | Crítico | Bloqueo pesimista `SELECT ... FOR UPDATE` ordenado deterministamente sobre `inventory` dentro de la transacción de creación de pedido. |
| **Acceso no autorizado a datos administrativos** | Crítico | RLS habilitado en todas las tablas; rol `anon` solo tiene lectura sobre catálogo activo y configuración pública sanitizada (`site_settings` sin credenciales). |
| **Exposición de secretos privilegiados en cliente** | Crítico | Cero uso de `service_role` en frontend; prueba automatizada (`tests/unit/securityBundle.test.ts`) escanea código fuente y bundle compilado `dist/`. |
| **Fuga de PII en errores de aplicación** | Alto | Normalización centralizada (`src/lib/errors.ts`) con **allowlist estricta** (`SAFE_ERROR_META_KEYS`); campos sensibles o desconocidos se descartan automáticamente. |
| **Inyección CSS / XSS vía configuración visual** | Alto | Sanitización estricta de colores HEX (`/^#[0-9A-Fa-f]{6}$/`) en `src/lib/theme.ts`, whitelist de MIME en imágenes (sin SVG ejecutable) y cabeceras CSP/HSTS en `vercel.json`. |
| **Spam o falsificación en telemetría** | Medio | Endpoint `/api/track` con verificación Same-Origin (`Origin`/`Referer`), rate-limit en servidor y exclusión automática de sesiones administrativas. |

---

## Matriz de Permisos por Rol (RBAC + RLS)

| Recurso / Operación | `anon` (Visitante) | `staff` (Operador) | `admin` | `super_admin` |
| :--- | :---: | :---: | :---: | :---: |
| Catálogo activo (`products`, `categories`, `brands`, `variants`) | Lectura | Lectura / Edición | CRUD completo | CRUD completo |
| `site_settings` (identidad, paleta, políticas públicas) | Lectura pública | Lectura | Lectura / Edición | Lectura / Edición |
| Creación de solicitud WhatsApp (RPC transaccional) | Ejecución (validada) | Ejecución | Ejecución | Ejecución |
| Consulta de pedidos y clientes (`orders`, `customers`) | Denegado | Lectura / Gestión estado | Lectura / Gestión | Lectura / Gestión |
| Ajustes de inventario (`inventory`, `inventory_movements`) | Denegado | Ajuste trazable (append-only) | Ajuste trazable (append-only) | Ajuste trazable (append-only) |
| Modificar / Eliminar historial de `inventory_movements` | Denegado | Denegado | Denegado | Denegado |
| Promociones (`promotions`) | Validación vía RPC | Lectura | CRUD completo | CRUD completo |
| Analítica IA y telemetría (`storefront_events`, reportes) | Inserción controlada vía `/api/track` | Lectura | Lectura | Lectura |
| Gestión de equipo y roles (`profiles`, `user_roles`) | Denegado | Denegado | Lectura | Administración completa |
