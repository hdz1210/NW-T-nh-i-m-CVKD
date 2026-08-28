/**
 * =========================================================================
 * HỆ THỐNG QUẢN LÝ CƠ CHẾ VÀ TÍNH ĐIỂM KPI TỰ ĐỘNG (RULE ENGINE) - BẢN FULL
 * =========================================================================
 */

const APP_CONFIG = {
  SHEET_DATA: 'Data',
  SHEET_CONFIG: 'CauHinh_Diem',
  SHEET_MAS_VCG: 'Danh sách căn MAS VCG',
  SHEET_GIAN_XAY: 'Giãn xây HVB',
  SHEET_CBNV: 'CBNV',
  COL_OUTPUT_SCORE: 24, // Cột X: Điểm tạm (Index 24)
};

/**
 * Hàm định dạng ngày an toàn
 */
function formatDateSafe(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).trim();
}

/**
 * Hàm phân tích ngày an toàn (hỗ trợ Serial Date, DD/MM/YYYY, YYYY-MM-DD, Date object và fallback từ cột B,C,D)
 */
function parseDateSafe(val, row) {
  if (val === null || val === undefined || val === '') {
    if (row && row[3] && row[2]) {
      const y = parseInt(row[3], 10);
      const m = parseInt(row[2], 10) - 1;
      const d = parseInt(row[1], 10) || 1;
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m, d);
    }
    return null;
  }
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number' && val > 30000 && val < 80000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Format DD/MM/YYYY hoặc DD-MM-YYYY (Chuẩn Việt Nam)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Format YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback từ các cột Ngày (B), Tháng (C), Năm (D)
  if (row && row[3] && row[2]) {
    const y = parseInt(row[3], 10);
    const m = parseInt(row[2], 10) - 1;
    const d = parseInt(row[1], 10) || 1;
    if (!isNaN(y) && !isNaN(m)) return new Date(y, m, d);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Hàm phân tích số an toàn (xử lý cả kiểu number lẫn string có dấu phẩy/chấm/khoảng trắng)
 */
function parseNumberSafe(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[\,\s]/g, '');
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Tạo Menu Tiện ích trên thanh công cụ Google Sheets
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎯 Cấu Hình Cơ Chế')
    .addItem('⚙️ Mở bảng cấu hình điểm (UI)', 'openConfigUI')
    .addItem('📊 Trình Tạo Biểu Đồ & Báo Cáo (BI)', 'openChartBuilderUI')
    .addSeparator()
    .addItem('📌 [Option 2] Tính điểm dòng đang chọn / dòng mới', 'calculateSelectedRows')
    .addItem('⚡ [Option 1] Tính lại toàn bộ điểm Data (Tất cả dòng)', 'calculateAllScoresWithRules')
    .addItem('🔍 Quét & tính tất cả dòng chưa có điểm', 'autoTriggerOnDataChange')
    .addSeparator()
    .addItem('🔧 Cài đặt Trigger tự động (chạy 1 lần)', 'setupAutoTrigger')
    .addItem('🐞 Kiểm tra dòng đang chọn (Debug Info)', 'debugCheckCurrentSelection')
    .addItem('🛠️ Khởi tạo Sheet Cấu hình mẫu', 'initConfigurationSheet')
    .addToUi();
}

/**
 * Mở giao diện Web UI cấu hình
 */
function openConfigUI() {
  const html = HtmlService.createHtmlOutputFromFile('ConfigUI')
    .setWidth(1400)
    .setHeight(820)
    .setTitle('Bảng Cấu Hình Cơ Chế Tính Điểm CVKD');
  SpreadsheetApp.getUi().showModalDialog(html, '⚙️ Quản Lý Cơ Chế Tính Điểm');
}

/**
 * Mở giao diện Trình Tạo Biểu Đồ & Báo Cáo (BI Chart Builder)
 */
function openChartBuilderUI() {
  const html = HtmlService.createHtmlOutputFromFile('ChartBuilderUI')
    .setWidth(1400)
    .setHeight(820)
    .setTitle('Trình Tạo Biểu Đồ & Báo Cáo Phân Tích');
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Trình Tạo Biểu Đồ & Báo Cáo Phân Tích');
}

