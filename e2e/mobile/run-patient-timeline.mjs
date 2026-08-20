/* global console, process */

import { spawnSync } from 'node:child_process';

const requiredVariables = ['E2E_PATIENT_EMAIL', 'E2E_PATIENT_PASSWORD'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  console.log(`SKIPPED mobile patient timeline smoke: missing ${missingVariables.join(', ')}.`);
  console.log(
    'The authenticated flow only runs against a configured app on an attached Android device/emulator.',
  );
  process.exit(0);
}

const result = spawnSync('maestro', ['test', '.maestro/patient-timeline.yaml'], {
  env: process.env,
  stdio: 'inherit',
});

if (result.error?.code === 'ENOENT') {
  console.error(
    'Maestro CLI is required. Install it outside this repository, then rerun this command.',
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
