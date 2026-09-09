import { TelemetryService } from './TelemetryService';

const L1_POINTS = {
  batteryPower: { x: 1302, y: 482 },
  meterPower: { x: 544, y: 406 },
  redProbe: { x: 913, y: 681 },
  blackProbe: { x: 1098, y: 708 },
  positiveTerminal: { x: 964, y: 369 },
  negativeTerminal: { x: 1266, y: 369 },
};
const LOGICAL_WIDTH = 1672;
const LOGICAL_HEIGHT = 941;

type Cleanup = () => void;

export function attachMission01BehaviorTelemetry(frame: HTMLIFrameElement, level: number): Cleanup {
  let documentRef: Document | null = null;
  try { documentRef = frame.contentDocument; } catch { return () => {}; }
  if (!documentRef) return () => {};

  const telemetry = TelemetryService.getInstance();
  const cleanups: Cleanup[] = [];
  const on = <K extends keyof DocumentEventMap>(
    target: Document | Element,
    type: K,
    listener: (event: DocumentEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean,
  ) => {
    target.addEventListener(type, listener as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, listener as EventListener, options));
  };

  const observe = (target: Node, callback: MutationCallback, options: MutationObserverInit) => {
    const observer = new MutationObserver(callback);
    observer.observe(target, options);
    cleanups.push(() => observer.disconnect());
    return observer;
  };

  instrumentHelp(documentRef, level, telemetry, on);

  if (level === 1) instrumentLevel1(documentRef, telemetry, on, observe);
  if (level === 2) instrumentLevel2(documentRef, telemetry, on, observe);
  if (level === 3 || level === 4) instrumentProgrammingLevel(documentRef, level, telemetry, on, observe);

  return () => {
    for (const cleanup of cleanups.splice(0)) {
      try { cleanup(); } catch { /* best effort */ }
    }
  };
}

function instrumentHelp(
  doc: Document,
  level: number,
  telemetry: TelemetryService,
  on: <K extends keyof DocumentEventMap>(target: Document | Element, type: K, listener: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions | boolean) => void,
): void {
  const explore = doc.querySelector('#kawsay-explanation,#explore-btn');
  const guide = doc.querySelector('#kawsay-guide,#guide-btn');
  const journal = doc.querySelector('#kawsay-journal,#journal-btn,#bitacora-btn');
  if (explore) on(explore, 'click', () => telemetry.recordEvent('explore_opened', { source: 'parent_observer' }, { levelNumber: level }));
  if (guide) on(guide, 'click', () => telemetry.recordEvent('help_requested', { source: 'parent_observer' }, { levelNumber: level, hintUsed: true }));
  if (journal) on(journal, 'click', () => telemetry.recordEvent('bitacora_opened', { source: 'parent_observer' }, { levelNumber: level }));
}

