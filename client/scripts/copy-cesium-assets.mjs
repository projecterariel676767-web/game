import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../node_modules/cesium/Build/Cesium');
const target = resolve(here, '../public/cesium');

if (!existsSync(source)) {
  throw new Error('Cesium build assets were not found at ' + source);
}
mkdirSync(dirname(target), { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('Copied Cesium runtime assets to client/public/cesium');
