const { spawnSync } = require('node:child_process');

// Research physical gate: every event asserted by these suites must originate
// from real browser interactions with the generated mission runtime. This file
// intentionally never calls postMessage itself; protocol/parent authority is
// covered independently by mission01-research-pipeline.cjs.
const suites = [
  ['N1-N2 electronics + telemetry', 'tests/e2e/mission01-electronics.cjs'],
  ['N3-N6 gameplay', 'tests/e2e/mission01-gameplay-n3-n6.cjs'],
  ['N7 instrument/sample/final mission', 'tests/e2e/mission01-level7-contract.cjs'],
];

for (const [label, file] of suites) {
  console.log(`[research-physical] START ${label}`);
  const result = spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[research-physical] FAIL ${label}`);
    process.exit(result.status || 1);
  }
  console.log(`[research-physical] PASS ${label}`);
}

console.log('[research-physical] Mission 01 N1→N7 physical browser gate PASS');
