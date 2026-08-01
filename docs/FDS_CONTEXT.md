# FDS — Fresno Design System — Contexto

Última actualización: 2026-08-02

## Propósito

Documentación viva y pública de los foundations y componentes visuales de Fresno©: tokens (color, tipografía, spacing, radius, elevación, iconografía), y el catálogo de componentes de UI, con estado, props, variantes, do/don't y tokens usados por componente.

## Estado real (verificado, no aspiracional)

- **Versión actual:** `v0.1.0` (única entrada de changelog, fecha `2026-06-28`)
- **Foundations — 6/6 con contenido real:** Color (semántico + primitivo, con toggle Light/Dark funcional), Typography (3 familias, escala Desktop/Mobile), Spacing (grid 4px), Radius, Elevation, Icons.
- **Componentes reales — 3, todos "Stable":** Button, Icon button, FAB (categoría "Actions").
- **Componentes listados en el menú pero SIN implementar (placeholder "Sección en construcción"), 34 en total:**
  - Forms (11): Input, Textarea, Select, Search field, Checkbox, Radio, Toggle, Slider, Stepper, Segmented control, Rating
  - Feedback (8): Banner, Toast, Tooltip, Modal, Badge, Progress, Spinner, Skeleton
  - Navigation (6): Top bar, Tab bar, Tabs, Breadcrumb, Pagination, Menu
  - Data display (8): Card, Table, Stat, List item, Avatar, Tag, Chip, Divider
  - Misc (1): Empty state
- **Iconografía:** se documenta como "el set completo de Tabler, 6.146 iconos", pero solo 7 SVG están realmente embebidos en el archivo (los usados en las demos de Button/Icon button/FAB). El resto es descripción, no implementación.

## Figma maestro

- Nombre: **FDS**
- File ID: `7Uco2E5gV4JdqojI7J3kTX`
- URL: `https://www.figma.com/design/7Uco2E5gV4JdqojI7J3kTX/FDS?node-id=10-8`
- Nodo: `10:8`

## Ruta de `index.html`

`public/FDS/index.html` dentro de este mismo repositorio (`juancfresno`), servido públicamente en `/FDS`.

## GitHub

- Repositorio: `https://github.com/juancfresno/juancfresno.git` (FDS vive dentro de este repo, no en uno propio)
- Rama: `main`

## Vercel

- Servido en `https://juancfresno.vercel.app/FDS`
- `vercel.json` fija `Cache-Control: public, max-age=0, must-revalidate` para `/FDS/(.*)` — sin caché de CDN, cada actualización se ve al instante sin invalidación manual.

## Arquitectura actual

Un único archivo HTML autocontenido (705 líneas, ~61 KB):

- **Tokens semánticos** (mode-aware): CSS custom properties en `:root` / `[data-theme="light"]` / `[data-theme="dark"]`.
- **Tokens primitivos**: array JS `PRIMITIVES`, con nombres de rol (`color/neutral/950`, `color/brand/blue/700`, etc.) — los semánticos alias-an estos valores, nunca al revés (regla ya documentada dentro del propio FDS).
- **Componentes**: funciones JS `R.<id>` que generan el HTML de cada sección al vuelo; el router es un simple listener de `location.hash`.
- **Sin build, sin framework, sin dependencias npm propias** (fuera del propio Next.js del repo que lo aloja).
- Tipografía vía CDN externo: Fontshare (Switzer) + Google Fonts (Geist Mono, Instrument Serif).

## Limitaciones conocidas

1. Los tokens de color existen duplicados dentro del propio archivo (una vez como CSS custom properties, otra como array JS `PRIMITIVES`) — no hay una única fuente generadora ni exportación a otro formato.
2. Sin control de versiones granular más allá de un changelog manual de una sola entrada.
3. Sin testing visual / regresión visual.
4. Sin mecanismo de exportación de tokens (no Style Dictionary, no Tokens Studio) — cualquier consumo por parte de un producto requiere copiar valores a mano.
5. Iconografía documentada muy por encima de lo realmente integrado (7 de 6.146 iconos).

## Flujo de gobernanza aprobado

