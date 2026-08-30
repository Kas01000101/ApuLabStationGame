# Seguridad y gobernanza de datos

## Estado actual

La arquitectura activa es `Vite + TypeScript + Three.js + DOM`. Phaser no forma parte del runtime principal.

### Garantías aplicadas

- Nunca guardar contraseña en `localStorage`.
- El código del participante no se guarda en `GameState` ni viaja en telemetría después de autenticarse.
- DEMO usa `participant_id = null`.
- STUDY requiere `participant_id` y permanece **fail-closed** hasta implementar autenticación real server-side.
- `SUPABASE_SERVICE_ROLE_KEY` existe únicamente en la Edge Function / entorno de Supabase, nunca en variables `VITE_*`.
- El cliente de telemetría rechaza payloads con campos de PII/credenciales y limita cada payload a 8192 bytes.
- La Edge Function vuelve a validar payload, tamaño, tipos de evento, origen y campos permitidos.
- La Edge Function no hace `...spread` del objeto enviado por el navegador hacia la base de datos: normaliza mediante lista blanca.
- `participant_id`, `session_mode`, `build_version` y `schema_version` de los eventos se derivan de la sesión almacenada, no del cliente.
- Los errores internos de Postgres/Supabase no se devuelven al navegador.
- Los eventos se sincronizan en lotes máximos de 20 con backoff y se eliminan localmente una vez confirmados.
- La migración `supabase/migrations/20260830090000_research_security_baseline.sql` habilita RLS y revoca acceso directo de `anon` y `authenticated` a las tablas de investigación.
- `participant_code` crudo queda forzado a `NULL` para nuevas filas mediante constraints.
- Se minimiza fingerprinting: `user_agent` persistido se reduce al valor fijo `web`.
- CORS de la Edge Function usa allowlist `APULAB_ALLOWED_ORIGINS`; no usa `*`.

## Dependencias

- Vite debe mantenerse en una rama con soporte de seguridad. El proyecto fija `vite@7.3.6`.
- `esbuild@0.28.2` está fijado y aprobado explícitamente mediante `allowScripts`.
- No usar `dangerously-allow-all-scripts`.
- Falta todavía versionar un `package-lock.json`; hasta que exista, la instalación de dependencias transitivas no es totalmente reproducible.

## Bloqueadores antes de habilitar STUDY

1. Implementar `/authenticate` en Edge Function con hash de código/credencial server-side.
2. Implementar rate limiting/cooldown usando `apulab_auth_attempts`.
3. Emitir una prueba/token de sesión de corta duración después del login y exigirla en endpoints STUDY.
4. Validar y aplicar la migración RLS en un proyecto Supabase de staging.
5. Ejecutar pruebas de idempotencia, separación STUDY/DEMO y offline→online.
6. Generar y versionar `package-lock.json` con un npm confiable, luego usar `npm ci` en CI/Vercel.
7. Configurar `APULAB_ALLOWED_ORIGINS` con los dominios exactos de producción/preview autorizados.

## Regla de seguridad

CORS no es autenticación. Aunque el origen esté restringido, las sesiones STUDY nunca deben confiar en `participant_id` enviado por el navegador. La identidad debe derivarse exclusivamente de una autenticación server-side verificable.
