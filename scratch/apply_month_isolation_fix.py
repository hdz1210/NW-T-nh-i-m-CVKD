# -*- coding: utf-8 -*-
import os, sys

def main():
    src_file = r'src/ConfigUI.html'
    with open(src_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update onScoreMonthChange(prefix)
    old_score_month_fn = """    // --- MONTH CONFIG & NOTICE ---
    function onScoreMonthChange(prefix) {
      const select = document.getElementById(prefix + 'ScoreMonth');
      const badge = document.getElementById(prefix + 'ScoreMonthBadge');
      if (!select) return;

      const val = select.value;
      if (val === 'ALL') {
        if (badge) {
          badge.innerText = 'Áp dụng tất cả các tháng';
          badge.style.background = '#eff6ff';
          badge.style.color = '#1d4ed8';
          badge.style.borderColor = '#bfdbfe';
        }
      } else {
        const selectedOption = select.options[select.selectedIndex];
        const rawText = selectedOption ? selectedOption.text.replace('Chỉ ', '') : val;
        const cleanMonth = rawText.replace(/\\s*\\(.*\\)/, '').trim();
        if (badge) {
          badge.innerText = `⚡ CHỈ ${cleanMonth.toUpperCase()}`;
          badge.style.background = '#fff7ed';
          badge.style.color = '#9a3412';
          badge.style.borderColor = '#fdba74';
        }
      }
    }

    function onEditScoreMonthChange(rowIdx) {
      const select = document.getElementById('editScoreMonth');
      const scoreInput = document.getElementById('editScoreVal');
      const row = configData.thRows.find(r => r.rowIdx === rowIdx);
      if (!select || !scoreInput || !row) return;

      const val = select.value;
      if (val === 'ALL') {
        const firstM = configData.thMonths[0];
        scoreInput.value = (firstM && row.scores[firstM.dateStr] !== undefined) ? row.scores[firstM.dateStr] : 3.0;
      } else {
        scoreInput.value = (row.scores[val] !== undefined && row.scores[val] !== '') ? row.scores[val] : '';
      }
    }

    function onEditScoreMonthChangeF2(rowIdx) {
      const select = document.getElementById('editF2ScoreMonth');
      const scoreInput = document.getElementById('editF2ScoreVal');
      const badge = document.getElementById('editF2ScoreMonthBadge');
      const row = configData.f2Rows.find(r => r.rowIdx === rowIdx);
      if (!select || !scoreInput || !row) return;

      const val = select.value;
      if (val === 'ALL') {
        const firstM = configData.f2Months[0];
        scoreInput.value = (firstM && row.scores[firstM.dateStr] !== undefined) ? row.scores[firstM.dateStr] : '';
        if (badge) {
          badge.innerText = 'Cập nhật tất cả các tháng';
          badge.style.background = '#eff6ff';
          badge.style.color = '#1d4ed8';
          badge.style.borderColor = '#bfdbfe';
        }
      } else {
        scoreInput.value = (row.scores[val] !== undefined && row.scores[val] !== '') ? row.scores[val] : '';
        const selectedOption = select.options[select.selectedIndex];
        const rawText = selectedOption ? selectedOption.text.replace('Chỉ ', '') : val;
        const cleanMonth = rawText.replace(/\\s*\\(.*\\)/, '').trim();
        if (badge) {
          badge.innerText = `⚡ CHỈ ${cleanMonth.toUpperCase()}`;
          badge.style.background = '#fff7ed';
          badge.style.color = '#9a3412';
          badge.style.borderColor = '#fdba74';
        }
      }
    }"""

    new_score_month_fn = """    // --- MONTH CONFIG & NOTICE ---
    function onScoreMonthChange(prefix) {
      const select = document.getElementById(prefix + 'ScoreMonth');
      const badge = document.getElementById(prefix + 'ScoreMonthBadge');
      if (!select) return;

      const val = select.value;
      if (val === 'ALL') {
        if (badge) {
          badge.innerText = '⚠️ Áp dụng tất cả các tháng';
          badge.style.background = '#fef2f2';
          badge.style.color = '#b91c1c';
          badge.style.borderColor = '#fca5a5';
        }
      } else {
        const selectedOption = select.options[select.selectedIndex];
        const rawText = selectedOption ? selectedOption.text.replace(/Chỉ |🔒 /g, '') : val;
        const cleanMonth = rawText.replace(/\\s*\\(.*\\)/, '').trim();
        if (badge) {
          badge.innerText = `⚡ CHỈ ${cleanMonth.toUpperCase()} (BẢO TOÀN THÁNG CŨ)`;
          badge.style.background = '#fff7ed';
          badge.style.color = '#9a3412';
          badge.style.borderColor = '#fdba74';
        }
      }
    }

    function onEditScoreMonthChange(rowIdx) {
      const select = document.getElementById('editScoreMonth');
      const scoreInput = document.getElementById('editScoreVal');
      const badge = document.getElementById('editScoreMonthBadge');
      const clearBox = document.getElementById('editClearOtherMonthsBox');
      const clearCb = document.getElementById('editClearOtherMonths');
      const row = configData.thRows.find(r => r.rowIdx === rowIdx);
      if (!select || !scoreInput || !row) return;

      const val = select.value;
      if (val === 'ALL') {
        if (clearBox) clearBox.style.display = 'none';
        const firstM = configData.thMonths[0];
        scoreInput.value = (firstM && row.scores[firstM.dateStr] !== undefined && row.scores[firstM.dateStr] !== '') ? row.scores[firstM.dateStr] : 3.0;
        if (badge) {
          badge.innerText = '⚠️ Áp dụng tất cả các tháng';
          badge.style.background = '#eff6ff';
          badge.style.color = '#1d4ed8';
          badge.style.borderColor = '#bfdbfe';
        }
      } else {
        if (clearBox) clearBox.style.display = 'block';
        scoreInput.value = (row.scores[val] !== undefined && row.scores[val] !== '') ? row.scores[val] : '';
        const selectedOption = select.options[select.selectedIndex];
        const rawText = selectedOption ? selectedOption.text.replace(/Chỉ |🔒 /g, '') : val;
        const cleanMonth = rawText.replace(/\\s*\\(.*\\)/, '').trim();
        const isClearing = clearCb && clearCb.checked;
        if (badge) {
          badge.innerText = isClearing ? `⚡ CHỈ ${cleanMonth.toUpperCase()} (BẢO TOÀN CŨ)` : `Sửa ${cleanMonth}`;
          badge.style.background = isClearing ? '#fef2f2' : '#fff7ed';
          badge.style.color = isClearing ? '#b91c1c' : '#9a3412';
          badge.style.borderColor = isClearing ? '#fca5a5' : '#fdba74';
        }
      }
    }

    function onEditScoreMonthChangeF2(rowIdx) {
      const select = document.getElementById('editF2ScoreMonth');
      const scoreInput = document.getElementById('editF2ScoreVal');
      const badge = document.getElementById('editF2ScoreMonthBadge');
      const clearBox = document.getElementById('editF2ClearOtherMonthsBox');
      const clearCb = document.getElementById('editF2ClearOtherMonths');
      const row = configData.f2Rows.find(r => r.rowIdx === rowIdx);
      if (!select || !scoreInput || !row) return;

      const val = select.value;
      if (val === 'ALL') {
        if (clearBox) clearBox.style.display = 'none';
        const firstM = configData.f2Months[0];
        scoreInput.value = (firstM && row.scores[firstM.dateStr] !== undefined && row.scores[firstM.dateStr] !== '') ? row.scores[firstM.dateStr] : '';
        if (badge) {
          badge.innerText = '⚠️ Áp dụng tất cả các tháng';
          badge.style.background = '#eff6ff';
          badge.style.color = '#1d4ed8';
          badge.style.borderColor = '#bfdbfe';
        }
      } else {
        if (clearBox) clearBox.style.display = 'block';
        scoreInput.value = (row.scores[val] !== undefined && row.scores[val] !== '') ? row.scores[val] : '';
        const selectedOption = select.options[select.selectedIndex];
        const rawText = selectedOption ? selectedOption.text.replace(/Chỉ |🔒 /g, '') : val;
        const cleanMonth = rawText.replace(/\\s*\\(.*\\)/, '').trim();
        const isClearing = clearCb && clearCb.checked;
        if (badge) {
          badge.innerText = isClearing ? `⚡ CHỈ ${cleanMonth.toUpperCase()} (BẢO TOÀN CŨ)` : `Sửa ${cleanMonth}`;
          badge.style.background = isClearing ? '#fef2f2' : '#fff7ed';
          badge.style.color = isClearing ? '#b91c1c' : '#9a3412';
          badge.style.borderColor = isClearing ? '#fca5a5' : '#fdba74';
        }
      }
    }"""

    if old_score_month_fn not in content:
        print("Error: old_score_month_fn not found!")
        return False
    content = content.replace(old_score_month_fn, new_score_month_fn)

    # 2. Update openAddRowModal() TH: options and badge
    old_add_th_options = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        let monthOptionsHtml = '';
        (configData.thMonths || []).forEach(m => {
          const isLatest = (configData.thMonths[0] && m.dateStr === configData.thMonths[0].dateStr);
          const isSelected = (selMonthOnToolbar === m.dateStr);
          monthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>Chỉ Tháng ${m.display} ${isLatest ? '(MỚI NHẤT)' : ''}</option>`;
        });"""

    new_add_th_options = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        const latestM = (configData.thMonths && configData.thMonths.length > 0) ? configData.thMonths[0] : null;
        let monthOptionsHtml = '';
        (configData.thMonths || []).forEach(m => {
          const isLatest = (latestM && m.dateStr === latestM.dateStr);
          const isSelected = (selMonthOnToolbar === m.dateStr) || (selMonthOnToolbar === 'ALL' && isLatest);
          monthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>${isLatest ? '🔒 Chỉ Tháng ' + m.display + ' (MỚI NHẤT - Bảo toàn tháng cũ)' : 'Chỉ Tháng ' + m.display}</option>`;
        });"""

    if old_add_th_options not in content:
        print("Error: old_add_th_options not found!")
        return False
    content = content.replace(old_add_th_options, new_add_th_options)

    old_add_th_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                CẤU HÌNH ĐIỂM & THỜI GIAN ÁP DỤNG
              </span>
              <span id="addScoreMonthBadge" class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
                Áp dụng tất cả các tháng
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="addScoreMonth" style="font-weight:700; color:var(--text-secondary);">Tháng Áp Dụng Rule <span style="color:var(--danger)">*</span></label>
                <select class="filter-select" id="addScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onScoreMonthChange('add')">
                  <option value="ALL">Tất cả các tháng (Mặc định)</option>
                  ${monthOptionsHtml}
                </select>
              </div>"""

    new_add_th_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                CẤU HÌNH ĐIỂM & THỜI GIAN ÁP DỤNG
              </span>
              <span id="addScoreMonthBadge" class="badge" style="background:#fff7ed; color:#9a3412; border:1px solid #fdba74; font-weight:700;">
                ⚡ CHỈ THÁNG ${latestM ? latestM.display : ''} (BẢO TOÀN THÁNG CŨ)
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="addScoreMonth" style="font-weight:700; color:var(--text-secondary);">Tháng Áp Dụng Rule <span style="color:var(--danger)">*</span></label>
                <select class="filter-select" id="addScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onScoreMonthChange('add')">
                  ${monthOptionsHtml}
                  <option value="ALL">⚠️ Tất cả các tháng (Áp dụng đồng loạt)</option>
                </select>
              </div>"""

    if old_add_th_html not in content:
        print("Error: old_add_th_html not found!")
        return False
    content = content.replace(old_add_th_html, new_add_th_html)

    # 3. Update openAddRowModal() F2: options and badge
    old_add_f2_options = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        let f2MonthOptionsHtml = '';
        (configData.f2Months || []).forEach(m => {
          const isLatest = (configData.f2Months[0] && m.dateStr === configData.f2Months[0].dateStr);
          const isSelected = (selMonthOnToolbar === m.dateStr);
          f2MonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>Chỉ Tháng ${m.display} ${isLatest ? '(MỚI NHẤT)' : ''}</option>`;
        });"""

    new_add_f2_options = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        const latestF2M = (configData.f2Months && configData.f2Months.length > 0) ? configData.f2Months[0] : null;
        let f2MonthOptionsHtml = '';
        (configData.f2Months || []).forEach(m => {
          const isLatest = (latestF2M && m.dateStr === latestF2M.dateStr);
          const isSelected = (selMonthOnToolbar === m.dateStr) || (selMonthOnToolbar === 'ALL' && isLatest);
          f2MonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>${isLatest ? '🔒 Chỉ Tháng ' + m.display + ' (MỚI NHẤT - Bảo toàn tháng cũ)' : 'Chỉ Tháng ' + m.display}</option>`;
        });"""

    if old_add_f2_options not in content:
        print("Error: old_add_f2_options not found!")
        return False
    content = content.replace(old_add_f2_options, new_add_f2_options)

    old_add_f2_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                CẤU HÌNH ĐIỂM & THỜI GIAN ÁP DỤNG
              </span>
              <span id="addF2ScoreMonthBadge" class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
                Áp dụng tất cả các tháng
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="addF2ScoreMonth" style="font-weight:700; color:var(--text-secondary);">Tháng Áp Dụng Rule <span style="color:var(--danger)">*</span></label>
                <select class="filter-select" id="addF2ScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onScoreMonthChange('addF2')">
                  <option value="ALL">Tất cả các tháng (Mặc định)</option>
                  ${f2MonthOptionsHtml}
                </select>
              </div>"""

    new_add_f2_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                CẤU HÌNH ĐIỂM & THỜI GIAN ÁP DỤNG
              </span>
              <span id="addF2ScoreMonthBadge" class="badge" style="background:#fff7ed; color:#9a3412; border:1px solid #fdba74; font-weight:700;">
                ⚡ CHỈ THÁNG ${latestF2M ? latestF2M.display : ''} (BẢO TOÀN THÁNG CŨ)
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="addF2ScoreMonth" style="font-weight:700; color:var(--text-secondary);">Tháng Áp Dụng Rule <span style="color:var(--danger)">*</span></label>
                <select class="filter-select" id="addF2ScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onScoreMonthChange('addF2')">
                  ${f2MonthOptionsHtml}
                  <option value="ALL">⚠️ Tất cả các tháng (Áp dụng đồng loạt)</option>
                </select>
              </div>"""

    if old_add_f2_html not in content:
        print("Error: old_add_f2_html not found!")
        return False
    content = content.replace(old_add_f2_html, new_add_f2_html)

    # 4. Update openEditRowModal() TH: options, badge, checkbox and identical check
    old_edit_th_block = """        title.innerText = `Sửa Dự Án: ${row.code} (${row.name})`;
        const submitBtnTH = document.getElementById('btnEditRowSubmit');
        if (submitBtnTH) submitBtnTH.innerText = 'Lưu Cập Nhật';
        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        let editMonthOptionsHtml = '';
        let initialEditScore = '';
        (configData.thMonths || []).forEach(m => {
          const isSelected = (selMonthOnToolbar === m.dateStr);
          if (isSelected) initialEditScore = row.scores[m.dateStr] || '';
          editMonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>Tháng ${m.display}</option>`;
        });
        if (!initialEditScore && configData.thMonths[0]) {
          initialEditScore = row.scores[configData.thMonths[0].dateStr] || '';
        }"""

    new_edit_th_block = """        title.innerText = `Sửa Dự Án: ${row.code} (${row.name})`;
        const submitBtnTH = document.getElementById('btnEditRowSubmit');
        if (submitBtnTH) submitBtnTH.innerText = 'Lưu Cập Nhật';
        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        const latestM = (configData.thMonths && configData.thMonths.length > 0) ? configData.thMonths[0] : null;
        const targetMonthDateStr = (selMonthOnToolbar !== 'ALL') ? selMonthOnToolbar : (latestM ? latestM.dateStr : 'ALL');

        // Kiểm tra xem dòng này có đang bị ghi cùng 1 điểm ở mọi tháng hay không (như trường hợp hàng 114 bị điểm 4 ở tất cả các tháng)
        let identicalScore = null;
        let isIdenticalAll = (configData.thMonths && configData.thMonths.length > 1);
        (configData.thMonths || []).forEach(m => {
          const s = row.scores[m.dateStr];
          if (s === undefined || s === '' || isNaN(s)) {
            isIdenticalAll = false;
          } else if (identicalScore === null) {
            identicalScore = s;
          } else if (identicalScore !== s) {
            isIdenticalAll = false;
          }
        });

        let editMonthOptionsHtml = '';
        let initialEditScore = '';
        (configData.thMonths || []).forEach(m => {
          const isLatest = (latestM && m.dateStr === latestM.dateStr);
          const isSelected = (m.dateStr === targetMonthDateStr);
          if (isSelected) initialEditScore = (row.scores[m.dateStr] !== undefined && row.scores[m.dateStr] !== '') ? row.scores[m.dateStr] : '';
          editMonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>${isLatest ? '🔒 Chỉ Tháng ' + m.display + ' (MỚI NHẤT)' : 'Tháng ' + m.display}</option>`;
        });
        if (initialEditScore === '' && latestM) {
          initialEditScore = (row.scores[latestM.dateStr] !== undefined && row.scores[latestM.dateStr] !== '') ? row.scores[latestM.dateStr] : '';
        }"""

    if old_edit_th_block not in content:
        print("Error: old_edit_th_block not found!")
        return False
    content = content.replace(old_edit_th_block, new_edit_th_block)

    old_edit_th_html = """          <!-- Cập nhật điểm cho tháng cụ thể hoặc tất cả -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                CẬP NHẬT ĐIỂM CHO THÁNG
              </span>
              <span id="editScoreMonthBadge" class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
                ${selMonthOnToolbar !== 'ALL' ? 'Chỉ cập nhật tháng đang lọc' : 'Cập nhật điểm'}
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editScoreMonth" style="font-weight:700;">Tháng Cần Đổi Điểm</label>
                <select class="filter-select" id="editScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onEditScoreMonthChange(${rowIdx})">
                  <option value="ALL">Cập nhật tất cả các tháng</option>
                  ${editMonthOptionsHtml}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editScoreVal" style="font-weight:800;">Điểm Số (*)</label>
                <input type="number" step="0.5" class="filter-input" style="width:100%; height:36px; font-weight:800; font-size:15px; text-align:center;" id="editScoreVal" value="${initialEditScore}">
              </div>
            </div>
          </div>
        `;
        buildDuAnMultiSelect('edit', row.code);
        buildTenDuAnMultiSelect('edit', row.name || row.code);
        buildCdtMultiSelect('edit', row.cdt);
        buildRegionMultiSelect('edit', row.region);
        buildMultiSelectOptions('edit', existingUnits);"""

    new_edit_th_html = """          <!-- Cập nhật điểm cho tháng cụ thể hoặc tất cả -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                CẬP NHẬT ĐIỂM CHO THÁNG
              </span>
              <span id="editScoreMonthBadge" class="badge" style="background:${isIdenticalAll ? '#fef2f2' : '#fff7ed'}; color:${isIdenticalAll ? '#b91c1c' : '#9a3412'}; border:1px solid ${isIdenticalAll ? '#fca5a5' : '#fdba74'}; font-weight:700;">
                ${isIdenticalAll ? '⚡ CHỈ THÁNG ' + (latestM ? latestM.display : '') + ' (BẢO TOÀN CŨ)' : 'Sửa điểm'}
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editScoreMonth" style="font-weight:700;">Tháng Cần Đổi Điểm</label>
                <select class="filter-select" id="editScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onEditScoreMonthChange(${rowIdx})">
                  ${editMonthOptionsHtml}
                  <option value="ALL">⚠️ Áp dụng tất cả các tháng (Đồng loạt)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editScoreVal" style="font-weight:800;">Điểm Số (*)</label>
                <input type="number" step="0.5" class="filter-input" style="width:100%; height:36px; font-weight:800; font-size:15px; text-align:center;" id="editScoreVal" value="${initialEditScore}">
              </div>
            </div>

            <!-- Tùy chọn xóa điểm các tháng khác để bảo toàn tháng cũ -->
            <div id="editClearOtherMonthsBox" style="margin-top:4px; padding-top:6px; border-top:1px dashed var(--border-subtle);">
              <label style="font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-secondary); margin-bottom:0;">
                <input type="checkbox" id="editClearOtherMonths" style="cursor:pointer; width:16px; height:16px;" ${isIdenticalAll ? 'checked' : ''} onchange="onEditScoreMonthChange(${rowIdx})">
                <span style="color:${isIdenticalAll ? '#b91c1c' : 'var(--text-secondary)'};">
                  🔒 Chỉ áp dụng tháng này (Tự động xóa trống điểm các tháng khác để bảo toàn lịch sử tháng cũ)
                </span>
              </label>
              ${isIdenticalAll ? `
                <div style="font-size:11px; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:4px 8px; margin-top:4px;">
                  ⚠️ Lưu ý: Dòng này đang có cùng điểm (${identicalScore}) ở tất cả các tháng. Hệ thống đã tự động tích chọn xóa trống các tháng khác để quy tắc này chỉ áp dụng riêng cho Tháng ${latestM ? latestM.display : ''}.
                </div>
              ` : ''}
            </div>
          </div>
        `;
        buildDuAnMultiSelect('edit', row.code);
        buildTenDuAnMultiSelect('edit', row.name || row.code);
        buildCdtMultiSelect('edit', row.cdt);
        buildRegionMultiSelect('edit', row.region);
        buildMultiSelectOptions('edit', existingUnits);
        onEditScoreMonthChange(rowIdx);"""

    if old_edit_th_html not in content:
        print("Error: old_edit_th_html not found!")
        return False
    content = content.replace(old_edit_th_html, new_edit_th_html)

    # 5. Update openEditRowModal() F2: options, badge, checkbox and identical check
    old_edit_f2_block = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        let editF2MonthOptionsHtml = '';
        let initialF2Score = '';
        if (selMonthOnToolbar !== 'ALL' && row.scores[selMonthOnToolbar] !== undefined && row.scores[selMonthOnToolbar] !== '') {
          initialF2Score = row.scores[selMonthOnToolbar];
        } else {
          const firstM = configData.f2Months[0];
          if (firstM && row.scores[firstM.dateStr] !== undefined && row.scores[firstM.dateStr] !== '') {
            initialF2Score = row.scores[firstM.dateStr];
          }
        }

        (configData.f2Months || []).forEach(m => {
          const isLatest = (configData.f2Months[0] && m.dateStr === configData.f2Months[0].dateStr);
          const isSelected = (selMonthOnToolbar === m.dateStr);
          editF2MonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>Chỉ Tháng ${m.display} ${isLatest ? '(MỚI NHẤT)' : ''}</option>`;
        });"""

    new_edit_f2_block = """        const selMonthOnToolbar = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'ALL';
        const latestF2M = (configData.f2Months && configData.f2Months.length > 0) ? configData.f2Months[0] : null;
        const targetMonthDateStrF2 = (selMonthOnToolbar !== 'ALL') ? selMonthOnToolbar : (latestF2M ? latestF2M.dateStr : 'ALL');

        // Kiểm tra xem dòng F2 này có bị ghi cùng 1 điểm ở mọi tháng hay không
        let identicalScoreF2 = null;
        let isIdenticalAllF2 = (configData.f2Months && configData.f2Months.length > 1);
        (configData.f2Months || []).forEach(m => {
          const s = row.scores[m.dateStr];
          if (s === undefined || s === '' || isNaN(s)) {
            isIdenticalAllF2 = false;
          } else if (identicalScoreF2 === null) {
            identicalScoreF2 = s;
          } else if (identicalScoreF2 !== s) {
            isIdenticalAllF2 = false;
          }
        });

        let editF2MonthOptionsHtml = '';
        let initialF2Score = '';
        (configData.f2Months || []).forEach(m => {
          const isLatest = (latestF2M && m.dateStr === latestF2M.dateStr);
          const isSelected = (m.dateStr === targetMonthDateStrF2);
          if (isSelected) initialF2Score = (row.scores[m.dateStr] !== undefined && row.scores[m.dateStr] !== '') ? row.scores[m.dateStr] : '';
          editF2MonthOptionsHtml += `<option value="${m.dateStr}" ${isSelected ? 'selected' : ''}>${isLatest ? '🔒 Chỉ Tháng ' + m.display + ' (MỚI NHẤT)' : 'Tháng ' + m.display}</option>`;
        });
        if (initialF2Score === '' && latestF2M) {
          initialF2Score = (row.scores[latestF2M.dateStr] !== undefined && row.scores[latestF2M.dateStr] !== '') ? row.scores[latestF2M.dateStr] : '';
        }"""

    if old_edit_f2_block not in content:
        print("Error: old_edit_f2_block not found!")
        return False
    content = content.replace(old_edit_f2_block, new_edit_f2_block)

    old_edit_f2_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                CẬP NHẬT ĐIỂM CHO THÁNG
              </span>
              <span id="editF2ScoreMonthBadge" class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700;">
                ${selMonthOnToolbar !== 'ALL' ? 'Chỉ cập nhật tháng đang lọc' : 'Cập nhật điểm'}
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editF2ScoreMonth" style="font-weight:700;">Tháng Cần Đổi Điểm</label>
                <select class="filter-select" id="editF2ScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onEditScoreMonthChangeF2(${rowIdx})">
                  <option value="ALL">Cập nhật tất cả các tháng</option>
                  ${editF2MonthOptionsHtml}
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editF2ScoreVal" style="font-weight:800;">Điểm Cơ Sở (*)</label>
                <input type="number" step="0.5" class="filter-input" style="width:100%; height:36px; font-weight:800; font-size:15px; text-align:center;" id="editF2ScoreVal" value="${initialF2Score}">
              </div>
            </div>
          </div>
        `;
        buildDuAnF2MultiSelect('edit', row.name);
        if (selMonthOnToolbar !== 'ALL') {
          onEditScoreMonthChangeF2(rowIdx);
        }"""

    new_edit_f2_html = """          <!-- Cấu hình điểm & Tháng áp dụng -->
          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                CẬP NHẬT ĐIỂM CHO THÁNG
              </span>
              <span id="editF2ScoreMonthBadge" class="badge" style="background:${isIdenticalAllF2 ? '#fef2f2' : '#fff7ed'}; color:${isIdenticalAllF2 ? '#b91c1c' : '#9a3412'}; border:1px solid ${isIdenticalAllF2 ? '#fca5a5' : '#fdba74'}; font-weight:700;">
                ${isIdenticalAllF2 ? '⚡ CHỈ THÁNG ' + (latestF2M ? latestF2M.display : '') + ' (BẢO TOÀN CŨ)' : 'Sửa điểm'}
              </span>
            </div>
            <div class="form-row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editF2ScoreMonth" style="font-weight:700;">Tháng Cần Đổi Điểm</label>
                <select class="filter-select" id="editF2ScoreMonth" style="width:100%; height:36px; font-weight:700; background:#ffffff;" onchange="onEditScoreMonthChangeF2(${rowIdx})">
                  ${editF2MonthOptionsHtml}
                  <option value="ALL">⚠️ Áp dụng tất cả các tháng (Đồng loạt)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="field-label" for="editF2ScoreVal" style="font-weight:800;">Điểm Cơ Sở (*)</label>
                <input type="number" step="0.5" class="filter-input" style="width:100%; height:36px; font-weight:800; font-size:15px; text-align:center;" id="editF2ScoreVal" value="${initialF2Score}">
              </div>
            </div>

            <!-- Tùy chọn xóa điểm các tháng khác để bảo toàn tháng cũ -->
            <div id="editF2ClearOtherMonthsBox" style="margin-top:4px; padding-top:6px; border-top:1px dashed var(--border-subtle);">
              <label style="font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-secondary); margin-bottom:0;">
                <input type="checkbox" id="editF2ClearOtherMonths" style="cursor:pointer; width:16px; height:16px;" ${isIdenticalAllF2 ? 'checked' : ''} onchange="onEditScoreMonthChangeF2(${rowIdx})">
                <span style="color:${isIdenticalAllF2 ? '#b91c1c' : 'var(--text-secondary)'};">
                  🔒 Chỉ áp dụng tháng này (Tự động xóa trống điểm các tháng khác để bảo toàn lịch sử tháng cũ)
                </span>
              </label>
              ${isIdenticalAllF2 ? `
                <div style="font-size:11px; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca; border-radius:4px; padding:4px 8px; margin-top:4px;">
                  ⚠️ Lưu ý: Dòng này đang có cùng điểm (${identicalScoreF2}) ở tất cả các tháng. Hệ thống đã tự động tích chọn xóa trống các tháng khác để quy tắc này chỉ áp dụng riêng cho Tháng ${latestF2M ? latestF2M.display : ''}.
                </div>
              ` : ''}
            </div>
          </div>
        `;
        buildDuAnF2MultiSelect('edit', row.name);
        onEditScoreMonthChangeF2(rowIdx);"""

    if old_edit_f2_html not in content:
        print("Error: old_edit_f2_html not found!")
        return False
    content = content.replace(old_edit_f2_html, new_edit_f2_html)

    # 6. Update submitEditRow() for TH and F2
    old_submit_th = """        // Check if score changed in modal
        const editScoreMonth = document.getElementById('editScoreMonth') ? document.getElementById('editScoreMonth').value : 'ALL';
        const editScoreValEl = document.getElementById('editScoreVal');
        const newScoreVal = editScoreValEl ? editScoreValEl.value.trim() : '';

        const monthUpdates = [];
        if (row && newScoreVal !== '') {
          const parsedScore = parseFloat(newScoreVal);
          if (editScoreMonth === 'ALL') {
            configData.thMonths.forEach(m => {
              row.scores[m.dateStr] = parsedScore;
              modifiedCellsTH.set(`${rowIdx}_${m.colIdx}`, { rowIdx, colIdx: m.colIdx, score: parsedScore });
              monthUpdates.push({ colIdx: m.colIdx, score: parsedScore });
            });
          } else {
            const mObj = configData.thMonths.find(m => m.dateStr === editScoreMonth);
            if (mObj) {
              row.scores[editScoreMonth] = parsedScore;
              modifiedCellsTH.set(`${rowIdx}_${mObj.colIdx}`, { rowIdx, colIdx: mObj.colIdx, score: parsedScore });
              monthUpdates.push({ colIdx: mObj.colIdx, score: parsedScore });
            }
          }
        }"""

    new_submit_th = """        // Check if score changed in modal
        const editScoreMonth = document.getElementById('editScoreMonth') ? document.getElementById('editScoreMonth').value : 'ALL';
        const editScoreValEl = document.getElementById('editScoreVal');
        const editClearOtherMonthsEl = document.getElementById('editClearOtherMonths');
        const shouldClearOtherMonths = editClearOtherMonthsEl && editClearOtherMonthsEl.checked && editScoreMonth !== 'ALL';
        const newScoreVal = editScoreValEl ? editScoreValEl.value.trim() : '';

        const monthUpdates = [];
        if (row && newScoreVal !== '') {
          const parsedScore = parseFloat(newScoreVal);
          if (editScoreMonth === 'ALL') {
            configData.thMonths.forEach(m => {
              row.scores[m.dateStr] = parsedScore;
              modifiedCellsTH.set(`${rowIdx}_${m.colIdx}`, { rowIdx, colIdx: m.colIdx, score: parsedScore });
              monthUpdates.push({ colIdx: m.colIdx, score: parsedScore });
            });
          } else {
            const mObj = configData.thMonths.find(m => m.dateStr === editScoreMonth);
            if (mObj) {
              row.scores[editScoreMonth] = parsedScore;
              modifiedCellsTH.set(`${rowIdx}_${mObj.colIdx}`, { rowIdx, colIdx: mObj.colIdx, score: parsedScore });
              monthUpdates.push({ colIdx: mObj.colIdx, score: parsedScore });
            }
            if (shouldClearOtherMonths) {
              configData.thMonths.forEach(m => {
                if (m.dateStr !== editScoreMonth) {
                  row.scores[m.dateStr] = '';
                  modifiedCellsTH.set(`${rowIdx}_${m.colIdx}`, { rowIdx, colIdx: m.colIdx, score: '' });
                  monthUpdates.push({ colIdx: m.colIdx, score: '' });
                }
              });
            }
          }
        }"""

    if old_submit_th not in content:
        print("Error: old_submit_th not found!")
        return False
    content = content.replace(old_submit_th, new_submit_th)

    old_submit_f2 = """        const scoreMonth = scoreMonthEl ? scoreMonthEl.value : 'ALL';
        const scoreVal = scoreValEl ? scoreValEl.value.trim() : '';
        const khoangGia = khoangGiaEl ? khoangGiaEl.value.trim() : 'Tất cả';

        const monthUpdates = [];
        if (scoreVal !== '') {
          const numScore = parseFloat(scoreVal) || 0;
          if (scoreMonth === 'ALL') {
            (configData.f2Months || []).forEach(m => {
              monthUpdates.push({ colIdx: m.colIdx, dateStr: m.dateStr, score: numScore });
              if (row && row.scores) row.scores[m.dateStr] = numScore;
            });
          } else {
            const mObj = (configData.f2Months || []).find(m => m.dateStr === scoreMonth);
            if (mObj) {
              monthUpdates.push({ colIdx: mObj.colIdx, dateStr: mObj.dateStr, score: numScore });
              if (row && row.scores) row.scores[mObj.dateStr] = numScore;
            }
          }
        }"""

    new_submit_f2 = """        const scoreMonth = scoreMonthEl ? scoreMonthEl.value : 'ALL';
        const scoreVal = scoreValEl ? scoreValEl.value.trim() : '';
        const khoangGia = khoangGiaEl ? khoangGiaEl.value.trim() : 'Tất cả';
        const editF2ClearOtherMonthsEl = document.getElementById('editF2ClearOtherMonths');
        const shouldClearOtherMonthsF2 = editF2ClearOtherMonthsEl && editF2ClearOtherMonthsEl.checked && scoreMonth !== 'ALL';

        const monthUpdates = [];
        if (scoreVal !== '') {
          const numScore = parseFloat(scoreVal) || 0;
          if (scoreMonth === 'ALL') {
            (configData.f2Months || []).forEach(m => {
              monthUpdates.push({ colIdx: m.colIdx, dateStr: m.dateStr, score: numScore });
              if (row && row.scores) row.scores[m.dateStr] = numScore;
            });
          } else {
            const mObj = (configData.f2Months || []).find(m => m.dateStr === scoreMonth);
            if (mObj) {
              monthUpdates.push({ colIdx: mObj.colIdx, dateStr: mObj.dateStr, score: numScore });
              if (row && row.scores) row.scores[mObj.dateStr] = numScore;
            }
            if (shouldClearOtherMonthsF2) {
              (configData.f2Months || []).forEach(m => {
                if (m.dateStr !== scoreMonth) {
                  monthUpdates.push({ colIdx: m.colIdx, dateStr: m.dateStr, score: '' });
                  if (row && row.scores) row.scores[m.dateStr] = '';
                }
              });
            }
          }
        }"""

    if old_submit_f2 not in content:
        print("Error: old_submit_f2 not found!")
        return False
    content = content.replace(old_submit_f2, new_submit_f2)

    with open(src_file, 'w', encoding='utf-8') as f:
        f.write(content)
    with open('ConfigUI.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Success: All 6 replacements applied and synced to root ConfigUI.html!")
    return True

if __name__ == '__main__':
    main()