function instrumentLevel1(
  doc: Document,
  telemetry: TelemetryService,
  on: <K extends keyof DocumentEventMap>(target: Document | Element, type: K, listener: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions | boolean) => void,
  observe: (target: Node, callback: MutationCallback, options: MutationObserverInit) => MutationObserver,
): void {
  const canvas = doc.querySelector<HTMLCanvasElement>('#kawsay-canvas,canvas');
  let activeProbe: 'red' | 'black' | null = null;
  let batteryPowerEvents = 0;
  let meterPowerEvents = 0;
  let successRecorded = false;
  let lastPolarity = '';

  if (canvas) {
    on(canvas, 'pointerdown', (event) => {
      const point = logicalPoint(canvas, event as PointerEvent);
      if (!point) return;
      if (near(point, L1_POINTS.redProbe, 105)) activeProbe = 'red';
      else if (near(point, L1_POINTS.blackProbe, 105)) activeProbe = 'black';
      else activeProbe = null;
      if (activeProbe) telemetry.recordEvent('probe_drag_start', { probe: activeProbe }, { levelNumber: 1 });
    }, { capture: true });

    on(canvas, 'pointerup', (event) => {
      const point = logicalPoint(canvas, event as PointerEvent);
      if (!point) return;

      if (near(point, L1_POINTS.batteryPower, 90)) {
        batteryPowerEvents += 1;
        telemetry.recordEvent('battery_power_changed', { interaction_index: batteryPowerEvents }, { levelNumber: 1 });
      }
      if (near(point, L1_POINTS.meterPower, 90)) {
        meterPowerEvents += 1;
        telemetry.recordEvent('multimeter_power_changed', { interaction_index: meterPowerEvents }, { levelNumber: 1 });
        telemetry.recordEvent('multimeter_mode_changed', { mode: 'dc_voltage' }, { levelNumber: 1 });
      }

      if (activeProbe) {
        const terminal = near(point, L1_POINTS.positiveTerminal, 115)
          ? 'positive'
          : near(point, L1_POINTS.negativeTerminal, 115) ? 'negative' : null;
        if (terminal) {
          telemetry.recordEvent('probe_snap', { probe: activeProbe, terminal }, { levelNumber: 1 });
          telemetry.recordEvent('measurement_attempt', { trigger: 'probe_snap' }, { levelNumber: 1 });
        }
      }
      activeProbe = null;
    }, { capture: true });
  }

  const root = doc.body;
  if (!root) return;
  const inspect = () => {
    const liveText = `${doc.querySelector('#kawsay-live-status')?.textContent ?? ''} ${doc.body.textContent ?? ''}`;
    const polarity = /-\s*15(?:\.0)?\s*V/i.test(liveText) ? 'reversed'
      : /(?:^|[^-\d])15(?:\.0)?\s*V/i.test(liveText) ? 'conventional' : '';
    if (polarity && polarity !== lastPolarity) {
      lastPolarity = polarity;
      telemetry.recordEvent('polarity_state', { polarity }, { levelNumber: 1 });
    }

    const success = doc.querySelector('#kawsay-success-overlay.is-visible');
    if (success && !successRecorded) {
      successRecorded = true;
      telemetry.recordEvent('valid_measurement', { reading: '15.0 V' }, { levelNumber: 1, result: 'success' });
    }
  };
  observe(root, inspect, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  inspect();
}

function instrumentLevel2(
  doc: Document,
  telemetry: TelemetryService,
  on: <K extends keyof DocumentEventMap>(target: Document | Element, type: K, listener: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions | boolean) => void,
  observe: (target: Node, callback: MutationCallback, options: MutationObserverInit) => MutationObserver,
): void {
  const ids = ['pink', 'green', 'coral'] as const;
  const measured = new Set<string>();
  let viewedIndex = 0;
  let selectionCount = 0;
  let allRecorded = false;

  const recordViewed = () => {
    const id = ids[Math.min(viewedIndex, ids.length - 1)];
    telemetry.recordEvent('battery_viewed', { battery_id: id, view_index: viewedIndex + 1 }, { levelNumber: 2 });
  };
  recordViewed();

  const next = doc.querySelector('#battery-next');
  if (next) on(next, 'click', () => {
    viewedIndex = Math.min(viewedIndex + 1, ids.length - 1);
    queueMicrotask(recordViewed);
  });

  const inspectMeasurements = () => {
    for (const id of ids) {
      const text = doc.querySelector(`#measure-${id}`)?.textContent ?? '';
      if (/\d+(?:\.\d+)?\s*V/i.test(text) && !measured.has(id)) {
        measured.add(id);
        telemetry.recordEvent('battery_measured', { battery_id: id, measurement_order: measured.size }, { levelNumber: 2 });
      }
    }
    if (measured.size === ids.length && !allRecorded) {
      allRecorded = true;
      telemetry.recordEvent('all_batteries_measured', { count: measured.size }, { levelNumber: 2 });
    }
  };
  if (doc.body) observe(doc.body, inspectMeasurements, { subtree: true, childList: true, characterData: true });
  inspectMeasurements();

  on(doc, 'click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-compare-id]') : null;
    if (!target) return;
    selectionCount += 1;
    const batteryId = target.dataset.compareId ?? 'unknown';
    telemetry.recordEvent(selectionCount === 1 ? 'battery_selected' : 'battery_selection_changed', {
      battery_id: batteryId,
      selection_order: selectionCount,
    }, { levelNumber: 2 });
  }, true);
}

