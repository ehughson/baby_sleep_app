import { writeFileSync } from 'fs';
import { join } from 'path';

const version = process.env.npm_package_version || '1.0.0';
const buildTime = new Date().toISOString();

const versionData = {
  version,
  buildTime
};

const publicDir = join(process.cwd(), 'public');
const versionFile = join(publicDir, 'version.json');

writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
console.log(`✅ Updated version.json: ${version} (${buildTime})`);

