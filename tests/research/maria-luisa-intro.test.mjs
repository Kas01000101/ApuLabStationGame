import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const script = read('src/story/IntroController.ts');
const avatar = read('src/three/characters/MariaLuisaAguilar.ts');
const dialogue = read('src/story/IntroDialogueCopy.ts');
const overlay = read('src/ui/IntroOverlay.ts');
const css = read('src/styles/intro-canon.css');
const world = read('src/three/worlds/ApuLabWorld.ts');

test('The original scientist is replaced in all active intro modules', () => {
  assert.equal(existsSync('src/three/characters/Ruth.ts'), false);
  for (const file of [script, avatar, dialogue, overlay, css, world]) {
    assert.doesNotMatch(file, /Ruth|RUTH|Manzanares|MANZANARES/);
  }
  assert.match(script, /new MariaLuisaAguilar\(\)/);
  assert.match(script, /'scientist-introduction'/);
  assert.match(world, /setScientistSpot/);
  assert.match(css, /data-speaker="maría luisa"/);
});

test('The 3D representation identifies the digital tribute without NASA styling', () => {
  assert.match(avatar, /MARÍA LUISA/);
  assert.match(avatar, /ASTRONOMÍA/);
  assert.match(avatar, /blouse/);
  assert.match(avatar, /trousers/);
  assert.match(avatar, /TorusGeometry/);
  assert.doesNotMatch(avatar, /usFlagTexture|peruFlagTexture|NASA/);
  assert.match(read('src/ui/MenuScreen.ts'), /Personaje y diálogos ficticios/);
});

test('The approved dialogue keys appear independently', () => {
  const keys = [
    ...Array.from({length:9},(_,i)=>'r'+(i+1)),
    'post-nick-hello','post-nick-team','post-nick-missing',
    'ayni-permission','ayni-arrived','scientist-noticed','ayni-perfect','ayni-almost',
    ...Array.from({length:5},(_,i)=>'ai'+(i+1)),
    ...Array.from({length:5},(_,i)=>'mb'+(i+1)),
    'ts1','ts2','ts3','ic1','ic2','ic4','ic5',
  ];
  for (const key of keys) {
    assert.ok(script.includes("showDialogue('"+key+"'"), 'Missing dialogue: '+key);
  }
  assert.match(script, /No necesitas tener todas las respuestas/);
  assert.match(script, /¿Nos ayudarás a descubrirlo/);
  assert.match(script, /Cada pista nos acerca un poco más/);
  assert.match(script, /primera medición/);
  for (const key of ['r5','r7','r8','ai2','ai3','ai4','ai5','mb1','mb2','mb3','mb4','mb5','ts3','ic2','ic5']) {
    assert.doesNotMatch(dialogue,new RegExp('\\b'+key+':'));
  }
});

test('Nickname remains blocking and both handoffs target Mission 01', () => {
  assert.match(script, /if \(this\.state !== 'nickname'/);
  assert.match(script, /requestNickname\(/);
  assert.match(script, /'complete'\);\s*this\.options\.onComplete\?\.\(\)/);
  assert.match(overlay, /apulabIntroSeen/);
  assert.match(overlay, /this\.nicknameInput\.value\.trim/);
});