function instrumentProgrammingLevel(
  doc: Document,
  level: 3 | 4,
  telemetry: TelemetryService,
  on: <K extends keyof DocumentEventMap>(target: Document | Element, type: K, listener: (event: DocumentEventMap[K]) => void, options?: AddEventListenerOptions | boolean) => void,
  observe: (target: Node, callback: MutationCallback, options: MutationObserverInit) => MutationObserver,
): void {
  const program = doc.querySelector('#program');
  const run = doc.querySelector('#run-btn');
  const success = doc.querySelector('#success-overlay');
  const feedback = doc.querySelector('#feedback');
  let previous = readProgram(program);
  let goalRecorded = false;
  let collisionSeen = false;
  let failureRevisionRecorded = false;
  let lastCollisionText = '';

  const inspectProgram = () => {
    const next = readProgram(program);
    if (next === previous) return;
    const before = previous ? previous.split('|').filter(Boolean) : [];
    const after = next ? next.split('|').filter(Boolean) : [];
    telemetry.recordEvent('program_modified', { before_count: before.length, after_count: after.length }, { levelNumber: level });
    if (after.length > before.length) {
      const command = after.find((value, index) => value !== before[index]) ?? after.at(-1) ?? 'unknown';
      telemetry.recordEvent('command_added', { command, command_count: after.length }, { levelNumber: level });
    } else if (after.length < before.length) {
      telemetry.recordEvent('command_removed', { command_count: after.length }, { levelNumber: level });
    } else {
      telemetry.recordEvent('command_moved', { command_count: after.length }, { levelNumber: level });
    }
    if (level === 4 && collisionSeen && !failureRevisionRecorded) {
      failureRevisionRecorded = true;
      telemetry.recordEvent('program_modified_after_failure', { command_count: after.length }, { levelNumber: 4 });
    }
    previous = next;
  };
  if (program) observe(program, inspectProgram, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-command'] });

  if (run) on(run, 'click', () => {
    const count = readProgram(program).split('|').filter(Boolean).length;
    telemetry.recordEvent('program_started', { command_count: count }, { levelNumber: level });
    telemetry.recordEvent('command_executed', { command_count: count }, { levelNumber: level });
  });

  const inspectSuccess = () => {
    if (goalRecorded || !success) return;
    if (success.classList.contains('visible') || success.classList.contains('is-visible')) {
      goalRecorded = true;
      telemetry.recordEvent('goal_reached', { source: 'success_overlay' }, { levelNumber: level, result: 'success' });
    }
  };
  if (success) observe(success, inspectSuccess, { attributes: true, attributeFilter: ['class'] });
  inspectSuccess();

  if (level === 4 && feedback) {
    const inspectFeedback = () => {
      const text = (feedback.textContent ?? '').trim().toLowerCase();
      if (!text || text === lastCollisionText) return;
      if (!/(roca|choque|bloquead|colisi[oó]n|collision)/i.test(text)) return;
      lastCollisionText = text;
      collisionSeen = true;
      failureRevisionRecorded = false;
      telemetry.recordEvent('collision_detected', { source: 'feedback' }, { levelNumber: 4, result: 'failure' });
    };
    observe(feedback, inspectFeedback, { subtree: true, childList: true, characterData: true });
  }
}

function readProgram(program: Element | null): string {
  if (!program) return '';
  return [...program.querySelectorAll<HTMLElement>('.program-block')]
    .map((node) => node.dataset.command ?? node.getAttribute('data-type') ?? node.textContent?.trim().toLowerCase() ?? 'unknown')
    .join('|');
}

function logicalPoint(canvas: HTMLCanvasElement, event: PointerEvent): { x: number; y: number } | null {
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  return {
    x: ((event.clientX - box.left) / box.width) * LOGICAL_WIDTH,
    y: ((event.clientY - box.top) / box.height) * LOGICAL_HEIGHT,
  };
}

function near(a: { x: number; y: number }, b: { x: number; y: number }, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}
