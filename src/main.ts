import './styles/main.css';
import './styles/tokens.css';
import './styles/game-ui.css';
import './styles/intro-canon.css';
import './styles/menu-hd.css';
import './styles/mission01.css';
import { ApuLabApp } from './app/ApuLabApp';
import { installFailureAlarmFx } from './three/effects/FailureAlarmFx';
import { installLevel6TelemetryBridge } from './systems/Level6TelemetryBridge';

const BUILD_ID = '2026.09.04-mission01-seven-hardening';
document.documentElement.dataset.apulabBuild = BUILD_ID;
console.info(`[ApuLabStationGame] build ${BUILD_ID}`);

const threeRoot=document.querySelector<HTMLDivElement>('#three-root');
const uiRoot=document.querySelector<HTMLDivElement>('#ui-root');
if(!threeRoot||!uiRoot)throw new Error('apulab_root_missing');
installFailureAlarmFx(uiRoot);
installLevel6TelemetryBridge();
new ApuLabApp({threeRoot,uiRoot}).start();
