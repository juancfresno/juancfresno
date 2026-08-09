# FDS — Fresno Design System — Contexto

Última actualización: 2026-08-09

## Propósito

Documentación viva y pública de los foundations y componentes visuales de Fresno©: tokens (color, tipografía, spacing, radius, elevación, iconografía), contextos de marca, y el catálogo de componentes de UI, con estado, props, variantes, do/don't y tokens usados por componente.

## Estado real (verificado, no aspiracional)

- **Versión actual:** `v1.0.0` (release BREAKING, fecha `2026-08-09`; `v0.1.0` se conserva íntegro en el changelog, append-only)
- **Arquitectura de tokens — 4 capas:** `Primitives → Brand → Semantic → Component`, consumidas por `UI` (el producto). Brand y Theme son ejes independientes; Semantic es el **único** switch Light/Dark. Documentado en la página propia "Token architecture".
- **Foundations — 8/8 con contenido real:** Token architecture, Brand, Color (semántico + primitivo, toggle Light/Dark funcional), Typography (3 familias, 52 estilos de texto: 26 Desktop + 26 Mobile, con corte `-light` en Heading/Body), Spacing (26 pasos, escala Tailwind v4), Radius (5 pasos), Elevation (6 estilos de sombra por capas), Icons.
- **Brand — 5 contextos documentados:** Fresno (canónico, con assets reales), Biakone (assets de wordmark reales, accent/subtle aún neutros), GLYF (identidad "Ink/Cream" pretendida pero **no** reflejada todavía en las variables de Brand — accent/subtle idénticos a la base neutra), Medida y Forma (slot preparado, sin assets). Ver limitaciones abajo.
- **Componentes — 45 raíces canónicas, 0 ejes públicos `Theme`.** Todos los componentes canónicos verificados vía Figma MCP no exponen la propiedad `Theme`; los sets antiguos con `Theme=Light/Dark` sobreviven únicamente como frames ocultos y sin tokens (`.legacy/*`), conservados solo como referencia de rollback.
  - Todas las secciones que antes eran placeholder ("Sección en construcción") tienen ahora documentación real (anatomía, variantes, estados, tokens) sourced desde Figma: Input, Textarea, Select, Search field, Checkbox, Radio, Toggle, Slider, Stepper, Segmented control, Rating, Banner, Toast, Tooltip, Modal, Badge, Progress, Spinner, Skeleton, Top bar, Tab bar, Tabs, Breadcrumb, Pagination, Menu, Card, Table, Stat, List item, Avatar, Tag, Chip, Divider, Empty state.
  - Dos componentes nuevos que no estaban ni como placeholder: **Link** y **Accordion** (existen como componentes canónicos en Figma; se añadieron al menú).
  - **Excepción honesta — Toast:** en el Figma actual, Toast solo existe como specimen legacy oculto basado en `Theme`; no hay todavía un componente canónico migrado sin `Theme`. Se documentó como **Draft**, no Stable, siguiendo el patrón visual del resto del sistema pero marcado como provisional hasta que Figma publique la versión canónica.
  - **Drift corregido, no inventado:** Icon button perdió la variante "ghost" (no existe en Figma — solo primary/neutral/outline); FAB perdió la variante "extended" (Figma solo tiene FAB circular). Ambos se documentaron según el estado real de Figma, no según lo que decía la versión anterior del sitio.
- **Button — migración breaking:** `button/neutral-inverse` y `button/outline-inverse` eliminados de la API pública. El mismo `button/neutral` / `button/outline` ahora resuelve su color bajo `Semantic = Dark` (mismo componente, sin prop `Theme`). Los sets inverse sobreviven en Figma solo como `.legacy/button/*-inverse`, ocultos y sin tokens.
- **Accesibilidad:**
  - `interaction/target/min-web` = 24px, `interaction/target/min-touch` = 44px (documentados en la matriz de modos de Token Architecture; no existen todavía como variables Figma nombradas, solo como texto normativo).
  - Light `text/secondary` → neutral/800 (`#373737`, antes neutral/700).
  - Light `text/tertiary` → neutral/700 (`#4a4d4b`, antes neutral/600).
  - `feedback/error` ahora es mode-aware: Light = red/700 (`#a6423b`), Dark = red/400 (`#e2685d`) — antes era un valor plano `red/500` (`#e0655a`) en ambos modos. Verificado por binding en vivo en múltiples componentes (Badge, Input, Banner, Menu, Stat), no por el frame estático de swatches (ver limitaciones).
  - Menu — la acción destructiva (Delete) usa `feedback/error` para label/icono, verificado por binding directo.
