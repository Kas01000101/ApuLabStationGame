import './styles/main.css';
import './styles/tokens.css';
import './styles/game-ui.css';
import './styles/intro-canon.css';
import './styles/menu-hd.css';
import './styles/mission01.css';
import { ApuLabApp } from './app/ApuLabApp';
import { installFailureAlarmFx } from './three/effects/FailureAlarmFx';
import { installMission01TelemetryBridge } from './systems/Mission01TelemetryBridge';
import { RESEARCH_CONFIG } from './config/researchConfig';

const BUILD_ID = RESEARCH_CONFIG.studyBuildId;
document.documentElement.dataset.apulabBuild = BUILD_ID;
console.info(`[ApuLabStationGame] build ${BUILD_ID}`);

const threeRoot=document.querySelector<HTMLDivElement>('#three-root');
const uiRoot=document.querySelector<HTMLDivElement>('#ui-root');
if(!threeRoot||!uiRoot)throw new Error('apulab_root_missing');
installFailureAlarmFx(uiRoot);
installMission01TelemetryBridge();
new ApuLabApp({threeRoot,uiRoot}).start();
