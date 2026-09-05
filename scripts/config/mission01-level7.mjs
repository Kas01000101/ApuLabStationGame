export const LEVEL7_CONFIG = Object.freeze({
  level: 7,
  totalLevels: 7,
  title: 'LA MUESTRA DESCONOCIDA',
  subtitle: 'AYNI encontró una muestra poco común. Necesitamos descubrir qué materiales contiene.',
  objective: 'OBJETIVO · LLEGA JUNTO A LA MUESTRA Y ANALIZA',
  start: { c: 1, r: 7, dir: 0 },
  sample: { c: 5, r: 2, label: 'MUESTRA DE INTERÉS' },
  obstacles: [[3,6],[4,6],[0,5],[6,5],[2,4],[3,4],[4,4],[7,3],[1,2],[3,1],[6,1],[0,1]],
  sensors: [
    { id: 'temperature', name: 'SENSOR DE TEMPERATURA', icon: '🌡', description: 'Mide qué tan frío o caliente está el entorno.' },
    { id: 'proximity', name: 'SENSOR DE PROXIMIDAD', icon: '📡', description: 'Detecta objetos y calcula qué tan cerca están.' },
    { id: 'mineral', name: 'ANALIZADOR DE MINERALES', subtitle: 'ESPECTRÓMETRO', icon: '🔬', description: 'Analiza una muestra para obtener información sobre los materiales que contiene.' },
  ],
  explore: [
    { title: 'MUESTRA DE INTERÉS', text: 'AYNI encontró una roca poco común. Su brillo solo indica que merece atención; todavía no sabemos qué contiene.', hint: 'La señal visual no identifica el mineral.', focus: 'sample' },
    { title: 'LLEGA JUNTO A LA MUESTRA', text: 'Programa el recorrido para que AYNI se detenga en una casilla vecina a la muestra.', hint: 'AYNI no debe entrar en la casilla ocupada por la roca.', focus: 'board' },
    { title: 'REUTILIZA LO APRENDIDO', text: 'AVANZAR, GIRAR y REPETIR siguen disponibles para organizar el recorrido.', hint: 'REPETIR es opcional: úsalo solo si te ayuda a simplificar.', focus: 'workspace' },
    { title: 'NUEVA ACCIÓN', text: 'ANALIZAR MUESTRA usa el sensor que hayas equipado para obtener un dato.', hint: 'El tipo de sensor determina qué información consigue AYNI.', focus: 'science' },
  ],
});
