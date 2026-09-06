export const LEVEL7_CONFIG = Object.freeze({
  level: 7,
  totalLevels: 7,
  title: 'LA MUESTRA DESCONOCIDA',
  subtitle: 'Decide qué información necesitamos para descubrir de qué material está hecha la muestra.',
  objective: 'OBJETIVO · INVESTIGA LA MUESTRA Y LLEGA AL PUNTO DE MISIÓN',
  start: { c: 1, r: 7, dir: 0 },
  goal: { c: 1, r: 3, label: 'PUNTO DE MISIÓN' },
  // Legacy generator label only. The final N7 V2 runtime normalizes this to MUESTRA DESCONOCIDA.
  sample: { c: 5, r: 2, label: 'MUESTRA DE INTERÉS' },
  obstacles: [[3,6],[4,6],[0,5],[6,5],[2,4],[3,4],[4,4],[7,3],[5,2],[1,2],[3,1],[6,1],[0,1]],
  sensors: [],
  // Legacy generator labels only. The final V2 patch normalizes these to
  // TEMPERATURA / PROXIMIDAD / ANALIZADOR DE MATERIALES.
  sensorOptions: [
    { id: 'temperature', name: 'SENSOR DE TEMPERATURA', icon: '🌡', description: 'Mide qué tan fría o caliente está.' },
    { id: 'proximity', name: 'SENSOR DE PROXIMIDAD', icon: '📡', description: 'Mide qué tan cerca está un objeto.' },
    { id: 'materials', name: 'ANALIZADOR DE MINERALES', icon: '🔬', description: 'Obtiene información sobre los materiales presentes.' },
  ],
  explore: [
    { title: 'DISTINTOS DATOS', text: 'Los instrumentos pueden obtener distintos tipos de información.', hint: 'Observa qué información produce cada instrumento.', focus: 'sample' },
    { title: 'ELIGE SEGÚN LA PREGUNTA', text: 'Elige el instrumento según el dato que necesitas.', hint: 'La pregunta es: ¿de qué material está hecha la muestra?', focus: 'science' },
  ],
  guide: [
    ['LLEGA A LA MUESTRA', 'Lleva AYNI hasta una casilla junto a la muestra.'],
    ['ANALIZA', 'Usa ANALIZAR MUESTRA cuando AYNI esté junto a la roca.'],
    ['PIENSA EN EL DATO', 'Si un dato no responde la pregunta, piensa qué información necesitamos.'],
    ['CIERRA LA MISIÓN', 'Cuando tengas la composición, lleva AYNI al punto final.'],
  ],
});
