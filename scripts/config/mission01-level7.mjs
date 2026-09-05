export const LEVEL7_CONFIG = Object.freeze({
  level: 7,
  totalLevels: 7,
  title: 'SENSORES Y BUCLES',
  subtitle: 'Repite una secuencia de movimiento y lectura para registrar dos sensores.',
  objective: 'OBJETIVO · REGISTRA DOS SENSORES Y ENVÍA LOS DATOS',
  start: { c: 1, r: 5, dir: 1 },
  goal: { c: 6, r: 5 },
  sensors: [
    { c: 3, r: 5, label: 'SENSOR 1', value: '18 °C' },
    { c: 5, r: 5, label: 'SENSOR 2', value: '23 °C' },
  ],
  obstacles: [[0,1],[2,1],[4,2],[6,1],[7,3],[1,3],[3,6],[5,6],[7,6]],
  explore: [
    { title: 'DOS SENSORES', text: 'AYNI debe leer y registrar dos sensores cyan antes de llegar a la estación final.', hint: 'Observa qué secuencia se repite entre SENSOR 1 y SENSOR 2.', focus: 'board' },
    { title: 'REPETIR UNA SECUENCIA', text: 'REPETIR puede contener varios bloques: movimiento, lectura y registro.', hint: 'La misma secuencia puede resolver los dos sensores.', focus: 'workspace' },
    { title: 'LECTURA Y REGISTRO', text: 'LEER SENSOR obtiene el valor actual y REGISTRAR DATO lo guarda en la Bitácora.', hint: 'No puedes registrar un dato antes de leerlo.', focus: 'palette' },
    { title: 'ENVÍO FINAL', text: 'Después de registrar ambos sensores, llega a la estación y usa ENVIAR DATOS.', hint: 'La misión termina cuando ambos registros fueron enviados.', focus: 'run' },
  ],
  guide: [
    ['REGISTRA SENSOR 1', 'Llega al primer punto cyan, usa LEER SENSOR y luego REGISTRAR DATO.'],
    ['REGISTRA SENSOR 2', 'Repite la misma secuencia para llegar al segundo sensor y guardarlo.'],
    ['LLEGA Y ENVÍA DATOS', 'Después de registrar ambos sensores, llega a la estación final y usa ENVIAR DATOS.'],
  ],
});
