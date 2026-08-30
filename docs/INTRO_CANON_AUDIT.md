# ApuLab Station — Auditoría de Canon de Intro

La migración modular debe preservar el comportamiento visual aprobado de la intro V38/V42. Esta auditoría identifica regresiones encontradas tras la primera migración.

## Regla

**Modularizar no significa rediseñar.** Los módulos Three.js deben extraer el código visual aprobado, no reinterpretarlo.

## Restauración obligatoria

1. Óptica/cámaras canónicas (FOV 36, exposure .93).
2. Ruth voxel canónica completa.
3. Rover Spirit/Opportunity canónico y Ayni con el mismo diseño base.
4. Match cut de telemetría Marte → monitor ApuLab.
5. Monitor dinámico, visuales STEM y sensores de Ayni antes de la caída.
6. Estado `telemetrySimulation` previo al reveal de la batería.
7. Audio de conducción/falla y recuperación segura del animation loop.
8. `OMITIR INTRO` solo cuando la intro ya fue vista.
9. Conexión efectiva del cierre de intro con Mission01.

## Partes que no deben rehacerse desde cero

- FailureEffects: tapa, humo gris, panel solar, piezas y apagado progresivo.
- Nickname sin timeout.
- Diálogos condensados Ruth/Ayni.
- Presentación dinámica de Ayni.