- **Iconografía:** se documenta como "el set completo de Tabler, 6.146 iconos", pero solo ~27 SVG están realmente embebidos en el archivo (los usados en las demos de componentes). El resto es descripción, no implementación — sin cambios respecto a v0.1.0.

## Figma maestro

- Nombre: **FDS**
- File key: `7Uco2E5gV4JdqojI7J3kTX`
- URL: `https://www.figma.com/design/7Uco2E5gV4JdqojI7J3kTX/FDS`
- Páginas relevantes (accesibles por node-id directo; el listado de páginas top-level del propio Figma MCP no las muestra todas — ver Riesgos):
  - `10:8` "🧪 Sandbox" (handoff kit interno, no es fuente de documentación pública)
  - `775:1276` "© Brand"
  - Foundations (Color, Layout, Spacing, Elevation, Typography, Token Architecture) — nodos accedidos directamente: `45:684`, `678:464`, `775:1309`, `775:1416`, `775:1592`, `775:1630`, `775:1783`, `1003:245`
  - Components: `24:61` (contiene las 45 raíces canónicas + sus sets `.legacy/*` ocultos)
  - Changelog: `1014:60` (Figma mantiene su propio changelog narrativo en el lienzo, espejado — no copiado literal — en el `CHANGELOG` de `index.html`)

## Ruta de `index.html`

`public/FDS/index.html` dentro de este mismo repositorio (`juancfresno`), servido públicamente en `/FDS`.

## GitHub

- Repositorio: `https://github.com/juancfresno/juancfresno.git` (FDS vive dentro de este repo, no en uno propio)
- Rama: `main`

## Vercel

- Servido en `https://juancfresno.vercel.app/FDS`
- `vercel.json` fija `Cache-Control: public, max-age=0, must-revalidate` para `/FDS/(.*)` — sin caché de CDN, cada actualización se ve al instante sin invalidación manual.

## Arquitectura actual

Un único archivo HTML autocontenido (~1.400 líneas):

- **Tokens semánticos** (mode-aware): CSS custom properties en `:root` / `[data-theme="light"]` / `[data-theme="dark"]`, incluyendo ahora tokens de componente (`--button-bg-primary`, etc.) para que las demos consuman variables en vez de hex hardcodeado.
- **Tokens primitivos**: array JS `PRIMITIVES`, con nombres de rol — los semánticos alias-an estos valores, nunca al revés.
- **Tokens de marca**: array JS `BRANDS`, 5 contextos con estado honesto por marca (assets reales vs. slot preparado).
- **Componentes**: funciones JS `R.<id>` que generan el HTML de cada sección al vuelo; el router es un simple listener de `location.hash`.
- **Sin build, sin framework, sin dependencias npm propias** (fuera del propio Next.js del repo que lo aloja).
- Tipografía vía CDN externo: Fontshare (Switzer) + Google Fonts (Geist Mono, Instrument Serif).

## Limitaciones conocidas

1. Los tokens de color existen duplicados dentro del propio archivo (CSS custom properties + array JS `PRIMITIVES`) — no hay una única fuente generadora ni exportación a otro formato. Sin cambios respecto a v0.1.0.
2. **No existe integración técnica automática entre FDS y ningún producto** (Forma, Medida, GLYF, Biakone, ni siquiera `juancfresno.com`). Que Brand documente 5 contextos **no implica** que el código de esos productos consuma FDS — cada uno sigue manteniendo sus propios tokens de forma independiente (ver detalle abajo).
3. Sin testing visual / regresión visual.
4. Sin mecanismo de exportación de tokens (no Style Dictionary, no Tokens Studio).
5. Iconografía documentada muy por encima de lo realmente integrado.
6. **Toast** aún no tiene componente canónico Theme-free en Figma — documentado como Draft, con nota explícita, hasta que se migre.
7. **Brand collection incompleta en la práctica:** el plan de release asumía 21 variables en la colección Brand; solo 6 están realmente wireadas y visibles en la página "© Brand" de Figma (`bg-brand`, `bg-brand-subtle`, `logo-default`, `logo-inverse`, `logo-accent`, `bg-brand-yellow`), y de esas solo 2 (`bg-brand`, `bg-brand-subtle`) muestran diferenciación real entre las 5 marcas — Biakone/GLYF/Medida/Forma resuelven hoy a los mismos valores neutros. GLYF en particular se etiqueta "Ink/Cream" pero sus variables de Brand todavía no reflejan esa identidad.
8. **Divergencia interna detectada en Figma (no en este HTML):** el frame estático "Color · Semantic" (`45:684`) muestra un duplicado del panel de Primitives en vez de la tabla semántica real, y las etiquetas visuales de algunos swatches (p. ej. `text/tertiary`) no coinciden con el binding en vivo de la variable. Este HTML publica los valores verificados por binding en vivo (confirmados de forma cruzada en múltiples componentes), no los de las etiquetas estáticas — recomendado corregir esos frames directamente en Figma.
9. Radio de esquinas, spacing y elevación cambiaron de escala en v1.0.0 (breaking) — cualquier valor hardcodeado fuera de este archivo que asumiera la escala de v0.1.0 quedará desalineado.

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
| Diseño | Figma (`FDS`, `7Uco2E5gV4JdqojI7J3kTX`) |
| Documentación publicada | `public/FDS/index.html` |
| Código e historial | GitHub (`juancfresno/juancfresno`) |
| Publicación | Vercel (`/FDS`) |
| Estado, decisiones y tareas | NOEZ (Notion) |

