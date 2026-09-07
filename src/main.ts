import './styles/main.css';
import './styles/tokens.css';
import './styles/game-ui.css';
import './styles/intro-canon.css';
import './styles/menu-hd.css';
import './styles/mission01.css';
import { ApuLabApp } from './app/ApuLabApp';
import { installFailureAlarmFx } from './three/effects/FailureAlarmFx';
import { installMission01TelemetryBridge } from './systems/Mission01TelemetryBridge';
import { RESEARCH_CONFIG, getDataMode } from './config/researchConfig';
import { SyncService } from './systems/SyncService';
import { LocalQueueService } from './systems/LocalQueueService';
import { SessionService } from './systems/SessionService';
import { TelemetryService } from './systems/TelemetryService';
import { GameState } from './systems/GameState';

const BUILD_ID = RESEARCH_CONFIG.studyBuildId;
document.documentElement.dataset.apulabBuild = BUILD_ID;
console.info(`[ApuLabStationGame] build ${BUILD_ID}`);

const threeRoot=document.querySelector<HTMLDivElement>('#three-root');
const uiRoot=document.querySelector<HTMLDivElement>('#ui-root');
if(!threeRoot||!uiRoot)throw new Error('apulab_root_missing');
installFailureAlarmFx(uiRoot);
installMission01TelemetryBridge();
installMockResearchQaHooks();
new ApuLabApp({threeRoot,uiRoot}).start();

function installMockResearchQaHooks(): void {
  if (getDataMode() !== 'mock') return;
  const target = window as Window & {
    apulabResearchQA?: {
      flush: () => Promise<void>;
      startStudy: (code: string, credential: string) => Promise<{ success: boolean; error?: string }>;
      complete: () => Promise<boolean>;
      recordEvent: (event: string, payload?: Record<string, unknown>, level?: number | null) => void;
      snapshot: () => {
        state: ReturnType<GameState['getSessionData']>;
        pending: ReturnType<typeof LocalQueueService.getEvents>;
        pendingSessions: string[];
        pendingCompletions: ReturnType<typeof LocalQueueService.getPendingCompletions>;
      };
    };
  };
  const sessions = new SessionService();
  target.apulabResearchQA = {
    flush: () => SyncService.flush(),
    startStudy: (code, credential) => sessions.startStudy(code, credential),
    complete: () => sessions.complete(),
    recordEvent: (event, payload = {}, level = null) => TelemetryService.getInstance().recordEvent(event, payload, { levelNumber: level }),
    snapshot: () => ({
      state: GameState.getInstance().getSessionData(),
      pending: LocalQueueService.getEvents(),
      pendingSessions: LocalQueueService.getPendingSessions(),
      pendingCompletions: LocalQueueService.getPendingCompletions(),
    }),
  };
}
