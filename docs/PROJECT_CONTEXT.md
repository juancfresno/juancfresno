# juancfresno.com — Project Context

Última actualización: 2026-08-02

## Nombre

`juancfresno` (nombre interno de paquete heredado en `package.json`: `portfolio026` — resto del nombre original del proyecto antes de su consolidación en este repositorio; no afecta al funcionamiento).

## Propósito

Portfolio / sitio personal de Juan C. Fresno. Sirve además como host público de **FDS (Fresno Design System)** bajo `/FDS`, y expone páginas de privacidad estáticas para otros productos de Fresno© (Medida, GLYF).

## Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.4, TypeScript 5.9.3
- **Estilos:** Sass (`src/styles`, arquitectura `_reset` / `_mixins` / `_typography` / `_variables` / `globals`)
- **Animación:** GSAP 3.14.2, `@studio-freight/lenis` (smooth scroll)
- **Fuentes:** `geist` (paquete npm) + Switzer autohospedada en `src/fonts/switzer`
- **Analítica:** `@vercel/analytics`
- **Sin base de datos.** Sin backend propio más allá de las API routes de Next.

## Estructura

```
src/
├── app/
│   ├── (site)/            — rutas del sitio principal
│   ├── api/cron/refresh-ig/route.ts  — cron de refresco de token Instagram
│   ├── layout.tsx, robots.ts, sitemap.ts
├── components/
│   ├── about/ contact/ home/ layout/ playground/ projects/ ui/
├── fonts/switzer/
├── hooks/useInView.ts
├── lib/feeds/            — integración de feeds externos (ver abajo)
├── providers/            — PageTransition, SmoothScroll
└── styles/
public/
├── FDS/index.html        — Fresno Design System publicado (ver docs/FDS_CONTEXT.md)
├── images/               — assets del sitio (.webp)
└── medida/privacidad/    — página estática de privacidad de Medida
```

## Repositorio

- GitHub: `https://github.com/juancfresno/juancfresno.git`
- Rama activa: `main`
- Working tree al cerrar esta fase: limpio
- Último commit verificado: `45dce19` — "docs(fds): recover latest local FDS version"

## Vercel

- URL de producción conocida: `https://juancfresno.vercel.app` (constante `SITE_URL` en `src/app/sitemap.ts`, `robots.ts` y `layout.tsx` — metadataBase)
- `vercel.json`:
  - Cron `refresh-ig`: `GET /api/cron/refresh-ig` cada 14 días — refresca el token de larga duración de Instagram (dura 60 días, se refresca 4 veces antes de expirar)
  - Headers: `/FDS/(.*)` con `Cache-Control: public, max-age=0, must-revalidate` (no-cache real en el CDN para la doc del design system, para que las actualizaciones se vean al instante)
- No hay `.vercel/project.json` local — el enlace Git↔Vercel se gestiona vía integración de GitHub, no vía CLI en esta máquina.
- **Dominio custom:** NO CONSTA en el código ni en configuración local si `juancfresno.com` (dominio propio) está apuntado a este proyecto de Vercel o si el proyecto vive solo bajo `juancfresno.vercel.app`. Requiere verificación directa en el dashboard de Vercel.

## Variables / servicios (nombres, sin valores)

Variables de entorno referenciadas en el código:

- `INSTAGRAM_ACCESS_TOKEN` — token de larga duración de la Instagram Graph API
- `DRIBBBLE_ACCESS_TOKEN` — token de acceso a la API de Dribbble
- `CRON_SECRET` — valida que las llamadas a `/api/cron/refresh-ig` vengan de Vercel Cron
- `VERCEL_TOKEN` — usado por la ruta de cron para actualizar la env var vía API REST de Vercel tras refrescar el token de Instagram
- `VERCEL_PROJECT_ID` — id del proyecto en Vercel, usado junto a `VERCEL_TOKEN`

No existe `.env.example` en el repo — ver `docs/RECOVERY.md` para la lista completa a reconstruir.

