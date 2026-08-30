# Migración desde el prototipo monolítico Three.js

El HTML prototipo queda únicamente como referencia histórica/visual. La arquitectura activa vive en módulos TypeScript dentro de `src/`.

## Fase 1 — completada

- Vite + TypeScript + Three.js
- ThreeEngine
- MenuScreen y AccessModal DOM
- GameState y SessionService
- frontera Mock/Supabase mediante ResearchRepository
- telemetría offline-first
- arquitectura sin Phaser en runtime

## Fase 2 — portada de la intro, completada como base funcional

Se migró desde el prototipo a módulos reales:

1. `Rover.ts`: base Spirit/Opportunity reutilizable con deck mariposa, seis ruedas, rocker-bogie, mástil, cámaras principales, antena, parabólica, luces y panel desprendible.
2. `Yachay.ts`: comportamiento de exploración, escaneo, telemetría y reacción visual.
3. `Ayni.ts`: rover gemelo con avance/rebote de presentación y gestos de mástil.
4. `Ruth.ts`: personaje voxel cuadrado con cabello por bloques, ojos rectangulares, gafas finas, uniforme, banderas y placa RUTH / MANZANARES.
5. `MarsWorld.ts`: Sector APU-07 natural, terreno irregular, rocas, dunas, huellas, formación objetivo, polvo y escaneo cian. No existe la antigua rampa/piedra rectangular naranja.
6. `FailureEffects.ts`: tapa lateral, humo low-poly, desprendimiento del panel solar y piezas que caen y permanecen atrás mientras Yachay sigue avanzando.
7. `TelemetryEffects.ts`: pulsos y pulso protagonista de telemetría.
8. `ApuLabWorld.ts`: bahía, paredes, techo/compuerta, luces, aterrizaje, ambiente técnico, foco de Ruth y reveal de mesa de práctica.
9. `CinematicCamera.ts`: cámara por shots y blends.
10. `IntroAudio.ts`: BIP, PFF, CLANK, CLINK, WOOOSH, BOOM, telemetría y success con WebAudio.
11. `IntroOverlay.ts`: diálogos, SFX, ubicación, beats, OMITIR INTRO arriba-izquierda y apodo sin temporizador.
12. `IntroController.ts`: timeline Marte → falla → telemetría → Ruth → apodo → Ayni → método → Misión 01.

## Regla de apodo

El estado `nickname` no tiene timeout ni avance automático. La cinemática se mantiene pausada hasta que la jugadora escriba un apodo y pulse Continuar.

## Regla de datos

Three.js y la intro no conocen contraseñas, Supabase ni persistencia. El flujo de sesión sigue siendo:

`MenuScreen → AccessModal → SessionService → ResearchRepository → intro`

DEMO usa sesión anónima (`participant_id = null`). STUDY permanece fail-closed hasta que la autenticación server-side real esté configurada.

## Siguiente fase

- portar gameplay interactivo de Misión 01 · MEDIR a módulos Three.js
- conectar multímetro y batería como objetos interactivos reales
- añadir tests visuales/funcionales del timeline
- revisar assets binarios (fondo canónico del menú, audio/modelos si luego se externalizan)
- validar build y rendimiento en navegador objetivo

## Regla permanente

No volver a crear nuevas versiones `Vxx.html` como arquitectura final. Cada mejora debe vivir en su módulo TypeScript correspondiente.
