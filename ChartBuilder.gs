/**
 * Mở giao diện Trình Tạo Biểu Đồ & Báo Cáo (BI Chart Builder)
 */
function openChartBuilderUI() {
  const html = HtmlService.createHtmlOutputFromFile('ChartBuilderUI')
    .setWidth(1400)
    .setHeight(820)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  SpreadsheetApp.getUi().showModalDialog(html, 'Trình Tạo Biểu Đồ & Báo Cáo Phân Tích');
}

/**
 * Trích xuất dữ liệu từ Sheet Data để phục vụ gom nhóm và phân tích
 */
function fetchDataForChartBuilder() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SHEET_DATA) ? APP_CONFIG.SHEET_DATA : 'Data';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];

    const lastRow = sheet.getLastRow();
    const numCols = Math.min(sheet.getLastColumn(), 30);
    const dataValues = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

    return dataValues.map(row => {
      // Xác định loại quỹ
      let rawQuy = String(row[13] || '').trim();
      let loaiQuy = ['RVH', 'NW', 'VSR', 'NWS'].includes(rawQuy) ? 'Quỹ NW' : 'Quỹ Chéo';

      // Lấy điểm (Cột AA nếu có, hoặc Cột X)
      let diemVal = 0;
      if (row[26] !== undefined && row[26] !== '') {
        diemVal = parseFloat(row[26]) || 0;
      } else if (row[23] !== undefined && row[23] !== '') {
        diemVal = parseFloat(row[23]) || 0;
      }

      // Xử lý ngày an toàn
      let ngayBcStr = '';
      if (row[0] instanceof Date) {
        const y = row[0].getFullYear();
        const m = String(row[0].getMonth() + 1).padStart(2, '0');
        const d = String(row[0].getDate()).padStart(2, '0');
        ngayBcStr = `${y}-${m}-${d}`;
      } else {
        ngayBcStr = String(row[0] || '').trim();
      }

      return {
        ngayBc: ngayBcStr,
        ngay: String(row[1] || ''),
        thang: String(row[2] || ''),
        nam: String(row[3] || ''),
        mien: String(row[4] || ''),
        duAn: String(row[5] || ''),
        maCan: String(row[6] || ''),
        pkd: String(row[7] || ''),
        cvkd: String(row[8] || ''),
        trangThai: String(row[9] || ''),
        giaChuaVat: parseFloat(row[10]) || 0,
        giaVat: parseFloat(row[11]) || 0,
        phanKhu: String(row[12] || ''),
        quyGoc: rawQuy,
        sanPham: String(row[14] || ''),
        loaiHinh: String(row[15] || ''),
        loaiCan: String(row[16] || ''),
        maNv: String(row[17] || ''),
        tpkd: String(row[18] || ''),
        gdkd: String(row[19] || ''),
        cdt: String(row[22] || ''),
        loaiQuy: loaiQuy,
        diem: diemVal
      };
    });
  } catch (err) {
    Logger.log('Lỗi fetchDataForChartBuilder: ' + err.toString());
    throw new Error('Lỗi đọc dữ liệu sheet Data: ' + err.message);
  }
}

/**
 * Tạo Sheet Dashboard và chèn Biểu đồ Native của Google Sheets
 */
function createNativeChartInSheet(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const DASHBOARD_SHEET_NAME = 'Dashboard_BáoCáo';
    
    let sheet = ss.getSheetByName(DASHBOARD_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(DASHBOARD_SHEET_NAME);
    } else {
      // Xóa các biểu đồ cũ trên sheet
      const existingCharts = sheet.getCharts();
      existingCharts.forEach(c => sheet.removeChart(c));
      sheet.clear();
    }

    const data = payload.data || [];
    if (!data.length) {
      return { success: false, error: 'Không có dữ liệu tổng hợp để tạo biểu đồ.' };
    }

    // 1. Ghi Tiêu đề Báo Cáo
    sheet.getRange('A1').setValue('BÁO CÁO PHÂN TÍCH: ' + payload.title.toUpperCase());
    sheet.getRange('A1:B1').merge()
      .setFontWeight('bold')
      .setFontSize(13)
      .setBackground('#eff6ff')
      .setFontColor('#1d4ed8')
      .setBorder(true, true, true, true, false, false, '#bfdbfe', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    // 2. Ghi Header Bảng Dữ Liệu
    sheet.getRange('A3').setValue(payload.dimensionName);
    sheet.getRange('B3').setValue(payload.metricName);
    sheet.getRange('A3:B3')
      .setFontWeight('bold')
      .setFontSize(11)
      .setBackground('#1d4ed8')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    // 3. Ghi Dữ liệu
    const rows = data.map(d => [d.dimension, d.value]);
    sheet.getRange(4, 1, rows.length, 2).setValues(rows);

    // Format Bảng Dữ Liệu
    const dataRange = sheet.getRange(4, 1, rows.length, 2);
    dataRange.setFontSize(10.5);
    sheet.getRange(4, 1, rows.length, 1).setFontWeight('bold').setFontColor('#0f172a');
    
    // Định dạng số / tiền tệ cho cột B
    const isCurrency = payload.metricName.toLowerCase().includes('giá') || payload.metricName.toLowerCase().includes('doanh số');
    if (isCurrency) {
      sheet.getRange(4, 2, rows.length, 1).setNumberFormat('#,##0 "đ"');
    } else {
      sheet.getRange(4, 2, rows.length, 1).setNumberFormat('#,##0.##');
    }
    
    // Viền bảng
    sheet.getRange(3, 1, rows.length + 1, 2)
      .setBorder(true, true, true, true, true, true, '#e2e8f0', SpreadsheetApp.BorderStyle.SOLID);
    
    sheet.autoResizeColumns(1, 2);

    // 4. Tạo Native Embedded Chart
    const fullRange = sheet.getRange(3, 1, rows.length + 1, 2);
    let chartBuilder = sheet.newChart().addRange(fullRange);

    // Chọn loại biểu đồ
    if (payload.chartType === 'bar_h') {
      chartBuilder.setChartType(Charts.ChartType.BAR);
    } else if (payload.chartType === 'line') {
      chartBuilder.setChartType(Charts.ChartType.LINE);
    } else if (payload.chartType === 'area') {
      chartBuilder.setChartType(Charts.ChartType.AREA);
    } else if (payload.chartType === 'pie' || payload.chartType === 'doughnut') {
      chartBuilder.setChartType(Charts.ChartType.PIE);
      if (payload.chartType === 'doughnut') {
        chartBuilder.setOption('pieHole', 0.4);
      }
    } else {
      chartBuilder.setChartType(Charts.ChartType.COLUMN);
    }

    chartBuilder
      .setOption('title', payload.title)
      .setOption('titleTextStyle', { color: '#0f172a', fontSize: 13, bold: true })
      .setOption('legend', { position: (payload.chartType === 'pie' || payload.chartType === 'doughnut') ? 'right' : 'none' })
      .setOption('colors', ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'])
      .setPosition(2, 4, 10, 10) // Vị trí Cột D, Dòng 2
      .setOption('width', 880)
      .setOption('height', 480);

    const chart = chartBuilder.build();
    sheet.insertChart(chart);

    // Kích hoạt sheet
    sheet.activate();

    return {
      success: true,
      sheetName: DASHBOARD_SHEET_NAME
    };
  } catch (err) {
    Logger.log('Lỗi createNativeChartInSheet: ' + err.toString());
    return {
      success: false,
      error: err.message
    };
  }
}
