/* global console */

import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const flowsDirectory = resolve('.maestro');
const flows = (await readdir(flowsDirectory)).filter((file) => file.endsWith('.yaml')).sort();

console.log('Available Maestro flows:');
for (const flow of flows) console.log(`- .maestro/${flow}`);
console.log(
  'No Android device, APK, app configuration, or test credentials are required to list flows.',
);