/**
 * API lấy danh sách toàn bộ quy tắc
 */
function getRulesFromSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet || sheet.getLastRow() < 2) return [];

    const lastRow = sheet.getLastRow();
    const values = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    return values.map((r, idx) => ({
      rowIndex: idx + 2,
      id: String(r[0] || `R${String(idx + 1).padStart(3, '0')}`),
      name: String(r[1] || ''),
      duAn: String(r[2] || '*').replace(/^\*/, '').trim() || '*',
      sanPham: String(r[3] || '*'),
      loaiCan: String(r[4] || '*'),
      loaiQuy: String(r[5] || '*'),
      fromDate: formatDateSafe(r[6]),
      toDate: formatDateSafe(r[7]),
      minPrice: Number(r[8]) || 0,
      maxPrice: Number(r[9]) || 9999,
      baseScore: Number(r[10]) || 0,
      bonusScore: Number(r[11]) || 0,
      priority: Number(r[12]) || 0,
      status: String(r[13] || 'Kích hoạt')
    }));
  } catch (err) {
    return [];
  }
}

/**
 * API lưu / cập nhật quy tắc
 */
function saveRuleToSheet(rule) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (!sheet) {
      sheet = ss.insertSheet(APP_CONFIG.SHEET_CONFIG);
    }

    const lastRow = sheet.getLastRow();
    const assignedId = rule.id || `R${String(Math.max(1, lastRow)).padStart(3, '0')}`;
    const cleanDuAn = String(rule.duAn || '*').trim();

    const rowData = [
      assignedId,
      rule.name || '',
      cleanDuAn,
      rule.sanPham || '*',
      rule.loaiCan || '*',
      rule.loaiQuy || '*',
      rule.fromDate || '',
      rule.toDate || '',
      Number(rule.minPrice) || 0,
      Number(rule.maxPrice) || 9999,
      Number(rule.baseScore) || 0,
      Number(rule.bonusScore) || 0,
      Number(rule.priority) || 10,
      rule.status || 'Kích hoạt'
    ];

    let targetRowIndex = rule.rowIndex ? Number(rule.rowIndex) : (lastRow + 1);

    if (rule.rowIndex && Number(rule.rowIndex) > 1) {
      sheet.getRange(targetRowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    return {
      success: true,
      rule: {
        rowIndex: targetRowIndex,
        id: assignedId,
        name: rule.name || '',
        duAn: cleanDuAn,
        sanPham: rule.sanPham || '*',
        loaiCan: rule.loaiCan || '*',
        loaiQuy: rule.loaiQuy || '*',
        fromDate: rule.fromDate || '',
        toDate: rule.toDate || '',
        minPrice: Number(rule.minPrice) || 0,
        maxPrice: Number(rule.maxPrice) || 9999,
        baseScore: Number(rule.baseScore) || 0,
        bonusScore: Number(rule.bonusScore) || 0,
        priority: Number(rule.priority) || 10,
        status: rule.status || 'Kích hoạt'
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * API xóa quy tắc
 */
function deleteRuleFromSheet(rowIndex) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(APP_CONFIG.SHEET_CONFIG);
    if (sheet && rowIndex > 1) {
      sheet.deleteRow(Number(rowIndex));
      return { success: true };
    }
    return { success: false, error: 'Dòng không tồn tại' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * BỘ TẢI DỮ LIỆU CƠ CHẾ & DANH MỤC TRA CỨU (RULE ENGINE CONTEXT)
 * =========================================================================
 */
function getRuleEngineContext(ss) {
  const rawRules = getRulesFromSheet();
  const activeRules = rawRules
    .filter(r => r.status === 'Kích hoạt')
    .sort((a, b) => b.priority - a.priority);

  const masVCGSet = new Set();
  const masSheet = ss.getSheetByName(APP_CONFIG.SHEET_MAS_VCG);
  if (masSheet && masSheet.getLastRow() > 1) {
    masSheet.getRange(2, 3, masSheet.getLastRow() - 1, 1).getValues()
      .forEach(r => { if (r[0]) masVCGSet.add(String(r[0]).trim().toUpperCase()); });
  }

  const gianXayMap = new Map();
  const gxSheet = ss.getSheetByName(APP_CONFIG.SHEET_GIAN_XAY);
  if (gxSheet && gxSheet.getLastRow() > 1) {
    gxSheet.getRange(2, 1, gxSheet.getLastRow() - 1, 2).getValues()
      .forEach(r => { if (r[0]) gianXayMap.set(String(r[0]).trim().toUpperCase(), Number(r[1]) || 0); });
  }

  const cbnvMap = new Map();
  const cbnvSheet = ss.getSheetByName(APP_CONFIG.SHEET_CBNV);
  if (cbnvSheet && cbnvSheet.getLastRow() > 1) {
    cbnvSheet.getRange(2, 2, cbnvSheet.getLastRow() - 1, 2).getValues()
      .forEach(r => { if (r[0]) cbnvMap.set(String(r[0]).trim().toUpperCase(), String(r[1]).trim().toUpperCase()); });
  }

  return { activeRules, masVCGSet, gianXayMap, cbnvMap };
}

/**
 * =========================================================================
 * [OPTION 1]: TÍNH LẠI TOÀN BỘ ĐIỂM TRONG SHEET DATA (CHẠY THỦ CÔNG)
 * =========================================================================
 */
function calculateAllScoresWithRules() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() < 2) return { success: false, error: 'Không có dữ liệu trong sheet Data' };

    const ctx = getRuleEngineContext(ss);
    const lastRow = dataSheet.getLastRow();
    const rows = dataSheet.getRange(2, 1, lastRow - 1, 33).getValues();
    const outputScores = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const score = evaluateRowWithRules(row, ctx.activeRules, ctx.masVCGSet, ctx.gianXayMap, ctx.cbnvMap);
      outputScores.push([score]);
    }

    dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, outputScores.length, 1).setValues(outputScores);
    SpreadsheetApp.getActiveSpreadsheet().toast(`⚡ [Option 1] Đã tính lại toàn bộ ${rows.length} dòng!`, 'Thành công', 3);
    return { success: true, count: rows.length };
  } catch (err) {
    Logger.log('Lỗi calculateAllScoresWithRules: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * [OPTION 2 - THỦ CÔNG]: TÍNH ĐIỂM CHO CÁC DÒNG ĐANG ĐƯỢC CHỌN (SELECTION)
 * =========================================================================
 */
function calculateSelectedRows() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const activeSheet = ss.getActiveSheet();
    
    if (activeSheet.getName() !== APP_CONFIG.SHEET_DATA) {
      SpreadsheetApp.getUi().alert(`Vui lòng chọn các dòng bên sheet "${APP_CONFIG.SHEET_DATA}" để tính điểm!`);
      return;
    }

    const range = activeSheet.getActiveRange();
    if (!range) return;

    const startRow = Math.max(2, range.getRow());
    const numRows = range.getNumRows();
    const endRow = Math.min(activeSheet.getLastRow(), startRow + numRows - 1);

    if (endRow < startRow) {
      SpreadsheetApp.getUi().alert('Không có dòng dữ liệu nào được chọn!');
      return;
    }

    const rowNumbers = [];
    for (let r = startRow; r <= endRow; r++) {
      rowNumbers.push(r);
    }

    const res = calculateSpecificRows(rowNumbers);
    if (res.success) {
      ss.toast(`📌 [Option 2] Đã tính điểm cho ${res.count} dòng được chọn (Dòng ${startRow} -> ${endRow})!`, 'Thành công', 3);
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi tính dòng được chọn: ' + err.toString());
  }
}

/**
 * =========================================================================
 * [OPTION 2 - CORE]: HÀM TÍNH ĐIỂM CHỈ CHO CÁC DÒNG CHỈ ĐỊNH (TỐC ĐỘ CAO)
 * =========================================================================
 */
function calculateSpecificRows(rowNumbers) {
  try {
    if (!rowNumbers || rowNumbers.length === 0) return { success: true, count: 0 };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet) return { success: false, error: 'Sheet Data không tồn tại' };

    const ctx = getRuleEngineContext(ss);

    // Tính điểm và ghi đúng vào các dòng được chỉ định
    rowNumbers.forEach(rowIdx => {
      if (rowIdx < 2) return;
      const rowData = dataSheet.getRange(rowIdx, 1, 1, 33).getValues()[0];
      const score = evaluateRowWithRules(rowData, ctx.activeRules, ctx.masVCGSet, ctx.gianXayMap, ctx.cbnvMap);
      dataSheet.getRange(rowIdx, APP_CONFIG.COL_OUTPUT_SCORE).setValue(score);
    });

    return { success: true, count: rowNumbers.length };
  } catch (err) {
    Logger.log('Lỗi calculateSpecificRows: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * [CÀI ĐẶT TRIGGER TỰ ĐỘNG] - CHẠY HÀM NÀY 1 LẦN DUY NHẤT
 * =========================================================================
 * Vào menu 🎯 Cấu Hình Cơ Chế > 🔧 Cài đặt Trigger tự động
 */
function setupAutoTrigger() {
  try {
    // Xóa tất cả trigger cũ liên quan
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      const fn = t.getHandlerFunction();
      if (fn === 'onEditAutoScore' || fn === 'autoTriggerOnDataChange') {
        ScriptApp.deleteTrigger(t);
      }
    });

    // Tạo trigger On Edit mới - phản ứng ngay lập tức khi chỉnh sửa ô
    ScriptApp.newTrigger('onEditAutoScore')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onEdit()
      .create();

    SpreadsheetApp.getActiveSpreadsheet().toast('Đã cài đặt Trigger tự động thành công!', '✅ Setup hoàn tất', 5);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi khi cài đặt trigger: ' + err.toString());
  }
}

/**
 * =========================================================================
 * [OPTION 2 - TỰ ĐỘNG]: TRIGGER ON EDIT - TÍNH ĐIỂM NGAY KHI CHỈNH SỬA / DÁN
 * =========================================================================
 * Xử lý chính xác cả khi gõ tay từng ô lẫn khi DÁN (PASTE) NHIỀU DÒNG CÙNG LÚC.
 */
function onEditAutoScore(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== APP_CONFIG.SHEET_DATA) return;

    const startRow = e.range.getRow();
    const numRows = e.range.getNumRows();
    const firstDataRow = Math.max(2, startRow);
    const lastDataRow = startRow + numRows - 1;
    if (lastDataRow < firstDataRow) return;

    const rowCount = lastDataRow - firstDataRow + 1;
    const rangeData = sheet.getRange(firstDataRow, 1, rowCount, 33).getValues();
    const scoreData = sheet.getRange(firstDataRow, APP_CONFIG.COL_OUTPUT_SCORE, rowCount, 1).getValues();

    const toProcess = [];
    for (let i = 0; i < rowCount; i++) {
      const rowData = rangeData[i];
      const currentScore = scoreData[i][0];
      const actualRowNum = firstDataRow + i;

      // BẮT BUỘC: Cột Z (Loại Quỹ - index 25) PHẢI CÓ GIÁ TRỊ!
      const hasFundType = String(rowData[25] || '').trim() !== '';

      // Nếu Cột Z chưa điền mà Cột X đang có điểm cũ -> XÓA TRẮNG ĐIỂM CỘT X
      if (!hasFundType) {
        if (currentScore !== '' && currentScore !== null && currentScore !== undefined) {
          sheet.getRange(actualRowNum, APP_CONFIG.COL_OUTPUT_SCORE).setValue('');
        }
        continue;
      }

      // Có nhận diện dòng (Dự án, Mã căn, Ngày hoặc CVKD)
      const hasIdentity = (
        String(rowData[5] || '').trim() !== '' || 
        String(rowData[6] || '').trim() !== '' || 
        parseDateSafe(rowData[0], rowData) !== null ||
        String(rowData[8] || '').trim() !== ''
      );

      if (hasIdentity && hasFundType) {
        toProcess.push(actualRowNum);
      }
    }

    if (toProcess.length === 0) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return;

    try {
      calculateSpecificRows(toProcess);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log('Lỗi onEditAutoScore: ' + (error.message || error));
  }
}

/**
 * =========================================================================
 * [QUÉT THỦ CÔNG]: TÌM & TÍNH TẤT CẢ DÒNG CHƯA CÓ ĐIỂM TRÊN SHEET
 * =========================================================================
 * Luôn phản hồi thông báo rõ ràng cho người dùng (Thành công / Không có dòng nào / Báo lỗi).
 */
function autoTriggerOnDataChange(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    ss.toast('Đang có tiến trình khác chạy, vui lòng thử lại sau vài giây.', 'Bận', 3);
    return;
  }

  try {
    const dataSheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() < 2) {
      SpreadsheetApp.getUi().alert('Không tìm thấy sheet "' + APP_CONFIG.SHEET_DATA + '" hoặc sheet chưa có dữ liệu.');
      return;
    }

    const numRows = dataSheet.getLastRow() - 1;
    const dataRange = dataSheet.getRange(2, 1, numRows, 33).getValues();
    const scoreRange = dataSheet.getRange(2, APP_CONFIG.COL_OUTPUT_SCORE, numRows, 1).getValues();
    const unscoredRowNumbers = [];
    const missingFundRows = [];

    for (let i = 0; i < numRows; i++) {
      const row = dataRange[i];
      const currentScore = scoreRange[i][0];
      const actualRowNum = i + 2;

      // BẮT BUỘC: Cột Z (Loại Quỹ - index 25) PHẢI CÓ GIÁ TRỊ!
      const hasFundType = String(row[25] || '').trim() !== '';

      const hasIdentity = (
        String(row[5] || '').trim() !== '' || 
        String(row[6] || '').trim() !== '' || 
        parseDateSafe(row[0], row) !== null ||
        String(row[8] || '').trim() !== ''
      );

      if (!hasIdentity) continue;

      // Nếu chưa điền Cột Z mà đang có điểm -> Xóa trắng điểm
      if (!hasFundType) {
        if (currentScore !== '' && currentScore !== null && currentScore !== undefined) {
          dataSheet.getRange(actualRowNum, APP_CONFIG.COL_OUTPUT_SCORE).setValue('');
        }
        if (missingFundRows.length < 10) missingFundRows.push(actualRowNum);
        continue;
      }

      const isScoreEmpty = (
        currentScore === '' || 
        currentScore === null || 
        currentScore === undefined || 
        currentScore === 'Check' || 
        String(currentScore).trim() === ''
      );

      if (isScoreEmpty) {
        unscoredRowNumbers.push(actualRowNum);
      }
    }

    if (unscoredRowNumbers.length === 0) {
      let msg = 'ℹ️ Không có dòng nào cần tính điểm.';
      if (missingFundRows.length > 0) {
        msg += `\n\n📌 Các dòng sau CHƯA ĐIỀN Loại Quỹ (Cột Z) nên chưa được tính:\n-> Dòng: ${missingFundRows.join(', ')}`;
      }
      SpreadsheetApp.getUi().alert(msg);
      return;
    }

    const res = calculateSpecificRows(unscoredRowNumbers);
    if (!res.success) {
      SpreadsheetApp.getUi().alert('Lỗi khi tính điểm: ' + res.error);
      return;
    }

    SpreadsheetApp.getUi().alert(`✅ Thành công! Đã tính điểm cho ${unscoredRowNumbers.length} dòng:\n(Dòng: ${unscoredRowNumbers.slice(0, 15).join(', ')}${unscoredRowNumbers.length > 15 ? '...' : ''})`);
  } catch (error) {
    Logger.log('Lỗi: ' + (error.message || error));
    SpreadsheetApp.getUi().alert('Đã xảy ra lỗi: ' + (error.message || error));
  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================================
 * [DEBUG]: KIỂM TRA DÒNG ĐANG CHỌN TRỰC TIẾP TRÊN GIAO DIỆN SHEET
 * =========================================================================
 */
function debugCheckCurrentSelection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== APP_CONFIG.SHEET_DATA) {
    SpreadsheetApp.getUi().alert(`Vui lòng mở sheet "${APP_CONFIG.SHEET_DATA}" và chọn 1 dòng để kiểm tra!`);
    return;
  }
  const rowIdx = sheet.getActiveRange().getRow();
  if (rowIdx < 2) {
    SpreadsheetApp.getUi().alert('Vui lòng chọn dòng dữ liệu (từ dòng 2 trở đi)!');
    return;
  }
  debugCheckRow(rowIdx);
}

