# Misión 01 · Integridad de niveles

La Misión 01 está definida con **8 niveles**. En esta entrega solo están disponibles los niveles **1, 2 y 3**.

## Salidas canónicas esperadas

| Nivel | Progreso | Bytes UTF-8 | SHA-256 |
| --- | --- | ---: | --- |
| 1 | 1 / 8 | 162855 | `ae79c89d4c5ca52bf854b42b3d847b5b3d8e779bf0e2e87ebc9f279118cd18fb` |
| 2 | 2 / 8 | 206358 | `e6a93e42ddb2d3e561b09d95ae4416f8d9b1dd0e03e77d16b8891e7d2be3f29c` |
| 3 | 3 / 8 | 216199 | `9ffbca00d019fcad5de92c6b44d8f171cc67c9a7ddc08173a6b98df6d70fc9c8` |

`scripts/build-mission01.mjs` reconstruye los tres HTML antes de `vite build` y aborta el build si el tamaño o SHA-256 no coincide.

## Nivel 3

Flujo aprobado: `EXPLORAR → GUÍA → TP1 → TP2 → TP3 → localizar la falla → corregir el Conector de seguridad → volver a medir TP3 → AYNI recupera alimentación`.

El Nivel 4 y siguientes no forman parte de esta entrega. El final de Nivel 3 muestra `NIVEL 4 · PRÓXIMAMENTE` y no navega a contenido provisional.
