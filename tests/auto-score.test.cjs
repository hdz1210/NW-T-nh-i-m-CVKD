const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function transaction(overrides = {}) {
  const row = Array(33).fill('');
  Object.assign(row, {
    0: '09/09/2026', 5: 'PROJECT', 6: 'A-101', 7: 'Kinh doanh',
    8: 'Nguyễn Văn An', 9: 'Đã bán', 11: 10e9, 23: 99, 25: 'Quỹ NW'
  }, overrides);
  return row;
}

function harness(sourcePath, rows, options = {}) {
  const cells = [Array(33).fill('Header'), ...rows.map(row => [...row])];
  const colors = cells.map(() => Array(33).fill('#000000'));
  const weights = cells.map(() => Array(33).fill('normal'));
  const events = [];
  const writes = [];
  const logs = [];
  let locked = false;
  const lock = {
    tryLock(timeout) {
      events.push(['tryLock', timeout]);
      locked = !options.busy;
      return locked;
    },
    waitLock(timeout) {
      events.push(['waitLock', timeout]);
      if (options.lockError) throw new Error('Lock timed out');
      locked = true;
      if (options.afterLock) options.afterLock(cells);
    },
    releaseLock() { events.push(['release']); locked = false; }
  };
  const sheet = {
    getName: () => options.sheetName || 'Data',
    getParent: () => ss,
    getLastRow: () => cells.length,
    getLastColumn: () => 33,
    getConditionalFormatRules: () => [],
    getMaxRows: () => cells.length,
    getRange(row, column, rowCount = 1, columnCount = 1) {
      function read(matrix) {
        events.push(['read', locked]);
        return Array.from({ length: rowCount }, (_, i) =>
          matrix[row - 1 + i].slice(column - 1, column - 1 + columnCount));
      }
      function write(matrix, values) {
        for (let i = 0; i < rowCount; i++) {
          for (let j = 0; j < columnCount; j++) matrix[row - 1 + i][column - 1 + j] = values[i][j];
        }
      }
      const range = {
        getValues: () => read(cells),
        getFontColors: () => read(colors),
        getFontWeights: () => read(weights),
        setValues(values) {
          writes.push({ row, column, rowCount, locked });
          write(cells, values);
          return range;
        },
        setFontColors(values) { write(colors, values); return range; },
        setFontWeights(values) { write(weights, values); return range; },
        setNumberFormat: () => range,
        setHorizontalAlignment: () => range
      };
      return range;
    }
  };
  const ss = { getSheetByName: () => sheet, toast() {} };
  const context = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      getUi: () => ({ alert() { events.push(['alert']); } }),
      flush() {
        events.push(['flush', locked]);
        if (options.flushError) throw new Error('Flush failed');
      }
    },
    LockService: { getScriptLock: () => lock },
    Logger: { log: message => logs.push(message) }
  });
  vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
  vm.runInContext(`
    getRuleEngineContext = function () {
      return {
        thMap: new Map([['project', [{
          sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: 'Tất cả',
          monthScores: new Map([['2026-09', 4], ['2026-08', 3]])
        }]]]),
        f2Map: new Map([['cross', [{
          khoangGia: 'Tất cả', monthScores: new Map([['2026-09', 5]])
        }]]]), generalRules: [], activeCampaigns: [],
        masVCGSet: new Set(), gianXayMap: new Map(), cbnvMap: new Map()
      };
    };
  `, context);
  if (options.ruleError) context.getRuleEngineContext = () => { throw new Error('Rules unavailable'); };
  return {
    cells, events, writes, logs,
    edit({ row = 2, rowCount = 1, column = 12, columnCount = 1, handler = 'onEditAutoScore' } = {}) {
      context[handler]({ range: {
        getSheet: () => sheet, getRow: () => row, getNumRows: () => rowCount,
        getColumn: () => column, getNumColumns: () => columnCount
      } });
    },
    scan() { context.autoTriggerOnDataChange(); }
  };
}