/**
 * =========================================================================
 * [DEBUG]: KIỂM TRA CHI TIẾT 1 DÒNG DỮ LIỆU ĐỂ TÌM NGUYÊN NHÂN CHƯA TÍNH
 * =========================================================================
 */
function debugCheckRow(rowIdx) {
  const targetRow = rowIdx || 1137;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_DATA);
  if (!sheet) { SpreadsheetApp.getUi().alert('Không tìm thấy sheet "' + APP_CONFIG.SHEET_DATA + '"'); return; }
  
  const rowData = sheet.getRange(targetRow, 1, 1, 33).getValues()[0];
  const score = sheet.getRange(targetRow, APP_CONFIG.COL_OUTPUT_SCORE).getValue();
  const parsedDate = parseDateSafe(rowData[0], rowData);
  const parsedPrice1 = parseNumberSafe(rowData[10]);
  const parsedPrice2 = parseNumberSafe(rowData[11]);
  
  const ctx = getRuleEngineContext(ss);
  const calculatedScore = evaluateRowWithRules(rowData, ctx.activeRules, ctx.masVCGSet, ctx.gianXayMap, ctx.cbnvMap);
  
  const triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', ');

  const infoMsg = [
    `🔍 KẾT QUẢ KIỂM TRA DÒNG ${targetRow}:`,
    `--------------------------------------`,
    `• Điểm hiện tại trong Cột X: [${score}]`,
    `• Điểm tính thử theo Luật: [${calculatedScore}]`,
    `• Ngày BC (Cột A): ${rowData[0]} -> ${parsedDate ? parsedDate.toLocaleDateString('vi-VN') : '❌ KHÔNG PARSE ĐƯỢC'}`,
    `• Dự án (Cột F): [${rowData[5]}] | Mã căn (Cột G): [${rowData[6]}]`,
    `• Quỹ gốc (Cột N): [${rowData[13]}] | Loại Quỹ (Cột Z): [${rowData[25]}]`,
    `• Giá chưa VAT (Cột K): ${rowData[10]} -> ${parsedPrice1.toLocaleString('vi-VN')} đ`,
    `• Giá gồm VAT (Cột L): ${rowData[11]} -> ${parsedPrice2.toLocaleString('vi-VN')} đ`,
    `• PKD (Cột H): [${rowData[7]}] | Trạng thái (Cột J): [${rowData[9]}]`,
    `• Triggers đang hoạt động: ${triggers || '⚠️ CHƯA CÀI TRIGGER'}`
  ].join('\n');

  SpreadsheetApp.getUi().alert(infoMsg);
}

