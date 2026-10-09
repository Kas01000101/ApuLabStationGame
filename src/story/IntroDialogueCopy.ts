export type IntroDialogueView = {
  key: string;
  speaker: string;
  text: string;
};

type DialogueOverride = { key?: string; speaker?: string; text: string };

/**
 * La narrativa A–F aprobada se define directamente en IntroController.
 * Solo preservamos aquí la unificación canónica del mensaje de Yachay.
 * No agrupar los turnos ai1–ai5, mb1–mb5 o ic1–ic5: cada línea de
 * María Luisa / AYNI necesita su propia ventana de lectura.
 */
const INTRO_DIALOGUE_OVERRIDES: Record<string, DialogueOverride> = {
  telem1: {
    key: 'failure-send',
    speaker: 'YACHAY',
    text: 'Enviaré mis datos a ApuLab.',
  },
};

export function resolveIntroDialogue(key: string, speaker: string, text: string): IntroDialogueView {
  const override = INTRO_DIALOGUE_OVERRIDES[key];
  return override
    ? { key: override.key ?? key, speaker: override.speaker ?? speaker, text: override.text }
    : { key, speaker, text };
}
