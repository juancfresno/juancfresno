# FDS — Protocolo de cambio

Última actualización: 2026-08-02

Formaliza cómo se propone, aprueba y publica cualquier cambio visual o de contenido en FDS.

## Flujo obligatorio

```
Figma
  → index.html (public/FDS/index.html)
    → changelog interno (array CHANGELOG dentro del propio index.html)
      → versión (semver)
        → commit
          → GitHub
            → Vercel
              → verificación (visitar /FDS y confirmar el cambio en producción)
                → actualización de NOEZ (solo cuando el cambio afecte estado, una decisión, o trabajo futuro)
```

Ningún paso puede saltarse. Un cambio no está "terminado" hasta que pasa por los ocho.

## Tipos de cambio

| Tipo | Significado |
|---|---|
| `ADD` | Añade un token, componente o sección nueva que no existía |
| `CHANGE` | Modifica algo existente sin romper su uso (ajuste visual, copy, prop opcional nueva) |
| `REMOVE` | Retira un token, componente o sección |
| `FIX` | Corrige un error sin cambiar la intención original |
| `BREAKING` | Cambia algo de forma incompatible con su uso anterior (renombra un token, cambia el significado de una prop, elimina una variante en uso) |

## Formato de entrada de changelog

Cada entrada en el array `CHANGELOG` de `index.html` debe registrar:

- **versión** (`v:` — semver, ej. `0.2.0`)
- **fecha** (`date:` — `YYYY-MM-DD`)
- **tipo** por ítem (`add` / `chg` / `brk` — mapea a ADD/CHANGE/BREAKING; FIX y REMOVE se registran también bajo estos tres tags visuales existentes, indicando el tipo real en el texto del ítem, p. ej. `['fix', 'Button — corrige contraste de foco en modo oscuro']`)
- **descripción** (texto del ítem, en inglés, consistente con el resto del changelog existente)
- **impacto** (implícito en el tipo; para `BREAKING` es obligatorio describir explícitamente qué deja de funcionar y cómo migrar, en la propia descripción o en una nota `note:` del bloque de versión)

## Reglas de versionado (semver aplicado a FDS)

- **MAJOR** (`x.0.0`): cualquier `BREAKING` — un token renombrado/eliminado o un componente cuyo uso previo deja de ser válido.
- **MINOR** (`0.x.0`): cualquier `ADD` — nuevo componente, nueva foundation, nuevo token que no rompe nada existente.
- **PATCH** (`0.0.x`): cualquier `FIX` que no cambie el comportamiento visual esperado, solo corrige un defecto.

## Checklist antes de publicar un cambio

1. ¿El cambio existe primero en Figma? Si no, pararse — Figma es la fuente de diseño, no se diseña directamente en el HTML.
2. ¿El `index.html` refleja fielmente lo que hay en Figma (mismos valores, no aproximados)?
3. ¿Se ha añadido la entrada correspondiente en `CHANGELOG` con tipo correcto?
4. ¿Se ha subido la versión según la regla de semver de arriba?
5. Commit con mensaje claro (`docs(fds): ...` o `feat(fds): ...` según corresponda).
6. Push a `origin/main`.
7. Verificar en `https://juancfresno.vercel.app/FDS` que el cambio es visible tras el despliegue.
8. Si el cambio afecta a una decisión, estado o genera trabajo futuro (p. ej. "hay que migrar X producto"), registrarlo en NOEZ.

## No permitido

- Cambiar valores visuales en `index.html` sin que exista primero en Figma.
- Marcar un componente como "Stable" sin pasar por Figma y sin al menos foundations + variantes + estados definidos.
- Eliminar una entrada de changelog existente (el historial es append-only).
- Mezclar cambios de FDS con cambios no relacionados de `juancfresno.com` en el mismo commit.

## Fecha de actualización

2026-08-02
