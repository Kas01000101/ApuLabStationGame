import './styles/main.css';
import './styles/tokens.css';
import './styles/game-ui.css';
import './styles/intro-canon.css';
import { ApuLabApp } from './app/ApuLabApp';
import { installFailureAlarmFx } from './three/effects/FailureAlarmFx';

const threeRoot=document.querySelector<HTMLDivElement>('#three-root');
const uiRoot=document.querySelector<HTMLDivElement>('#ui-root');
if(!threeRoot||!uiRoot)throw new Error('apulab_root_missing');
installFailureAlarmFx(uiRoot);
new ApuLabApp({threeRoot,uiRoot}).start();