```
Figma → index.html → changelog interno → versión → commit → GitHub → Vercel → verificación → actualización de NOEZ (cuando afecte estado, decisión o trabajo futuro)
```

- Figma es la fuente de diseño.
- `public/FDS/index.html` es la documentación publicada.
- GitHub es la fuente técnica y el historial.
- Vercel es el entorno de publicación.
- El changelog dentro de `index.html` registra cambios visibles.
- Cada cambio aprobado debe reflejarse en Figma, `index.html`, changelog, versión, Git, GitHub y verificación de Vercel.
- No debe existir divergencia silenciosa entre Figma e `index.html`.

Proceso operativo detallado en `docs/FDS_CHANGE_PROTOCOL.md`.

## Proceso de actualización

Ver `docs/FDS_CHANGE_PROTOCOL.md` — resumen: todo cambio visual empieza en Figma, se traduce a mano al `index.html`, se registra en el array `CHANGELOG` con tipo (ADD/CHANGE/REMOVE/FIX/BREAKING), se sube la versión si corresponde, se commitea, se sube a GitHub y se verifica en Vercel.

## Fuentes de verdad

| Aspecto | Fuente |
|---|---|
| Diseño | Figma (`FDS`, `7Uco2E5gV4JdqojI7J3kTX`, nodo `10:8`) |
| Documentación publicada | `public/FDS/index.html` |
| Código e historial | GitHub (`juancfresno/juancfresno`) |
| Publicación | Vercel (`/FDS`) |
| Estado, decisiones y tareas | NOEZ (Notion) |

## Relación actual con Fresno, NOEZ, Forma, Medida, GLYF y Biako

- **Fresno / NOEZ:** FDS es un proyecto bajo el paraguas de Fresno©, gobernado por las reglas anteriores; su estado y decisiones deben reflejarse en NOEZ cuando corresponda.
- **Forma:** mantiene su propio `Forma/DesignSystem/DesignTokens.swift`, con valores de color propios y distintos a los de FDS (auditado de forma independiente en `products/apps/forma/docs/design-system-audit.md`, sin referencia cruzada a FDS).
- **Medida:** mantiene su propio `Medida/DesignSystem/DesignTokens.swift`, igualmente independiente.
- **GLYF:** mantiene su propio `GlyfUI.swift` / `MaterialCatalog.swift`, igualmente independiente.
- **Biako:** sin sistema de diseño formalizado conocido; sin relación técnica con FDS.

**Aclaración explícita: no existe hoy ninguna integración técnica entre FDS y los productos.** FDS no exporta tokens en ningún formato consumible por Swift/CSS/JSON de forma automatizada. Cualquier coincidencia de valores entre FDS y un producto (si la hay) es casual, no derivada de una fuente compartida.

## Riesgos

- Divergencia Figma↔código: al ser un proceso manual, cualquier cambio en Figma que no se traduzca al `index.html` (o viceversa) queda silenciosamente desincronizado — no hay verificación automática.
- Duplicación interna de tokens (CSS + JS) dentro del propio archivo.
- Expectativa vs. realidad: el menú de navegación lista ~40 componentes, de los cuales solo 3 existen — riesgo de percepción para cualquiera que navegue el sitio por primera vez.
- Sin repositorio propio: FDS vive dentro del repo de `juancfresno.com`; un cambio accidental en ese repo podría afectar a FDS y viceversa.
- Sin testing visual: un cambio de CSS global podría romper silenciosamente un componente ya implementado sin que nada lo detecte.

## Backlog técnico

- Extraer los tokens a un archivo de datos único (JSON) del que el HTML de documentación lea, en vez de duplicarlos.
- Definir un mecanismo real de sincronización Figma→código (aunque sea semi-manual con checklist, no solo "se hizo a mano").
- Implementar los 34 componentes pendientes, empezando por Forms (los de mayor uso probable en productos).
- Integrar testing visual básico (aunque sea una comparación de capturas manual documentada) antes de marcar más componentes como "Stable".
- Evaluar si conviene separar FDS a su propio repositorio si su ritmo de cambio empieza a chocar con el de `juancfresno.com`.

## Fecha de actualización

2026-08-02