## Relación actual con Fresno, NOEZ, Forma, Medida, GLYF y Biako

- **Fresno / NOEZ:** FDS es un proyecto bajo el paraguas de Fresno©, gobernado por las reglas anteriores; su estado y decisiones deben reflejarse en NOEZ cuando corresponda.
- **Forma:** mantiene su propio `Forma/DesignSystem/DesignTokens.swift`, con valores de color propios y distintos a los de FDS (auditado de forma independiente en `products/apps/forma/docs/design-system-audit.md`, sin referencia cruzada a FDS). Que FDS documente "Forma" como contexto de Brand **no cambia esto** — sigue sin integración técnica.
- **Medida:** mantiene su propio `Medida/DesignSystem/DesignTokens.swift`, igualmente independiente.
- **GLYF:** mantiene su propio `GlyfUI.swift` / `MaterialCatalog.swift`, igualmente independiente.
- **Biako:** sin sistema de diseño formalizado conocido; sin relación técnica con FDS.

**Aclaración explícita: no existe hoy ninguna integración técnica entre FDS y los productos.** FDS no exporta tokens en ningún formato consumible por Swift/CSS/JSON de forma automatizada. Cualquier coincidencia de valores entre FDS y un producto (si la hay) es casual, no derivada de una fuente compartida. Esto sigue siendo cierto en v1.0.0 pese a la nueva colección Brand.

## Riesgos

- Divergencia Figma↔código: al ser un proceso manual, cualquier cambio en Figma que no se traduzca al `index.html` (o viceversa) queda silenciosamente desincronizado — no hay verificación automática.
- Duplicación interna de tokens (CSS + JS) dentro del propio archivo.
- Sin repositorio propio: FDS vive dentro del repo de `juancfresno.com`; un cambio accidental en ese repo podría afectar a FDS y viceversa.
- Sin testing visual: un cambio de CSS global podría romper silenciosamente un componente ya implementado sin que nada lo detecte.
- El listado de páginas top-level que devuelve la herramienta Figma MCP (`get_metadata` sin `nodeId`) no refleja todas las páginas reales del archivo — Foundations y Components solo son accesibles pasando su node-id directamente. Si ese comportamiento cambia o el node-id se invalida, la sincronización futura requerirá redescubrir la estructura del archivo.

## Backlog técnico

- Extraer los tokens a un archivo de datos único (JSON) del que el HTML de documentación lea, en vez de duplicarlos.
- Definir un mecanismo real de sincronización Figma→código (aunque sea semi-manual con checklist, no solo "se hizo a mano").
- Migrar Toast a un componente canónico Theme-free en Figma y actualizar su estado de Draft a Stable.
- Completar la colección Brand en Figma — hoy solo 6 de las variables previstas están wireadas, y GLYF necesita su propia identidad Ink/Cream reflejada en las variables, no solo en el texto.
- Integrar testing visual básico (aunque sea una comparación de capturas manual documentada) antes de marcar más componentes como "Stable".
- Evaluar si conviene separar FDS a su propio repositorio si su ritmo de cambio empieza a chocar con el de `juancfresno.com`.

## Fecha de actualización

2026-08-09
