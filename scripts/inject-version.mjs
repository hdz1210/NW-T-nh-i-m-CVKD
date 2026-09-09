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
  try {
    buildTime = execSync('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M:%S"', { encoding: 'utf8' }).trim();
  } catch (e) {}
  if (!buildTime) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    // Format YYYY-MM-DD HH:mm:ss in Vietnam timezone (UTC+7)
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 7 * 3600000);
    buildTime = `${vnTime.getFullYear()}-${pad(vnTime.getMonth() + 1)}-${pad(vnTime.getDate())} ${pad(vnTime.getHours())}:${pad(vnTime.getMinutes())}:${pad(vnTime.getSeconds())}`;
  }
}

console.log(`[Version Injector] Injecting version: ${commitHash} (built at: ${buildTime})`);

const filesToUpdate = ['src/Code.gs', 'Code.gs'];
for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const targetVersion = `const APP_VERSION = {\n  COMMIT: '${commitHash}',\n  BUILD_TIME: '${buildTime}',\n};`;
    if (/const APP_VERSION = \{[\s\S]*?\};/.test(content)) {
      if (content.includes(targetVersion)) {
        console.log(`  -> Already up-to-date in ${file}`);
        continue;
      }
      content = content.replace(/const APP_VERSION = \{[\s\S]*?\};/, targetVersion);
    } else {
      content = `${targetVersion}\n\n` + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  -> Updated ${file}`);
  }
}

const htmlFiles = ['src/ConfigUI.html', 'ConfigUI.html'];
for (const file of htmlFiles) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const targetSpan = `<span class="commit-hash" id="commitHashDisplay">${commitHash}</span>`;
    if (content.includes('id="commitHashDisplay"')) {
      if (content.includes(targetSpan)) {
        console.log(`  -> Already up-to-date in ${file}`);
        continue;
      }
      content = content.replace(
        /<span class="commit-hash" id="commitHashDisplay">.*?<\/span>/,
        targetSpan
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  -> Updated ${file}`);
    }
  }
}

console.log('[Version Injector] Done!');
