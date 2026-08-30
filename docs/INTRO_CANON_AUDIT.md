# Auditoría de fidelidad — Intro Three.js

## Referencia canónica

La referencia visual y cinematográfica que debe conservarse es la intro desarrollada hasta `apulab_intro_REDEFINIDA_YACHAY_RUTH_AYNI_V38_SKIP_LEFT.html`.

Los archivos V39–V43 añadieron menú, fondo y acceso previo, pero **no autorizan rediseñar la intro Three.js**.

Regla de migración a partir de esta auditoría:

> Modularizar significa mover el código canónico a módulos, no reconstruirlo con aproximaciones visuales.

## Resultado

Estado global: **REGRESIÓN VISUAL/CINEMATOGRÁFICA CONFIRMADA**.

La narrativa principal y buena parte de los tiempos fueron transcritos, pero varios elementos determinantes se reescribieron o eliminaron.

---

## P0 — Regresiones críticas

### 1. Cámara/render global cambió

Canónico:
- `PerspectiveCamera(36, 1672/941, .1, 100)`
- ACES exposure `.93`

Migración actual:
- FOV `45`
- far `1000`
- exposure `1.0`

Impacto:
- encuadre mucho más abierto;
- paredes laterales aparecen dentro del plano;
- Ruth queda más pequeña;
- los planos aprobados dejan de coincidir aunque las coordenadas de cámara sean iguales.

La gran pared oscura visible a la derecha durante la presentación de Ruth es coherente con este cambio de FOV.

**Debe volver exactamente a FOV 36 y exposure .93.**

### 2. Cámaras canónicas fueron sustituidas

Se cambiaron varias posiciones/targets. Ejemplos:

Canónico:
- Mars A: `(-1.5, 4.15, 14.8)` → `(-2.0, 1.42, .15)`
- Mars B: `(1.2, 4.35, 12.9)` → `(1.2, 1.65, 0)`
- Station general: `(13.0, 7.4, 16.2)` → `(2.2, 3.2, 0)`
- Hatch: `(11.5, 6.8, 14.7)` → `(.4, 7.7, 0)`
- Ayni drop: `(12.0, 6.3, 14.5)` → `(2.2, 3.5, 0)`
- Team: `(13.1, 7.2, 15.1)` → `(2.65, 3.0, .05)`
- Diagnostic: `(11.8, 7.0, 14.2)` → `(1.7, 3.1, -1.7)`

La migración inventó otras posiciones para varios de estos planos.

**No deben reinterpretarse. Deben portarse literalmente.**

### 3. Yachay perdió la orientación canónica

En el reset canónico:

`yachay.rotation.set(0, Math.PI/2, 0)`

La migración posiciona a Yachay pero no restablece esa rotación.

La geometría del rover tiene sus ruedas delanteras/traseras distribuidas en Z mientras el desplazamiento narrativo ocurre en X. Sin la rotación Y de `PI/2`, el rover puede percibirse desplazándose lateralmente.

**Restaurar la rotación canónica al iniciar/resetear Marte.**

### 4. Ruth fue reconstruida, no portada

La Ruth canónica tenía una construcción voxel detallada con:
- proporciones y escala `U=.23`;
- botas técnicas blancas con suela, detalle amarillo y banda cyan;
- rodilleras;
- bolsillos/herramientas;
- cinturón y hebilla;
- cuello y camiseta interior;
- cabello voxel en múltiples capas;
- detalles de rostro/boca;
- gafas rectangulares finas;
- placa `RUTH / MANZANARES`;
- banderas USA + Perú;
- accesorios y detalles técnicos.

`Ruth.ts` actual creó otro personaje simplificado usando principalmente `BoxGeometry`, traje azul básico y una silueta distinta.

**Esto no es una variación de animación: es otro modelo.**

Debe extraerse la Ruth canónica a un módulo sin rediseñarla.

### 5. Rover/Yachay/Ayni también fueron reautorizados visualmente