/**
 * Khớp 1 dòng dữ liệu giao dịch với các Rule
 */
function evaluateRowWithRules(row, rules, masVCGSet, gianXayMap, cbnvMap) {
  // 1. Kiểm tra Ngày báo cáo
  const dateBC = parseDateSafe(row[0], row);
  if (!dateBC) return "";

  // 2. BẮT BUỘC: Kiểm tra Cột Z (Loại Quỹ - index 25). Nếu chưa điền Cột Z -> KHÔNG TÍNH, trả về rỗng ""
  const rawLoaiQuy = String(row[25] || '').trim();
  if (!rawLoaiQuy) return "";

  const loaiQuy = /NW/i.test(rawLoaiQuy) ? "Quỹ NW" : "Quỹ Chéo";

  const duAn = String(row[5] || '').trim();
  const maCan = String(row[6] || '').trim().toUpperCase();
  const pkd = String(row[7] || '').trim();
  const cvkdName = String(row[8] || '').trim().toUpperCase();
  const trangThai = String(row[9] || '').trim();
  const giaChuaVat = parseNumberSafe(row[10]);
  const giaGomVat = parseNumberSafe(row[11]);
  const sanPham = String(row[14] || '').trim();
  const loaiCan = String(row[16] || '').trim();
  const maNV = String(row[17] || '').trim().toUpperCase();
  const ghiChu = String(row[32] || '').trim();

  if (trangThai === "Hủy") return 0;
  if (pkd === "CTV/ĐỐI TÁC" || /BLĐ/i.test(pkd) || /BO/i.test(pkd)) return 0;

  let rawVal = giaGomVat > 0 ? giaGomVat : giaChuaVat;
  if (duAn === 'VHHVB' && gianXayMap.has(maCan)) {
    rawVal = gianXayMap.get(maCan);
  }
  const valInBillion = rawVal / 1e9;

  let matchedBaseScore = 0;
  let matchedBonus = 0;
  let foundMatch = false;

  for (const r of rules) {
    // 1. Khớp Dự án (hỗ trợ nhiều dự án phân tách bằng dấu phẩy)
    const rDuAn = String(r.duAn || '*').replace(/^\*/, '').trim() || '*';
    if (rDuAn !== '*') {
      const projectList = rDuAn.split(',').map(s => s.trim().toUpperCase());
      if (!projectList.includes(duAn.toUpperCase())) continue;
    }

    // 2. Khớp Sản phẩm
    if (r.sanPham !== '*') {
      const prodList = r.sanPham.split(',').map(s => s.trim().toLowerCase());
      if (!prodList.includes(sanPham.toLowerCase())) continue;
    }

    // 3. Khớp Loại căn (hỗ trợ 3PN, 4PN, Duplex...)
    if (r.loaiCan !== '*') {
      const unitList = r.loaiCan.split(',').map(s => s.trim().toLowerCase());
      if (!unitList.includes(loaiCan.toLowerCase())) continue;
    }

    // 4. Khớp Loại quỹ
    if (r.loaiQuy !== '*' && r.loaiQuy !== loaiQuy) {
      continue;
    }

    // 5. Khớp Căn đặc biệt MAS VCG
    if (r.id === 'R001' && !masVCGSet.has(maCan)) {
      continue;
    }

    // 6. Khớp Khoảng ngày
    if (r.fromDate) {
      const fDate = parseDateSafe(r.fromDate);
      if (fDate && dateBC < fDate) continue;
    }
    if (r.toDate) {
      const tDate = parseDateSafe(r.toDate);
      if (tDate && dateBC > tDate) continue;
    }

    // 7. Khớp Khoảng giá
    if (valInBillion < r.minPrice || valInBillion >= r.maxPrice) {
      continue;
    }

    matchedBaseScore = r.baseScore;
    matchedBonus = r.bonusScore;
    foundMatch = true;
    break;
  }

  if (!foundMatch) matchedBaseScore = 0;

  // Thưởng thêm căn > 30 tỷ từ tháng 5/2025
  if (dateBC >= new Date(2025, 4, 1) && valInBillion >= 30 && row[11] !== "Check D" && duAn !== "VCG") {
    matchedBonus += 1;
  }

  const baseVal = matchedBaseScore + matchedBonus;

  // Hệ số chiến dịch thời gian (14/02/2026 - 28/02/2026)
  let timeMultiplier = 1;
  if (dateBC >= new Date(2026, 1, 14) && dateBC <= new Date(2026, 1, 28)) {
    timeMultiplier = 2;
  }

  // Hệ số phòng PTĐT
  let ptdtMultiplier = 1;
  if (/PTĐT/i.test(pkd)) {
    const verifiedName = cbnvMap.get(maNV);
    const isInternalPolicy = /Cơ chế nội bộ/i.test(ghiChu);
    if ((verifiedName && verifiedName === cvkdName) || isInternalPolicy) {
      ptdtMultiplier = 1;
    } else {
      ptdtMultiplier = 0.5;
    }
  }

  return baseVal * timeMultiplier * ptdtMultiplier;
}

