export const LEVEL6_CONFIG = Object.freeze({
  level: 6,
  totalLevels: 7,
  title: 'MISIÓN CIENTÍFICA',
  subtitle: 'Usa un bucle para llegar al punto de estudio y completa el ciclo científico.',
  objective: 'OBJETIVO · LLEGA AL PUNTO DE ESTUDIO Y COMPLETA EL CICLO',
  start: { c: 1, r: 5, dir: 1 },
  goal: { c: 5, r: 5 },
  obstacles: [[0,1],[2,1],[4,2],[6,1],[7,3],[1,3],[3,6],[5,6],[7,6]],
  explore: [
    { title: 'RUTA CIENTÍFICA', text: 'AYNI debe llegar al punto de estudio cyan. Observa qué movimiento se repite.', hint: 'Busca un patrón antes de construir el programa.', focus: 'board' },
    { title: 'REPETIR', text: 'REPETIR × N ejecuta varias veces los bloques que colocas dentro.', hint: 'Puedes compactar varios AVANZAR en un solo bucle.', focus: 'workspace' },
    { title: 'CICLO CIENTÍFICO', text: 'En el punto de estudio debes ESCANEAR, luego ANALIZAR y finalmente ENVIAR DATOS.', hint: 'Cada acción científica usa el resultado de la anterior.', focus: 'palette' },
    { title: 'OBJETIVO', text: 'Combina movimiento y ciencia en un programa corto y claro.', hint: 'La meta de este nivel es el propio punto de estudio.', focus: 'run' },
  ],
  guide: [
    ['LLEGA AL PUNTO DE ESTUDIO', 'Usa REPETIR para compactar los AVANZAR que llevan a AYNI hasta la muestra.'],
    ['ESCANEA Y ANALIZA', 'Cuando AYNI esté sobre el punto cyan, ejecuta ESCANEAR y después ANALIZAR.'],
    ['ENVÍA LOS DATOS', 'Cuando el análisis esté listo, usa ENVIAR DATOS para completar la misión.'],
  ],
});
