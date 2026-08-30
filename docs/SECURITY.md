# Seguridad y gobernanza de datos

## Reglas

- Nunca guardar contraseña en localStorage.
- El código del participante no debe viajar en telemetría una vez autenticado.
- DEMO debe tener `participant_id = null`.
- STUDY requiere `participant_id` válido.
- No incluir `SUPABASE_SERVICE_ROLE_KEY` en frontend.
- Autenticación y hashing son server-side.
- Errores de login deben ser genéricos: `El código o la contraseña no son correctos.`
- Limitar intentos y aplicar cooldown temporal antes de un estudio real.
- Mantener separación entre datos DEMO y STUDY.

## Telemetría

La app es offline-first: cada evento se escribe primero en `LocalQueueService` y luego `SyncService` intenta sincronizarlo.

Antes de producción se debe validar:

- idempotencia por `event_id`
- límite de payload
- lista permitida de `event_type`
- campos prohibidos de PII
- CORS restringido a dominios ApuLab
- RLS y Edge Functions
- recuperación offline→online
