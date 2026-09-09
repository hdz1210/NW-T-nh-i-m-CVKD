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
  const properties = new Map(options.spreadsheetId ? [['AUTO_SCORE_SPREADSHEET_ID', options.spreadsheetId]] : []);
  const triggers = (options.triggers || []).map(handler => ({ getHandlerFunction: () => handler }));
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
  const ss = { getId: () => 'file-A', getSheetByName: () => sheet, toast() {} };
  const context = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => options.background ? null : ss,
      openById(id) { assert.equal(id, 'file-A'); events.push(['openById', id]); return ss; },
      getUi: () => ({ ButtonSet: { OK: 'OK' }, alert(...args) { events.push(['alert', ...args]); } }),
      flush() {
        events.push(['flush', locked]);
        if (options.flushError) throw new Error('Flush failed');
      }
    },
    LockService: { getScriptLock: () => lock },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties.get(key) || null,
      setProperty(key, value) { properties.set(key, value); }
    }) },
    ScriptApp: {
      getProjectTriggers: () => [...triggers],
      deleteTrigger(trigger) { triggers.splice(triggers.indexOf(trigger), 1); },
      newTrigger(handler) {
        const trigger = { getHandlerFunction: () => handler };
        const builder = {
          forSpreadsheet(value) { assert.equal(value, ss); return builder; },
          onEdit() { trigger.type = 'edit'; return builder; },
          timeBased() { trigger.type = 'clock'; return builder; },
          everyDays(value) { trigger.days = value; return builder; },
          atHour(value) { trigger.hour = value; return builder; },
          everyMinutes(value) { trigger.minutes = value; return builder; },
          create() { triggers.push(trigger); return trigger; }
        };
        return builder;
      }
    },
    Logger: { log: message => logs.push(message) }
  });
  vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
  vm.runInContext(`
    ensureCurrentMonthConfigured = () => ({ updated: false, monthDisplay: '09/2026' });
    getCurrentMonthDate = () => new Date(2026, 8, 1);
    formatMonthDisplay = () => '09/2026';
    getRuleEngineContext = function () {
      return {
        thMap: new Map([['project', [{
          sanPham: 'Tất cả', loaiCan: 'Tất cả', khoangGia: 'Tất cả',
          monthScores: new Map([['2026-09', 4], ['2026-08', 3], ['2026-10', 3]])
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
    cells, events, writes, logs, properties, triggers,
    poll() { return context.autoRecalculateImportedScores(); },
    setup() { context.setupAutoTrigger(); },
    edit({ row = 2, rowCount = 1, column = 12, columnCount = 1, handler = 'onEditAutoScore' } = {}) {
      context[handler]({ range: {
        getSheet: () => sheet, getRow: () => row, getNumRows: () => rowCount,
        getColumn: () => column, getNumColumns: () => columnCount
      } });
    },
    scan() { context.autoTriggerOnDataChange(); },
    recalcAll() { return context.calculateAllScoresWithRules(); }
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
    const h = harness(sourcePath, [transaction({ 2: 10, 3: 2026 })]);
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
    for (const options of [{}, { sheetName: 'rule quỹ NW' }, { sheetName: 'Tổng hợp' }]) {
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

  check('recalculates an IMPORTRANGE update without an edit event, including old zero scores', () => {
    const h = harness(sourcePath, [transaction({ 23: 4 }), transaction({ 23: 0, 9: 'Đã hủy' })]);
    assert.equal(h.poll().count, 0);
    h.cells[1][2] = 10;
    h.cells[1][3] = 2026;
    h.cells[2][9] = 'Đã bán';
    assert.equal(h.poll().count, 2);
    assert.deepEqual(h.cells.slice(1).map(row => row[23]), [3, 4]);
  });

  check('freezes past month scores (<= 08/2026) during periodic IMPORTRANGE poll', () => {
    // Đơn hàng tháng 8 có điểm cũ là 99: Khi poller chạy, điểm 99 không được thay đổi thành 3
    const h = harness(sourcePath, [transaction({ 2: 8, 3: 2026, 23: 99 })]);
    assert.equal(h.poll().count, 0);
    assert.equal(h.cells[1][23], 99);
  });

  check('does not calculate or alter scores for past months (<= 08/2026)', () => {
    // Đơn hàng tháng 8: Tuyệt đối không tính điểm, nếu rỗng giữ nguyên rỗng, nếu có điểm giữ nguyên điểm cũ
    const h = harness(sourcePath, [
      transaction({ 2: 8, 3: 2026, 9: 'Đã hủy', 23: '' }),
      transaction({ 2: 8, 3: 2026, 7: 'BLĐ', 23: '' }),
      transaction({ 2: 8, 3: 2026, 23: 77 })
    ]);
    h.poll();
    assert.equal(h.cells[1][23], '');
    assert.equal(h.cells[2][23], '');
    assert.equal(h.cells[3][23], 77);
    assert.equal(h.writes.length, 0);
  });

  check('applies BLD/BO and CTV penalties to month 9 onwards (>= 09/2026)', () => {
    // Đơn hàng từ tháng 9 thuộc BLĐ/BO: Tự động tính 0 điểm
    const h = harness(sourcePath, [transaction({ 2: 9, 3: 2026, 7: 'BLĐ', 23: '' })]);
    h.poll();
    assert.equal(h.cells[1][23], 0);
  });

  check('freezes past month scores during calculateAllScoresWithRules', () => {
    // Đơn hàng tháng 8 đã có điểm 88: Chạy calculateAllScoresWithRules vẫn giữ nguyên 88
    const h = harness(sourcePath, [
      transaction({ 2: 8, 3: 2026, 23: 88 }),
      transaction({ 2: 9, 3: 2026, 23: 99 })
    ]);
    h.recalcAll();
    assert.equal(h.cells[1][23], 88); // Giữ nguyên điểm tháng 8
    assert.equal(h.cells[2][23], 4);  // Tính lại điểm tháng 9 thành 4
  });

  check('onEditAutoScore preserves existing score or blank for past months (<= 08/2026)', () => {
    const h = harness(sourcePath, [
      transaction({ 2: 8, 3: 2026, 23: 88 }),
      transaction({ 2: 7, 3: 2026, 23: '' }),
      transaction({ 2: 9, 3: 2026, 23: 99 })
    ]);
    h.edit({ row: 2, rowCount: 3 });
    assert.equal(h.cells[1][23], 88); // Giữ nguyên 88
    assert.equal(h.cells[2][23], ''); // Giữ nguyên rỗng
    assert.equal(h.cells[3][23], 4);  // Tháng 9 tính điểm thành 4
  });

  check('autoTriggerOnDataChange ignores unscored past months and only scores month 9+', () => {
    const h = harness(sourcePath, [
      transaction({ 2: 8, 3: 2026, 23: '' }),
      transaction({ 2: 9, 3: 2026, 23: '' })
    ]);
    h.scan();
    assert.equal(h.cells[1][23], ''); // Tháng 8 không bị tính điểm
    assert.equal(h.cells[2][23], 4);  // Tháng 9 được tính điểm thành 4
  });

  check('does not rewrite scores when a periodic scan finds no result changes', () => {
    const h = harness(sourcePath, [transaction({ 23: 4 })]);
    h.poll();
    h.poll();
    assert.equal(h.writes.length, 0);
  });

  check('clears old scores after imported data is deleted or loses its fund type', () => {
    const deleted = Array(33).fill('');
    deleted[23] = 99;
    const h = harness(sourcePath, [deleted, transaction({ 25: '' }), transaction({ 23: 4 })]);
    assert.equal(h.poll().count, 2);
    assert.deepEqual(h.cells.slice(1).map(row => row[23]), ['', '', 4]);
  });

  check('recalculates scores by current row after imported transactions change order', () => {
    const h = harness(sourcePath, [transaction({ 23: 4 }), transaction({ 23: 0, 9: 'Đã hủy' })]);
    const first = h.cells[1].slice(0, 23);
    h.cells[1].splice(0, 23, ...h.cells[2].slice(0, 23));
    h.cells[2].splice(0, 23, ...first);
    h.poll();
    assert.deepEqual(h.cells.slice(1).map(row => row[23]), [0, 4]);
  });

  check('preserves scores during import errors or loading, then retries after recovery', () => {
    for (const error of ['#REF!', '#N/A', '#VALUE!', '#ERROR!', 'Loading...', 'Đang tải…']) {
      const h = harness(sourcePath, [transaction()]);
      h.cells[0][0] = error;
      assert.equal(h.poll().reason, 'input-error');
      assert.equal(h.writes.length, 0);
      h.cells[0][0] = 'Ngày báo cáo';
      h.cells[1][5] = error;
      assert.equal(h.poll().reason, 'input-error');
      assert.equal(h.cells[1][23], 99);
      h.cells[1][5] = 'PROJECT';
      assert.equal(h.poll().count, 1);
      assert.equal(h.cells[1][23], 4);
    }
  });

  check('opens saved file A during a time-driven run with no active spreadsheet', () => {
    const h = harness(sourcePath, [transaction()], { background: true, spreadsheetId: 'file-A' });
    h.poll();
    assert.equal(h.cells[1][23], 4);
    assert.ok(h.events.some(event => event[0] === 'openById'));
  });

  check('skips a busy periodic run so the next scheduled run can retry', () => {
    const h = harness(sourcePath, [transaction()], { busy: true });
    assert.equal(h.poll().reason, 'busy');
    assert.equal(h.writes.length, 0);
  });

  check('does not write imported cells or manual Y scores', () => {
    const h = harness(sourcePath, [transaction({ 24: 7 })]);
    h.poll();
    assert.equal(h.cells[1][24], 7);
    assert.ok(h.writes.every(write => write.column === 24 && write.locked));
  });

  check('batches many scattered score corrections into one column write', () => {
    const h = harness(sourcePath, Array.from({ length: 50 }, (_, index) => transaction({ 23: index % 2 ? 4 : 99 })));
    assert.equal(h.poll().count, 25);
    assert.equal(h.writes.filter(write => write.column === 24).length, 1);
    assert.ok(h.cells.slice(1).every(row => row[23] === 4));
  });

  check('reports periodic scoring failures and releases the lock without overwriting old scores', () => {
    const h = harness(sourcePath, [transaction()], { ruleError: true });
    assert.throws(() => h.poll(), /Rules unavailable/);
    assert.equal(h.writes.length, 0);
    assert.deepEqual(h.events.at(-1), ['release']);
  });

  check('setup installs the one-minute poll once and immediately repairs existing scores', () => {
    const h = harness(sourcePath, [transaction()], { triggers: ['autoRecalculateImportedScores', 'onEditAutoScore', 'autoTriggerOnDataChange', 'unrelated'] });
    h.setup();
    h.setup();
    assert.equal(h.cells[1][23], 4);
    assert.equal(h.properties.get('AUTO_SCORE_SPREADSHEET_ID'), 'file-A');
    const pollTriggers = h.triggers.filter(trigger => trigger.getHandlerFunction() === 'autoRecalculateImportedScores');
    assert.equal(pollTriggers.length, 1);
    assert.equal(pollTriggers[0].minutes, 1);
    assert.equal(h.triggers.length, 4);
    assert.ok(h.triggers.some(trigger => trigger.getHandlerFunction() === 'unrelated'));
    assert.ok(h.events.some(event => event[0] === 'alert' && String(event[2]).includes('3 Trigger')));
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
