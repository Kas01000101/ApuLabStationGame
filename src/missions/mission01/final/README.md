# Fuentes finales de Misión 01

La Misión 01 usa **7 posiciones lógicas** después de retirar completamente el antiguo Nivel 3.

## Correspondencia de fuentes empaquetadas

- `level1/` → Nivel 1.
- `level2/` → Nivel 2.
- `level3/` → eliminado del repositorio; ya no forma parte del build ni del flujo.
- `level4/` → fuente del nuevo Nivel 3.
- `level5/` → fuente del nuevo Nivel 4.
- `level6/` → fuente del nuevo Nivel 5.

Los nombres empaquetados `level4/`, `level5/` y `level6/` se mantienen internamente para no reescribir ni alterar su gameplay. El último paso del pipeline genera las rutas públicas nuevas `level3.html`, `level4.html` y `level5.html`, actualizando únicamente numeración, navegación, desbloqueos y claves de continuidad dependientes del número de nivel.

Los antiguos niveles 7 y 8 **no existen como fuentes integradas en esta rama**, por lo que los nuevos niveles 6 y 7 permanecen reservados/no disponibles. No se genera gameplay ficticio para ellos.
