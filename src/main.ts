import './styles/main.css';
import './styles/tokens.css';
import './styles/game-ui.css';
import './styles/intro-canon.css';
import './styles/menu-hd.css';
import './styles/mission01.css';
import { ApuLabApp } from './app/ApuLabApp';
import { installFailureAlarmFx } from './three/effects/FailureAlarmFx';
import { installLevel6TelemetryBridge } from './systems/Level6TelemetryBridge';
import { installLevel7TelemetryBridge } from './systems/Level7TelemetryBridge';

const BUILD_ID = '2026.09.05-mission01-level7-instrument-choice';
document.documentElement.dataset.apulabBuild = BUILD_ID;
console.info(`[ApuLabStationGame] build ${BUILD_ID}`);

const threeRoot=document.querySelector<HTMLDivElement>('#three-root');
const uiRoot=document.querySelector<HTMLDivElement>('#ui-root');
if(!threeRoot||!uiRoot)throw new Error('apulab_root_missing');
installFailureAlarmFx(uiRoot);
installLevel6TelemetryBridge();
installLevel7TelemetryBridge();
new ApuLabApp({threeRoot,uiRoot}).start();
