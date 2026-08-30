# Arquitectura ApuLabStationGame

## Decisión principal

Phaser queda fuera del runtime principal. La aplicación usa:

- Vite + TypeScript
- Three.js para render 3D, cámaras, mundos, personajes y efectos
- DOM/CSS para menú, formularios, diálogos y HUD
- Services/Repositories para sesión, telemetría y backend

## Capas

```text
UI DOM
  ├─ MenuScreen
  └─ AccessModal
       ↓
SessionService
       ↓
GameState + TelemetryService
       ↓
ResearchRepository
  ├─ MockResearchRepository
  └─ SupabaseResearchRepository

Three.js
  ├─ ThreeEngine
  ├─ IntroController
  ├─ MarsWorld / ApuLabWorld
  ├─ Yachay / Ayni / Ruth
  └─ FailureEffects
```

Three.js no debe conocer contraseñas, Supabase, RLS ni credenciales.

## Flujo DEMO

`Modo demo → startNewSession('demo', null) → MockRepository → session_started → IntroController`

DEMO no utiliza `participant_id`, código ni contraseña.

## Flujo STUDY

`Código + contraseña → authenticateParticipant() server-side → participant_id → startNewSession('study', participant_id) → createSession → session_started → IntroController`

Mientras la autenticación real no esté implementada, STUDY debe fallar cerrado.