for (const relativePath of ['src/Code.gs', 'Code.gs']) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const check = (name, run) => test(`${relativePath}: ${name}`, run);

  check('recalculates an existing score and leaves other rows untouched', () => {
    const h = harness(sourcePath, [transaction(), transaction({ 23: 88 })]);
    h.edit();
    assert.equal(h.cells[1][23], 4);
    assert.equal(h.cells[2][23], 88);
  });

  check('recalculates a zero score after restoring a cancelled transaction', () => {
    const h = harness(sourcePath, [transaction({ 23: 0 })]);
    h.edit({ column: 10 });
    assert.equal(h.cells[1][23], 4);
  });

  check('sets a previously scored cancelled transaction to zero', () => {
    const h = harness(sourcePath, [transaction({ 9: 'Đã hủy' })]);
    h.edit({ column: 10 });
    assert.equal(h.cells[1][23], 0);
  });

  check('uses the updated month to select a new score', () => {
    const h = harness(sourcePath, [transaction({ 2: 8, 3: 2026 })]);
    h.edit({ column: 3 });
    assert.equal(h.cells[1][23], 3);
  });

  check('uses the updated fund type', () => {
    const h = harness(sourcePath, [transaction({ 25: 'Quỹ Chéo' })]);
    h.edit({ column: 26 });
    assert.equal(h.cells[1][23], 1);
  });

  check('uses the updated price to calculate a progressive score', () => {
    const h = harness(sourcePath, [transaction({ 5: 'CROSS', 25: 'Quỹ Chéo', 11: 61e9 })]);
    h.edit();
    assert.equal(h.cells[1][23], 7);
  });

  check('clears a stale score when the fund type is removed', () => {
    const h = harness(sourcePath, [transaction({ 25: '' })]);
    h.edit({ column: 26 });
    assert.equal(h.cells[1][23], '');
  });

  check('clears a stale score when the date becomes invalid', () => {
    const h = harness(sourcePath, [transaction({ 0: '' })]);
    h.edit({ column: 1 });
    assert.equal(h.cells[1][23], '');
  });

  check('clears a stale score when all transaction identity fields are removed', () => {
    const row = Array(33).fill('');
    row[23] = 99;
    row[25] = 'Quỹ NW';
    const h = harness(sourcePath, [row]);
    h.edit({ column: 1, columnCount: 23 });
    assert.equal(h.cells[1][23], '');
  });

  check('handles a pasted range containing a header, scored, new and incomplete rows', () => {
    const h = harness(sourcePath, [transaction(), transaction({ 23: '' }), transaction({ 25: '' }), transaction({ 23: 88 })]);
    h.edit({ row: 1, rowCount: 4, column: 1, columnCount: 33 });
    assert.deepEqual(h.cells.map(row => row[23]), ['Header', 4, 4, '', 88]);
  });

  check('ignores header-only edits and edits on other sheets', () => {
    for (const options of [{}, { sheetName: 'Tổng hợp' }]) {
      const h = harness(sourcePath, [transaction()], options);
      h.edit({ row: options.sheetName ? 2 : 1 });
      assert.equal(h.writes.length, 0);
      assert.equal(h.events.length, 0);
    }
  });

  check('routes legacy edit triggers to recalculate scored rows without alerts', () => {
    const h = harness(sourcePath, [transaction()]);
    h.edit({ handler: 'autoTriggerOnDataChange' });
    assert.equal(h.cells[1][23], 4);
    assert.ok(!h.events.some(event => event[0] === 'alert'));
  });

  check('retains the manual scan behavior for already-scored rows', () => {
    const h = harness(sourcePath, [transaction(), transaction({ 23: '' })]);
    h.scan();
    assert.equal(h.cells[1][23], 99);
    assert.equal(h.cells[2][23], 4);
  });

  check('waits for a busy calculation and reads the latest data after acquiring the lock', () => {
    const h = harness(sourcePath, [transaction()], {
      busy: true, afterLock: cells => { cells[1][9] = 'Đã hủy'; }
    });
    h.edit();
    assert.equal(h.cells[1][23], 0);
    assert.deepEqual(h.events[0], ['waitLock', 30000]);
    assert.ok(h.events.filter(event => event[0] === 'read').every(event => event[1]));
  });

  check('holds the lock for both clearing and scoring, and flushes before releasing it', () => {
    const h = harness(sourcePath, [transaction(), transaction({ 25: '' })]);
    h.edit({ rowCount: 2 });
    assert.ok(h.writes.length > 0 && h.writes.every(write => write.locked));
    assert.deepEqual(h.events.slice(-2), [['flush', true], ['release']]);
  });

  check('reports a lock timeout without modifying scores', () => {
    const h = harness(sourcePath, [transaction()], { lockError: true });
    assert.throws(() => h.edit(), /Lock timed out/);
    assert.equal(h.writes.length, 0);
    assert.ok(h.logs.some(message => message.includes('Lock timed out')));
  });

  check('releases the lock and reports scoring errors', () => {
    const h = harness(sourcePath, [transaction()], { ruleError: true });
    assert.throws(() => h.edit(), /Rules unavailable/);
    assert.equal(h.cells[1][23], 99);
    assert.deepEqual(h.events.at(-1), ['release']);
  });

  check('releases the lock even if flushing fails', () => {
    const h = harness(sourcePath, [transaction()], { flushError: true });
    assert.throws(() => h.edit(), /Flush failed/);
    assert.deepEqual(h.events.at(-1), ['release']);
  });

  if (relativePath === 'src/Code.gs') {
    check('preserves manual Y scores while recalculating X and processing the AB rule', () => {
      const h = harness(sourcePath, [
        transaction({ 24: 7, 27: 'Căn xin cơ chế' }),
        transaction({ 24: 0, 27: 'Căn xin cơ chế' }),
        transaction({ 24: '', 27: 'Căn xin cơ chế' })
      ]);
      h.edit({ rowCount: 3 });
      assert.deepEqual(h.cells.slice(1).map(row => [row[23], row[24]]), [[4, 7], [4, 0], [4, 'chưa có điểm']]);
    });
  }
}
