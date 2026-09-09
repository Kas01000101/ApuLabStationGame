-- ApuLab Station GE · Research M12
-- Server-side invariant: a participant may have only one active study session
-- for the same study at a time. Demo sessions are deliberately excluded.

CREATE UNIQUE INDEX IF NOT EXISTS uq_apulab_sessions_one_active_study
ON public.apulab_sessions (participant_id, study_id)
WHERE session_mode='study'
  AND status IN ('in_progress','active','completed_pending_sync');

COMMENT ON INDEX public.uq_apulab_sessions_one_active_study IS
  'Research invariant: at most one active study session per participant and study; demo and terminal sessions excluded.';
