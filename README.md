# ApuLabStationGame

ApuLab Station migrado a **Vite + TypeScript + Three.js**, sin Phaser en el runtime principal.

## Arquitectura

- **Three.js**: render 3D, cámaras, personajes, mundos y efectos.
- **DOM/CSS**: menú, acceso de participante, diálogos, HUD y ajustes.
- **Systems**: sesión, telemetría offline-first y sincronización.
- **Research repositories**: separación Mock/Supabase para DEMO y STUDY.

## Flujo inicial

`Menú → Iniciar misión → AccessModal → DEMO/STUDY → sesión → intro Three.js`

## Seguridad de datos

- DEMO no usa `participant_id` ni credenciales.
- STUDY debe autenticarse server-side antes de habilitarse.
- No se guardan contraseñas en `localStorage`.
- Telemetría se encola localmente y se sincroniza mediante repositorio.
- El cliente no contiene `SUPABASE_SERVICE_ROLE_KEY`.

## Desarrollo

```bash
npm install
npm run dev
```