El rover canónico usa geometría y proporciones específicas, incluyendo RoundedBoxGeometry, chasis detallado, estructura expuesta y paneles con silueta propia.

`Rover.ts` actual reconstruye el rover con dimensiones y primitivas diferentes.

Ayni canónica era un clon del diseño de Yachay (`yachay.clone(true)`) y después se trataba como rover distinto en ApuLab. La versión modular crea otro `Rover` con tint diferente.

**Restaurar geometría canónica exacta y después modularizar comportamiento.**

---

## P1 — Secuencias/animaciones perdidas

### 6. Match cut Marte → ApuLab fue eliminado

Canónico:
1. pulso protagonista sale de Yachay;
2. cámara sigue la señal;
3. transición cubre Marte;
4. el mismo pulso reaparece en el monitor de ApuLab;
5. Ruth ya está trabajando frente al monitor;
6. luces del laboratorio reaccionan a la recepción;
7. monitor muestra telemetría de Yachay.

Actual:
- al terminar telemetría se llama a `showStation()`;
- Ruth se coloca en posición de trabajo;
- se hace un blend básico de cámara durante 3 segundos.

Se perdieron `monitorPulse`, transición visual, reacción de luces, animación de Ruth trabajando y continuidad de la señal.

### 7. Entrada de Ayni perdió el peek de sensores

Canónico:
- CLANK;
- pausa;
- abre compuerta;
- aparecen primero **dos sensores cyan** (`ayniPeek`);
- después Ayni dice `¡Permisoooooo!` y cae.

Actual:
- compuerta;
- Ayni aparece directamente en la caída.

`ayniPeek` no existe en `ApuLabWorld.ts` actual.

### 8. Se perdieron los visuales STEM durante la presentación de Ruth

Durante:
- `Pero yo no soy la única.`
- comunidad de mujeres/niñas STEM;

la intro canónica activaba discretamente `stemVisuals/stemMaterials`.

No existen en el mundo modular actual.

### 9. Monitor dinámico fue sustituido por texto UI genérico

Canónico usaba `drawMonitor(...)` para cambios narrativos:
- TELEMETRÍA RECIBIDA;
- ESTADO: DETENIDO;
- CAUSA: DESCONOCIDA;
- OBSERVAR;
- MEDIR;
- COMPARAR;
- SEGUIR LAS PISTAS;
- TELEMETRÍA DE YACHAY CARGADA.

La migración convirtió parte de esto en `showBeat(...)` flotante y paneles 3D genéricos.

Esto cambia la dirección de atención de la escena y elimina el motivo para los paneos hacia el monitor.

### 10. Estado `telemetrySimulation` fue eliminado

Secuencia canónica entre briefing y mesa:

Ayni:
- `Creo que ya estoy listo.`
- `…eso espero.`

Ruth:
- `${nick}, empezaremos aprendiendo a obtener una buena medición.`

Duración aproximada: 5.3 s.

La versión modular salta de `briefing` directamente a `bench-reveal`.

Debe restaurarse como estado separado.

### 11. Hum continuo de conducción desapareció

Canónico tenía:
- `startDriveHum()`;
- `setDriveHum(level, freq)` según esfuerzo/velocidad;
- `stopDriveHum()` durante la detención.

`IntroAudio.ts` actual conserva beeps/CLANK/PFF/BOOM/telemetría pero no el hum continuo.

Se perdió una parte importante de la sensación de movimiento y pérdida de fuerza de Yachay.

---

## P1 — Iluminación

### 12. Iluminación de ApuLab cambió

Canónico global/station:
- Hemisphere `0xD8D9E3 / 0x211D31`, intensidad `1.05`;
- key `0xD8D9E3`, intensidad `2.2`, posición `(-7,11,8)`;
- fill violeta `0x7565C7`, intensidad `1.10`, posición `(8,6,-7)`;
- spotlight de Ruth adicional durante presentación.

