import './styles/main.css';
import { ApuLabApp } from './app/ApuLabApp';

const threeRoot = document.querySelector<HTMLDivElement>('#three-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
if (!threeRoot || !uiRoot) throw new Error('apulab_root_missing');

new ApuLabApp({ threeRoot, uiRoot }).start();
