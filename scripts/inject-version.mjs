import fs from 'node:fs';
import { execSync } from 'node:child_process';

let commitHash = process.argv[2];
let buildTime = process.argv[3];

if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    commitHash = 'f375716';
  }
}

if (!buildTime) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  // Format YYYY-MM-DD HH:mm:ss in Vietnam timezone (UTC+7)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);
  buildTime = `${vnTime.getFullYear()}-${pad(vnTime.getMonth() + 1)}-${pad(vnTime.getDate())} ${pad(vnTime.getHours())}:${pad(vnTime.getMinutes())}:${pad(vnTime.getSeconds())}`;
}

console.log(`[Version Injector] Injecting version: ${commitHash} (built at: ${buildTime})`);

const filesToUpdate = ['src/Code.gs', 'Code.gs'];
for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (/const APP_VERSION = \{[\s\S]*?\};/.test(content)) {
      content = content.replace(
        /const APP_VERSION = \{[\s\S]*?\};/,
        `const APP_VERSION = {\n  COMMIT: '${commitHash}',\n  BUILD_TIME: '${buildTime}',\n};`
      );
    } else {
      content = `const APP_VERSION = {\n  COMMIT: '${commitHash}',\n  BUILD_TIME: '${buildTime}',\n};\n\n` + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  -> Updated ${file}`);
  }
}

const htmlFiles = ['src/ConfigUI.html', 'ConfigUI.html'];
for (const file of htmlFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('id="commitHashDisplay"')) {
      content = content.replace(
        /<span class="commit-hash" id="commitHashDisplay">.*?<\/span>/,
        `<span class="commit-hash" id="commitHashDisplay">${commitHash}</span>`
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  -> Updated ${file}`);
    }
  }
}

console.log('[Version Injector] Done!');
