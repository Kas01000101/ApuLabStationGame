export type IntroDialogueView = {
  key: string;
  speaker: string;
  text: string;
};

type DialogueOverride = {
  key?: string;
  speaker?: string;
  text: string;
};

/**
 * Copia canónica aprobada para la introducción.
 *
 * IntroController conserva la coreografía, cámaras, animaciones y tiempos.
 * Aquí unificamos únicamente el texto visible para evitar diálogos repetidos
 * sin tocar la lógica de las misiones ni los niveles 1–8.
 */
const INTRO_DIALOGUE_OVERRIDES: Record<string, DialogueOverride> = {
  // Yachay: mantener una sola idea durante el envío de telemetría.
  telem1: {
    key: 'failure-send',
    speaker: 'YACHAY',
    text: 'Enviaré mis datos a ApuLab.',
  },

  // Ruth: presentación y planteamiento del misterio.
  r5: {
    text: 'Y tú también puedes ser parte de esa historia.',
  },
  r7: {
    text: 'Yachay estaba explorando Marte cuando algo extraño hizo que se detuviera.',
  },
  r8: {
    text: 'Nos envió sus datos, pero todavía no sabemos qué ocurrió.',
  },
  'post-nick-missing': {
    text: 'Aunque… nos falta alguien.',
  },

  // Ayni: presentación compacta y con personalidad.
  ai2: {
    key: 'ai-family',
    text: 'Yachay es mi hermano gemelo… ¡literalmente nacimos del mismo código! Aunque, claramente, yo salí más guapo.',
  },
  ai3: {
    key: 'ai-family',
    text: 'Yachay es mi hermano gemelo… ¡literalmente nacimos del mismo código! Aunque, claramente, yo salí más guapo.',
  },
  ai4: {
    key: 'ai-family',
    text: 'Yachay es mi hermano gemelo… ¡literalmente nacimos del mismo código! Aunque, claramente, yo salí más guapo.',
  },
  ai5: {
    key: 'ai-help',
    text: 'Con sus datos y conmigo aquí, podemos descubrir qué ocurrió y ayudarlo a volver a explorar.',
  },
  ai6: {
    key: 'ai-help',
    text: 'Con sus datos y conmigo aquí, podemos descubrir qué ocurrió y ayudarlo a volver a explorar.',
  },

  // Ruth: un solo método de investigación en vez de repetir el problema.
  mb1: {
    key: 'mb-method',
    text: 'No vamos a adivinar. Vamos a observar, medir y comparar hasta encontrar la causa.',
  },
  mb2: {
    key: 'mb-method',
    text: 'No vamos a adivinar. Vamos a observar, medir y comparar hasta encontrar la causa.',
  },
  mb3: {
    key: 'mb-method',
    text: 'No vamos a adivinar. Vamos a observar, medir y comparar hasta encontrar la causa.',
  },
  mb4: {
    key: 'mb-method',
    text: 'No vamos a adivinar. Vamos a observar, medir y comparar hasta encontrar la causa.',
  },
  mb5: {
    key: 'mb-method',
    text: 'No vamos a adivinar. Vamos a observar, medir y comparar hasta encontrar la causa.',
  },

  // La preparación queda únicamente en manos de Ayni.
  ts3: {
    key: 'ts2',
    speaker: 'AYNI',
    text: '…eso espero.',
  },

  // Batería de práctica: combinar la respuesta de Ruth y precisar el cierre.
  ic2: {
    key: 'ic-practice-battery',
    text: 'No. Es una batería de práctica.',
  },
  ic3: {
    key: 'ic-practice-battery',
    text: 'No. Es una batería de práctica.',
  },
  ic5: {
    text: 'Antes de investigar a Yachay, aprenderemos a medir correctamente con ella.',
  },
};

export function resolveIntroDialogue(key: string, speaker: string, text: string): IntroDialogueView {
  const override = INTRO_DIALOGUE_OVERRIDES[key];
  if (!override) return { key, speaker, text };

  return {
    key: override.key ?? key,
    speaker: override.speaker ?? speaker,
    text: override.text,
  };
}