Actual `ApuLabWorld` usa otra combinación de hemisphere/key y no reproduce el fill aprobado.

Resultado visible: Ruth y el laboratorio tienen volumen, sombras y contraste distintos.

---

## P1 — Robustez que se perdió al modularizar

### 13. Loop de render perdió recuperación de errores

Canónico:
- agendaba el siguiente `requestAnimationFrame` al principio;
- envolvía update/render en `try/catch`;
- tenía `recoverIntroFromRuntimeError`;
- protegía específicamente nickname y entrada de Ayni;
- registraba `window.__APULAB_DEBUG__`.

Actual `ThreeEngine.start()` ejecuta update + render y agenda el frame siguiente **después**. Si una excepción ocurre antes, la animación puede detenerse completamente.

Debe restaurarse el patrón de recuperación en arquitectura modular.

### 14. `OMITIR INTRO` se muestra siempre

Canónico:
- solo visible si `apulabIntroSeen === '1'`;
- `skipIntro()` también rechazaba el salto si no había sido vista previamente.

Actual `IntroOverlay` crea el botón siempre visible y su callback no aplica esa regla.

La captura actual confirma esta regresión.

### 15. Al terminar la intro no existe navegación real a Misión 01

`ApuLabApp` crea `IntroController` sin pasar `onComplete`.

Existe el estado `mission01`, pero el callback de cierre no está conectado al router/app state.

No es la causa del aspecto visual, pero es un bug funcional de la migración.

---

## Elementos que SÍ se conservaron razonablemente

No todo se perdió:

- diálogo principal de Ruth: mayormente conservado;
- timings de `ruth-intro`: muy cercanos/alineados con V38;
- `Observar. Medir. Comparar.`: conservado;
- falla de Yachay: secuencia temporal general conservada;
- humo gris: conservado;
- tapa vibrando/abriendo: conservada;
- panel solar desprendible: conservado;
- tres piezas pequeñas: conservadas;
- apagado progresivo y final a cero: conservado;
- ruedas → ojos en la falla: conceptualmente conservado;
- Ayni acercándose durante su presentación: conservado;
- nickname sin timeout: conservado.

El problema es que estos comportamientos están ejecutándose sobre modelos, cámara, iluminación y mundo que ya no son exactamente los aprobados.

---

# Plan de restauración obligatorio

## Fase A — Restaurar óptica antes de tocar personajes
1. FOV `36`.
2. exposure `.93`.
3. cámaras/targets literales de V38.
4. orientación inicial de Yachay `PI/2`.
5. iluminación station literal.

Criterio: la captura `Pero yo no soy la única.` debe volver al encuadre aprobado, sin la gran pared lateral dominando la imagen.

## Fase B — Port literal de modelos
1. Extraer Ruth desde V38 → `Ruth.ts` sin rediseño.
2. Extraer rover desde V38 → `Rover.ts` sin cambiar geometría/proporciones.
3. Ayni vuelve a derivarse del diseño exacto de Yachay.

Criterio: screenshots de modelo deben ser visualmente equivalentes al HTML canónico.

## Fase C — Restaurar puesta en escena
1. heroPulse → monitorPulse.
2. transición Marte/ApuLab.
3. Ruth trabajando al recibir datos.
4. monitor dinámico.
5. STEM visuals.
6. Ayni peek.
7. `telemetrySimulation`.
8. drive hum.

## Fase D — Robustez
1. recovery loop.
2. debug state.
3. skip solo después de primera reproducción.
4. conectar `onComplete → mission01`.

---

## Regla de aceptación

No se aprobará una migración por “tener los mismos diálogos”.

La intro modular debe preservar:
- geometría;
- transforms;
- cámaras;
- FOV;
- iluminación;
- timing;
- animación;
- efectos;
- sonido;
- secuencia narrativa.

Los cambios posteriores deben hacerse **sobre el canon restaurado**, no durante la migración.