## Cron jobs

- `refresh-ig` (cada 14 días, `0 3 */14 * *`) → `src/app/api/cron/refresh-ig/route.ts` → refresca `INSTAGRAM_ACCESS_TOKEN` antes de que caduque (60 días de vida).

## FDS (Fresno Design System)

Publicado en `public/FDS/index.html`, servido en `/FDS`. Ver `docs/FDS_CONTEXT.md` y `docs/FDS_CHANGE_PROTOCOL.md` para gobernanza completa. Regla resumida: Figma es la fuente de diseño, este `index.html` es la documentación publicada, GitHub es la fuente técnica/historial, Vercel es el entorno de publicación.

## Assets

- `public/images/*.webp` — imágenes del sitio principal
- `public/medida/privacidad/` — página de privacidad estática de Medida
- Página de privacidad de GLYF también servida como ruta estática (ver commits recientes `feat: add GLYF privacy policy static page at /glyf/privacy`)

## Fuentes de verdad

| Aspecto | Fuente |
|---|---|
| Código y versión | GitHub (`juancfresno/juancfresno`) |
| Despliegue | Vercel |
| Diseño de FDS | Figma (`FDS`, file ID `7Uco2E5gV4JdqojI7J3kTX`) |
| Estado, decisiones y tareas | NOEZ (Notion) |
| Copias publicadas / exports | Google Drive, bajo `NOEZ/01 Brands/Fresno/...` |

## Flujo de desarrollo

1. Cambios en `main` (sin ramas de feature documentadas actualmente).
2. `npm run dev` para desarrollo local.
3. Commit + push a `origin/main`.
4. Vercel despliega automáticamente desde `main` (integración GitHub↔Vercel; no confirmado si hay preview deployments por PR ya que no se usan ramas de feature actualmente).

## Despliegue

- `npm run build` → `next build` (usa `.next/` como salida, ignorado por Git)
- Sin pasos de post-build adicionales conocidos más allá del cron descrito arriba.

## Decisiones registradas

- FDS se sirve como HTML estático embebido dentro de este mismo proyecto Next.js (no como proyecto Vercel separado) para simplificar el despliegue y compartir dominio.
- El feed de Instagram/Dribbble pasó de ser estático (imágenes numeradas en `public/feed/`, ver `juancfresno_partial_backup`) a dinámico vía API — decisión ya tomada, backup histórico documentado en `NOEZ_EXECUTION_2026-08-02/JUANFRESNO_BACKUP_COMPARISON.md`.

## Riesgos

- No hay `.env.example` — la reconstrucción del entorno depende de esta documentación y de la memoria del propietario.
- El refresco de token de Instagram depende de tres variables encadenadas (`INSTAGRAM_ACCESS_TOKEN`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `CRON_SECRET`): si cualquiera falta o expira sin que el cron lo detecte a tiempo, el feed de Instagram deja de actualizarse silenciosamente (no hay alerta activa conocida).
- Dominio custom (`juancfresno.com` si existe) no verificado desde este repo — riesgo de asumir un dominio que no esté realmente enlazado en Vercel.
- `package.json` conserva el nombre interno `portfolio026`, lo que puede confundir en herramientas que listan proyectos por nombre de paquete.

## Pendientes reales

- Confirmar en el dashboard de Vercel si hay dominio propio (`juancfresno.com`) apuntado, más allá de `juancfresno.vercel.app`.
- Decidir el destino final de `products/web/juancfresno_partial_backup` (contiene únicamente el feed estático obsoleto — ver comparación en `NOEZ_EXECUTION_2026-08-02/`).
- Crear `.env.example` real (ver `docs/RECOVERY.md`).

## Rutas

- Local: `/Users/juancfresno/Documents/Fresno Studio/products/web/juancfresno`
- GitHub: `https://github.com/juancfresno/juancfresno.git`
- Producción: `https://juancfresno.vercel.app`

## Fecha de actualización

2026-08-02
