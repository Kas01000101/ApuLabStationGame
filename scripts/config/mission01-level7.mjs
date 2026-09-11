export const LEVEL7_CONFIG = Object.freeze({
  level: 7,
  totalLevels: 7,
  title: 'LA MUESTRA DESCONOCIDA',
  subtitle: 'ELIGE EL INSTRUMENTO SEGÚN EL DATO QUE NECESITAS.',
  objective: 'PASO 1 · LLEVA AYNI A LA MUESTRA',
  start: { c: 1, r: 7, dir: 0 },
  // Simple final route: N7 evaluates scientific choice, not navigation difficulty.
  goal: { c: 6, r: 6, label: 'PUNTO DE COMUNICACIÓN' },
  // Legacy intermediate label required by pre-final N7 patches. The final patch
  // normalizes it to MUESTRA DESCONOCIDA in the generated level7.html only.
  sample: { c: 5, r: 2, label: 'MUESTRA DE INTERÉS' },
  // Maximum five rocks by GDD. None blocks the sample or communication point.
  obstacles: [[3,6],[0,5],[7,4],[2,1]],
  sensors: [],
  // These labels intentionally preserve the pre-final pipeline vocabulary.
  // Final patches normalize them in the generated N7 only.
  sensorOptions: [
    { id: 'temperature', name: 'SENSOR DE TEMPERATURA', icon: '🌡', description: 'Mide qué tan fría o caliente está.' },
    { id: 'proximity', name: 'SENSOR DE PROXIMIDAD', icon: '📡', description: 'Mide qué tan cerca está un objeto.' },
    { id: 'materials', name: 'ANALIZADOR DE MINERALES', icon: '🔬', description: 'Obtiene información sobre los materiales presentes.' },
  ],
  explore: [
    { title: 'DISTINTOS DATOS', text: 'Los instrumentos pueden obtener distintos tipos de información.', hint: 'Observa qué información produce cada instrumento.', focus: 'sample' },
    { title: 'ELIGE SEGÚN EL DATO', text: 'Elige el instrumento según el dato que necesitas.', hint: 'Piensa qué información respondería la pregunta.', focus: 'science' },
  ],
  guide: [
    ['MUESTRA', 'Lleva AYNI a la muestra.'],
    ['ANALIZAR', 'Usa ANALIZAR MUESTRA.'],
    ['INSTRUMENTO', 'Elige un instrumento.'],
    ['DATO', 'Encuentra el dato que responde la pregunta.'],
    ['COMUNICAR', 'Lleva AYNI al punto de comunicación y envía los datos.'],
  ],
});
