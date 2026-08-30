# Migración desde el prototipo monolítico Three.js

El HTML prototipo sirve como referencia visual, pero no debe seguir creciendo.

## Fase 1 — completada

- proyecto Vite + TypeScript
- ThreeEngine
- MenuScreen y AccessModal DOM
- GameState y SessionService
- Mock/Supabase repository boundary
- telemetría offline-first
- módulos iniciales de MarsWorld, ApuLabWorld, Yachay, Ayni, Ruth y FailureEffects

## Fase 2 — siguiente

Portar con fidelidad desde el prototipo actual:

1. rover Spirit/Opportunity completo de Yachay
2. rover Ayni completo
3. Ruth voxel completa
4. Marte Sector APU-07
5. cámaras cinematográficas y timeline
6. escaneo de rocas
7. fallo: ruedas→ojos→humo→panel solar→piezas→apagado→telemetría
8. llegada a ApuLab Station
9. presentación de Ruth y Ayni
10. transición a Misión 01 · Medir

## Regla

No volver a crear nuevas versiones Vxx.html como arquitectura final. Cada nueva mejora debe vivir en su módulo TypeScript correspondiente.
