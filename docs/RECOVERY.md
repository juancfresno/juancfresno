# juancfresno.com — Recovery Guide

Cómo reconstruir este proyecto desde cero si el entorno local se pierde.

## 1. Clonar

```
git clone https://github.com/juancfresno/juancfresno.git
cd juancfresno
```

## 2. Dependencias

```
npm install
```

Dependencias clave (ver `package.json` para versiones exactas): Next.js, React 19, TypeScript, Sass, GSAP, Lenis, `geist`, `@vercel/analytics`.

## 3. Variables de entorno necesarias

Crear un `.env.local` con estas claves (valores no incluidos aquí — obtenerlos del gestor de secretos / dashboard de Vercel):

```
INSTAGRAM_ACCESS_TOKEN=
DRIBBBLE_ACCESS_TOKEN=
CRON_SECRET=
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
```

- `INSTAGRAM_ACCESS_TOKEN`: token de larga duración de la Instagram Graph API (dura 60 días; se refresca automáticamente vía el cron `refresh-ig`).
- `DRIBBBLE_ACCESS_TOKEN`: token de acceso a la API de Dribbble.
- `CRON_SECRET`: secreto compartido para validar que las llamadas a `/api/cron/refresh-ig` vienen de Vercel Cron (Vercel envía `Authorization: Bearer <CRON_SECRET>`).
- `VERCEL_TOKEN` / `VERCEL_PROJECT_ID`: usados por la propia ruta de cron para escribir el token de Instagram refrescado de vuelta en las env vars del proyecto vía la API REST de Vercel.

Sin `INSTAGRAM_ACCESS_TOKEN` ni `DRIBBBLE_ACCESS_TOKEN`, el sitio sigue funcionando pero las secciones de feed devuelven listas vacías (fallback silencioso ya implementado en `src/lib/feeds/instagram.ts`).

## 4. Desarrollo local

```
npm run dev
```

## 5. Build

```
npm run build
npm run start
```

## 6. Vercel

- El proyecto se despliega desde `main` vía integración GitHub↔Vercel (no vía `vercel` CLI local — no hay `.vercel/project.json` en este repo).
- Para reconectar desde cero: crear/importar el proyecto en Vercel apuntando a `juancfresno/juancfresno` en GitHub, configurar las 5 variables de entorno anteriores en el dashboard de Vercel (Production + Preview según corresponda), y confirmar que el cron definido en `vercel.json` (`refresh-ig`, cada 14 días) queda activo — los crons de Vercel se registran automáticamente al desplegar si el plan lo soporta.

## 7. Dominio

- URL de producción conocida: `https://juancfresno.vercel.app`.
- Si existe un dominio propio (`juancfresno.com`) apuntado a este proyecto, debe verificarse y reconectarse manualmente desde el dashboard de Vercel — no hay registro de esto en el código de este repositorio.

## 8. Verificación post-recuperación

1. `npm run build` termina sin errores.
2. `/` carga correctamente en local (`npm run dev`).
3. `/FDS` sirve `public/FDS/index.html` tal cual (foundations + Button/Icon button/FAB visibles, resto de componentes con placeholder "Sección en construcción" — esto es esperado, no un error).
4. `/medida/privacidad` y `/glyf/privacy` cargan como páginas estáticas.
5. Tras desplegar, confirmar en los logs de Vercel que el cron `refresh-ig` existe y su próxima ejecución está programada.

## Fecha de actualización

2026-08-02
