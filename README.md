# Online Store Platform

**Autor y Propietario Exclusivo:** [JoNa](https://github.com/jona-datasol)  
**Licencia:** Propietaria — Todos los derechos reservados (`Copyright (c) 2026 JoNa`).

---

## Vision del Proyecto

Plataforma comercial hibrida de comercio electronico disenada bajo estandares senior de ingenieria de software: catalogo online publico Mobile First + solicitudes transaccionales de compra mediante WhatsApp + panel administrativo responsive con inventario trazable y configuracion 100% dinamica desde la interfaz.

## Arquitectura y Stack Tecnologico

- **Frontend:** React, TypeScript (Strict), Vite, Tailwind CSS v4, React Router, TanStack Query, Zod, Lucide Icons.
- **Backend y Datos:** Supabase (PostgreSQL, Auth, Storage, Row Level Security y funciones RPC transaccionales).
- **Calidad y Testing:** ESLint, Prettier, Vitest, Testing Library, Playwright (4 viewports Mobile First).
- **Infraestructura y Despliegue:** Vercel + GitHub Actions CI/CD.

## Capacidades Clave de Ingenieria

- **Configuracion 100% Dinamica:** Identidad de marca, colores (con contraste automatico WCAG 2.2 AA), moneda, impuestos, numero/horario WhatsApp y politicas gestionadas desde la interfaz administrativa (`site_settings`).
- **Diseno Mobile First y Accesibilidad:** Sistema de diseno modular (_Precision Retail_), areas tactiles >= 44px, tablas administrativas adaptativas y estandar WCAG 2.2 AA.
- **Integridad Comercial y Seguridad:** Recalculo de precios/promociones en servidor, bloqueo transaccional `FOR UPDATE` contra sobreventa, snapshots inmutables en pedidos, inventario append-only y politicas RLS Fail Closed.
- **Flujo WhatsApp Transaccional:** Persistencia previa obligatoria en base de datos con `idempotency_key` antes de generar el enlace prellenado de WhatsApp y respaldo de copiado.

## Estado del Proyecto (Roadmap)

- **Fase 0 — Reconocimiento y Gobernanza:** Completada.
- **Sprint 1 — Arquitectura, Producto, Seguridad, Design System y Toolchain CI/CD:** Completado y aprobado.
- **Sprint 2 — Migraciones SQL/RLS/Storage (auditadas), Capa Base de Servicios/Errores, Libreria UI Base y Motor Dinamico de Temas (WCAG 2.2 AA):** Completado y aprobado (29 pruebas unitarias en verde).
- **Sprint 3 — MVP Publico (Catalogo Mobile First, Ficha de Producto con Variantes/JSON-LD, Carrito Persistente y Flujo Transaccional WhatsApp):** Completado y aprobado (43 pruebas unitarias en verde).
- **Sprint 4 — MVP Administrativo (Auth Admin, CRUD Catalogo/Storage, Inventario Trazable, Pedidos, Clientes y Configuracion Dinamica `site_settings`):** Siguiente iteracion.

## Autoria y Propiedad Intelectual

Disenado, arquitectado y desarrollado exclusivamente por **[JoNa](https://github.com/jona-datasol)**.  
El codigo fuente, migraciones SQL y especificaciones internas se mantienen privados bajo licencia propietaria. Consulta [AUTHORSHIP.md](./AUTHORSHIP.md) y [LICENSE](./LICENSE).
