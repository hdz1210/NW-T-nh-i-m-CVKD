const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = __dirname;
const sourcePath = path.resolve(root, '../../../src/ConfigUI.html');
const source = fs.readFileSync(sourcePath, 'utf8').replace(
  /window\.addEventListener\('DOMContentLoaded', function\(\) \{\s*fetchData\(\);\s*\}\);/,
  ''
);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const results = [];

  for (const fund of ['th', 'f2']) {
    const page = await browser.newPage({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(source, { waitUntil: 'load' });
    await page.evaluate(fundType => {
      configData = {
        thMonths: [{ colIdx: 10, dateStr: '2026-09-01', display: '09/2026' }],
        thRows: [],
        f2Months: [{ colIdx: 4, dateStr: '2026-09-01', display: '09/2026' }],
        f2Rows: [],
        campaign: { rows: [] }
      };
      activeTab = fundType;
      openAddRowModal();
      document.getElementById('loadingOverlay').style.display = 'none';
    }, fund);

    const prefix = fund === 'f2' ? 'addF2' : 'add';
    const scoreId = fund === 'f2' ? 'addScoreF2' : 'addScore';
    await page.locator(`[data-score-prefix="${prefix}"][data-score-mode="progressive"]`).click();
    await page.locator(`#${prefix}GiaTu`).fill('50');
    await page.locator(`#${prefix}GiaDen`).fill('999');
    await page.locator(`#${scoreId}`).fill('5');
    await page.locator(`#${prefix}StepBillion`).fill('10');
    await page.locator(`#${prefix}StepPoints`).fill('1');
    await page.evaluate(() => document.activeElement.blur());

    const desktopPath = path.join(root, fund === 'f2' ? 'implemented-quy-cheo.png' : 'implemented-quy-nw.png');
    await page.locator('#addRowModal .modal-content').screenshot({ path: desktopPath });

    await page.setViewportSize({ width: 430, height: 900 });
    await page.evaluate(() => {
      const body = document.querySelector('#addRowModal .modal-body');
      body.scrollTop = body.scrollHeight;
    });
    const mobilePath = path.join(root, fund === 'f2' ? 'implemented-mobile-quy-cheo.png' : 'implemented-mobile-quy-nw.png');
    await page.locator('#addRowModal .modal-content').screenshot({ path: mobilePath });

    const state = await page.evaluate(prefixValue => {
      const modal = document.querySelector('#addRowModal .modal-content');
      const modalBody = document.querySelector('#addRowModal .modal-body');
      const progressive = document.getElementById(prefixValue + 'ProgressiveFields');
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        modalFitsViewport: modal.getBoundingClientRect().height <= innerHeight,
        bodyScrollTop: modalBody.scrollTop,
        bodyScrollable: modalBody.scrollHeight > modalBody.clientHeight,
        progressiveVisible: getComputedStyle(progressive).display !== 'none',
        activeTab: document.querySelector(`[data-score-prefix="${prefixValue}"].active`)?.dataset.scoreMode || '',
        priceLabel: document.getElementById(prefixValue + 'KhoangGiaPreview')?.textContent.trim() || ''
      };
    }, prefix);

    if (errors.length) throw new Error(errors.join('; '));
    if (state.documentWidth > state.viewportWidth) throw new Error('Horizontal overflow: ' + JSON.stringify(state));
    if (!state.modalFitsViewport || (state.bodyScrollable && state.bodyScrollTop <= 0)) throw new Error('Modal cannot be scrolled: ' + JSON.stringify(state));
    if (!state.progressiveVisible || state.activeTab !== 'progressive' || state.priceLabel !== '> 50') {
      throw new Error('Progressive UI state is incorrect: ' + JSON.stringify(state));
    }
    results.push({ fund, errors, state, desktopPath, mobilePath });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(root, 'implemented-qa-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
