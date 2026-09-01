import { IntroController } from './IntroController';

type IntroRuntime = {
  state: string;
  elapsed: number;
  stationFx?: { updateAmbient?: (elapsed: number) => void };
};

/**
 * Ajusta únicamente el ritmo de la introducción.
 *
 * IntroController mantiene la coreografía canónica; aquí reducimos dt solo en
 * ventanas donde una línea necesita más tiempo de lectura. Al ralentizar la
 * ventana completa, texto, cámara e idle permanecen sincronizados.
 * Los niveles 1–8 no usan este controlador.
 */
export class ReadableIntroController extends IntroController {
  private ambientElapsed = 0;

  override start(): void {
    this.ambientElapsed = 0;
    super.start();
  }

  override update(dt: number): void {
    this.ambientElapsed += dt;
    const runtime = this as unknown as IntroRuntime;
    const scale = dialoguePacingScale(runtime.state, runtime.elapsed);
    super.update(dt * scale);
    runtime.stationFx?.updateAmbient?.(this.ambientElapsed);
  }
}

function dialoguePacingScale(state: string, t: number): number {
  switch (state) {
    case 'mars-exploration':
      if (t >= 2 && t < 3.5) return 0.72;       // cámaras/sensores
      if (t >= 3.5 && t < 4.5) return 0.48;     // …creo.
      if (t >= 4.5 && t < 6.15) return 0.72;    // ¡Sigamos!
      return 1;

    case 'mars-failure':
      if (t >= 1.72 && t < 2.4) return 0.34;    // ¿Eh?
      if (t >= 3.35 && t < 4.6) return 0.60;    // Eso no debería…
      if (t >= 4.6 && t < 5.2) return 0.30;     // Vamos…
      if (t >= 5.55 && t < 6.7) return 0.55;    // …eso tampoco…
      if (t >= 7.45 && t < 8.9) return 0.70;    // Algo está fallando…
      if (t >= 9.45 && t < 10.5) return 0.50;   // Mejor no voy a forzar…
      if (t >= 10.5 && t < 12.3) return 0.85;   // Enviaré mis datos…
      return 1;

    case 'telemetry':
      if (t >= 1.95 && t < 3.45) return 0.70;   // Espero que descubran…
      return 1;

    case 'ruth-introduction':
      if (t >= 2.7 && t < 5.4) return 0.80;
      if (t >= 5.4 && t < 7.2) return 0.85;
      if (t >= 7.2 && t < 10) return 0.68;
      if (t >= 10 && t < 12.4) return 0.72;
      if (t >= 12.4 && t < 14.9) return 0.75;
      if (t >= 14.9 && t < 17.8) return 0.72;
      if (t >= 17.8 && t < 20.4) return 0.72;
      if (t >= 20.4 && t < 22.9) return 0.80;
      return 1;

    case 'post-nickname':
      if (t < 1.4) return 0.65;
      if (t < 3.2) return 0.80;
      if (t < 4.25) return 0.50;
      return 1;

    case 'ayni-entrance':
      if (t >= 1.62 && t < 3.15) return 0.72;   // ¡Permisoooooo!
      if (t >= 4.15 && t < 4.65) return 0.25;   // …¡Llegué!
      if (t >= 4.65 && t < 5.10) return 0.225;  // Eso noté.
      if (t >= 5.10 && t < 5.65) return 0.275;  // Aterrizaje…
      if (t >= 6.02 && t < 6.50) return 0.24;   // …casi perfectamente.
      return 1;

    case 'ayni-introduction':
      if (t < 1.6) return 0.75;                 // ¡Hola… soy Ayni!
      return 1;                                 // líneas combinadas ya respiran

    case 'telemetry-simulation':
      if (t < 1.4) return 0.65;                 // Creo que ya estoy listo.
      return 1;

    case 'intro-completed':
      if (t >= 0.8 && t < 1.95) return 0.55;    // ¿Esa es mi batería?
      if (t >= 1.95 && t < 3.65) return 0.80;   // No. Es una batería…
      if (t >= 3.65 && t < 4.6) return 0.45;    // …menos mal.
      if (t >= 4.6 && t < 6.6) return 0.80;     // Antes de investigar…
      return 1;

    default:
      return 1;
  }
}
