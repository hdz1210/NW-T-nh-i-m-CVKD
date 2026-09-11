const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function load(sourcePath) {
  const context = vm.createContext({
    Logger: { log() {} },
    Utilities: {
      formatDate(date, timezone, format) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        if (format === 'yyyy') return String(year);
        if (format === 'MM') return month;
        if (format === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
        if (format === 'MM/yyyy') return `${month}/${year}`;
        return '';
      }
    }
  });
  vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
  return context;
}

function transactionAt(priceBillion, fund = 'Quỹ NW', project = 'PROJECT') {
  const row = Array(33).fill('');
  row[0] = '10/09/2026';
  row[5] = project;
  row[6] = 'A-101';
  row[7] = 'Kinh doanh';
  row[8] = 'Nguyễn Văn An';
  row[9] = 'Đã bán';
  row[11] = priceBillion * 1e9;
  row[14] = 'Cao tầng';
  row[16] = '2PN';
  row[25] = fund;
  return row;
}

for (const relativePath of ['src/Code.gs', 'Code.gs']) {
  const sourcePath = path.join(__dirname, '..', relativePath);

  test(`${relativePath}: progressive rule only adds points for complete price steps`, () => {
    const ctx = load(sourcePath);
    const rule = { khoangGia: '> 50', scoreMode: 'progressive', stepBillion: 10, stepPoints: 1 };

    assert.equal(ctx.calculateRuleScore(rule, 50, 5, '2026-09'), 5);
    assert.equal(ctx.calculateRuleScore(rule, 55, 5, '2026-09'), 5);
    assert.equal(ctx.calculateRuleScore(rule, 59.9, 5, '2026-09'), 5);
    assert.equal(ctx.calculateRuleScore(rule, 60, 5, '2026-09'), 6);
    assert.equal(ctx.calculateRuleScore(rule, 69.9, 5, '2026-09'), 6);
    assert.equal(ctx.calculateRuleScore(rule, 70, 5, '2026-09'), 7);
  });

  test(`${relativePath}: exact price operators keep the 50 billion boundary unambiguous`, () => {
    const ctx = load(sourcePath);
    assert.equal(ctx.matchRules('Tất cả', 'Tất cả', '> 50', '', '', 50), false);
    assert.equal(ctx.matchRules('Tất cả', 'Tất cả', '> 50', '', '', 50.01), true);
    assert.equal(ctx.matchRules('Tất cả', 'Tất cả', '30 - 50', '', '', 50), true);
    assert.equal(ctx.matchRules('Tất cả', 'Tất cả', '30 - 50', '', '', 50.01), false);
    assert.equal(ctx.canonicalKhoangGia('> 50'), '> 50');
    assert.equal(ctx.canonicalKhoangGia('>= 50'), '>= 50');
    assert.equal(ctx.canonicalKhoangGia('<= 50'), '<= 50');
  });

  test(`${relativePath}: visible sheet values are normalized without JSON metadata`, () => {
    const ctx = load(sourcePath);
    const progressive = ctx.getVisibleScoringConfig({ scoringConfig: { mode: 'progressive', stepBillion: 10, stepPoints: 1 } });
    const fixed = ctx.getVisibleScoringConfig({ scoringConfig: { mode: 'fixed' } });

    assert.equal(progressive.modeLabel, 'Lũy tiến theo giá');
    assert.equal(progressive.stepBillion, 10);
    assert.equal(progressive.stepPoints, 1);
    assert.equal(fixed.modeLabel, 'Cố định');
    assert.equal(fixed.stepBillion, '');
    assert.equal(fixed.stepPoints, '');
    assert.doesNotThrow(() => ctx.validateProgressiveRuleRange(progressive, '> 50'));
    assert.throws(() => ctx.validateProgressiveRuleRange(progressive, '30 - 50'), /Khoảng Giá dạng/);
  });

  test(`${relativePath}: one-time migration reads the previous JSON into visible values`, () => {
    const ctx = load(sourcePath);
    const migrated = ctx.parseLegacyRuleConfigCell(JSON.stringify({
      schemaVersion: 2,
      months: { '2026-09': { enabled: true, mode: 'progressive', stepVnd: 10000000000, stepPoints: 1 } }
    }), { getSpreadsheetTimeZone: () => 'Asia/Bangkok' });

    assert.equal(migrated.modeLabel, 'Lũy tiến theo giá');
    assert.equal(migrated.stepBillion, 10);
    assert.equal(migrated.stepPoints, 1);
  });

  test(`${relativePath}: month payload sent to the UI contains no Date object`, () => {
    const ctx = load(sourcePath);
    const sheet = {
      getLastColumn: () => 13,
      getRange: () => ({ getValues: () => [[new Date(Date.UTC(2026, 8, 1, 12, 0, 0))]] })
    };
    const months = ctx.getRuleMonthColumns(sheet, 13, { getSpreadsheetTimeZone: () => 'Asia/Bangkok' });

    assert.equal(months.length, 1);
    assert.equal(months[0].dateStr, '2026-09-01');
    assert.equal(months[0].display, '09/2026');
    assert.equal(Object.prototype.hasOwnProperty.call(months[0], 'date'), false);
  });

  test(`${relativePath}: trailing sheet rows do not become duplicate UI rules`, () => {
    const ctx = load(sourcePath);
    const months = [{ colIdx: 13, key: '2026-09' }];
    const blank = Array(13).fill('');
    const formattedBlank = Array(13).fill('');
    formattedBlank[0] = '   ';
    formattedBlank[9] = 'Cố định';

    assert.equal(ctx.hasRuleRowData(blank, 9, months), false);
    assert.equal(ctx.hasRuleRowData(formattedBlank, 9, months), false);

    const projectRow = Array(13).fill('');
    projectRow[0] = 'Đang bán';
    assert.equal(ctx.hasRuleRowData(projectRow, 9, months), true);

    const continuationRow = Array(13).fill('');
    continuationRow[8] = '> 50';
    assert.equal(ctx.hasRuleRowData(continuationRow, 9, months), true);

    const scoreOnlyRow = Array(13).fill('');
    scoreOnlyRow[12] = 5;
    assert.equal(ctx.hasRuleRowData(scoreOnlyRow, 9, months), true);

    assert.equal(ctx.isConfiguredRuleRow(['Tất cả', 'Tất cả', 'Tất cả'], ['', '']), false);
    assert.equal(ctx.isConfiguredRuleRow(['Tất cả', 'Tất cả', '> 50'], ['', '']), true);
    assert.equal(ctx.isConfiguredRuleRow(['Tất cả', 'Tất cả', 'Tất cả'], ['', 0]), true);
  });

  test(`${relativePath}: configured NW rule wins above 50 while fixed row owns the boundary`, () => {
    const ctx = load(sourcePath);
    const fixed = {
      sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: '30 - 50', scoreMode: 'fixed',
      stepBillion: 0, stepPoints: 0, monthScores: new Map([['2026-09', 5]])
    };
    const progressive = {
      sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: '> 50', scoreMode: 'progressive',
      stepBillion: 10, stepPoints: 1, monthScores: new Map([['2026-09', 5]])
    };
    const rules = {
      thMap: new Map([['project', [fixed, progressive]]]),
      thMonthsList: [{ key: '2026-09' }], generalRules: [], activeCampaigns: [],
      cbnvMap: new Map()
    };

    assert.equal(ctx.evaluateRowWithRules(transactionAt(50), rules), 5);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(55), rules), 5);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(60), rules), 6);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(70), rules), 7);
  });

  test(`${relativePath}: the same visible fields work for cross-fund rules`, () => {
    const ctx = load(sourcePath);
    const progressive = {
      name: 'CROSS', khoangGia: '> 50', scoreMode: 'progressive', stepBillion: 10, stepPoints: 1,
      monthScores: new Map([['2026-09', 2]])
    };
    const rules = {
      thMap: new Map(), thMonthsList: [], generalRules: [],
      f2Map: new Map([['cross', [progressive]]]), f2GeneralRules: [], f2MonthsList: [{ key: '2026-09' }],
      activeCampaigns: [], cbnvMap: new Map()
    };

    assert.equal(ctx.evaluateRowWithRules(transactionAt(55, 'Quỹ Chéo', 'CROSS'), rules), 2);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(60, 'Quỹ Chéo', 'CROSS'), rules), 3);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(88, 'Quỹ Chéo', 'CROSS'), rules), 5);
  });

  test(`${relativePath}: unmatched transactions stay blank and never borrow another fund's rule`, () => {
    const ctx = load(sourcePath);
    const crossRule = {
      name: 'Tất cả', khoangGia: '> 50', scoreMode: 'fixed',
      monthScores: new Map([['2026-09', 9]])
    };
    const rules = {
      thMap: new Map(), thMonthsList: [], generalRules: [],
      f2Map: new Map(), f2GeneralRules: [crossRule], f2MonthsList: [{ key: '2026-09' }],
      activeCampaigns: [], cbnvMap: new Map()
    };

    assert.equal(ctx.evaluateRowWithRules(transactionAt(88, 'Quỹ NW'), rules), '');
    rules.f2GeneralRules = [];
    assert.equal(ctx.evaluateRowWithRules(transactionAt(88, 'Quỹ Chéo'), rules), '');
  });

  test(`${relativePath}: region is mandatory for the progressive NW rule`, () => {
    const ctx = load(sourcePath);
    const progressiveNorth = {
      cdt: 'Tất cả', code: 'Tất cả', region: 'Miền Bắc', fund: 'Quỹ NW',
      sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: '> 50', scoreMode: 'progressive',
      stepBillion: 10, stepPoints: 1, monthScores: new Map([['2026-09', 5]])
    };
    const rules = {
      thMap: new Map(), thMonthsList: [{ key: '2026-09' }], generalRules: [progressiveNorth],
      f2Map: new Map(), f2GeneralRules: [], f2MonthsList: [], activeCampaigns: [],
      cbnvMap: new Map()
    };
    const central = transactionAt(88, 'Quỹ NW');
    central[4] = 'Miền Trung';
    const north = transactionAt(88, 'Quỹ NW');
    north[4] = 'Miền Bắc';

    assert.equal(ctx.evaluateRowWithRules(central, rules), '');
    assert.equal(ctx.evaluateRowWithRules(north, rules), 8);
    const noRegion = transactionAt(88, 'Quỹ NW');
    noRegion[4] = '';
    assert.equal(ctx.evaluateRowWithRules(noRegion, rules), '');
  });

  test(`${relativePath}: only the approved hidden personnel rules alter a matched sheet score`, () => {
    const ctx = load(sourcePath);
    const fixed = {
      sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: 'Tất cả', scoreMode: 'fixed',
      monthScores: new Map([['2026-09', 4]])
    };
    const rules = {
      thMap: new Map([['project', [fixed]], ['vcg', [fixed]]]), thMonthsList: [{ key: '2026-09' }],
      generalRules: [], f2Map: new Map(), f2GeneralRules: [], f2MonthsList: [], activeCampaigns: [],
      cbnvMap: new Map()
    };
    const ptdt = transactionAt(20);
    ptdt[7] = 'PTĐT Hà';
    ptdt[8] = 'Nguyễn Văn An';
    const ptdtSelf = transactionAt(20);
    ptdtSelf[7] = 'PTĐT Hà';
    ptdtSelf[8] = 'Nguyễn Văn Hà';
    const ctv = transactionAt(20);
    ctv[7] = 'CTV';

    assert.equal(ctx.evaluateRowWithRules(ptdt, rules), 2);
    assert.equal(ctx.evaluateRowWithRules(ptdtSelf, rules), 4);
    assert.equal(ctx.evaluateRowWithRules(ctv, rules), 0);
    assert.equal(ctx.evaluateRowWithRules(transactionAt(20, 'Quỹ NW', 'VCG'), rules), 4);
  });
}
