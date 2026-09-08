import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/ConfigUI.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add "🧪 Kiểm Tra Rule" button next to "Thêm Dòng Mới"
old_tb = '''      <div class="toolbar-actions">
        <button type="button" class="btn btn-secondary" onclick="openAddRowModal()">
          Thêm Dòng Mới
        </button>
      </div>'''

new_tb = '''      <div class="toolbar-actions">
        <button type="button" class="btn btn-secondary" onclick="openAddRowModal()">
          Thêm Dòng Mới
        </button>
        <button type="button" class="btn btn-secondary" onclick="openTestRuleModal()" style="border-color: #6366f1; color: #4f46e5; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" title="Kiểm tra thử rule tính điểm cho Tháng 9 hoặc các tháng cũ">
          🧪 Kiểm Tra Rule
        </button>
      </div>'''

if old_tb in content:
    content = content.replace(old_tb, new_tb, 1)
    print("Step 1: Added Kiểm Tra Rule button to toolbar")
else:
    print("Warning: old_tb not found")

# 2. Update renderFundSpecificFields for 'th'
old_th_fields = '''          <div class="form-row-2">
            <div class="form-group">
              <label class="field-label" for="addCode">Mã Dự Án (*)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addCode" placeholder="Ví dụ: MAS OCP2, VIN VGG..." autocomplete="off" oninput="showProjectCodeSuggest('add')" onfocus="showProjectCodeSuggest('add')" required>
                <div class="autocomplete-dropdown" id="addCode_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="addName">Tên Dự Án</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addName" placeholder="Ví dụ: Vinhomes Ocean Park 2..." autocomplete="off" oninput="showProjectNameSuggest('add')" onfocus="showProjectNameSuggest('add')">
                <div class="autocomplete-dropdown" id="addName_dropdown"></div>
              </div>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="field-label" for="addCdt">Chủ Đầu Tư (CĐT)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addCdt" placeholder="Ví dụ: Masterise, Vinhomes..." autocomplete="off" oninput="showCdtSuggest('add')" onfocus="showCdtSuggest('add')">
                <div class="autocomplete-dropdown" id="addCdt_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="addRegion">Miền</label>
              <select class="filter-select" style="width:100%;" id="addRegion">
                <option value="Miền Bắc">Miền Bắc</option>
                <option value="Miền Nam">Miền Nam</option>
                <option value="Miền Trung">Miền Trung</option>
              </select>
            </div>
          </div>'''

new_th_fields = '''          <div class="form-row-2">
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="field-label" for="addCode" style="margin-bottom:0;">Mã Dự Án (*)</label>
                <span class="chip-btn" onclick="setAllProjects('add')" style="font-size:10px; padding:1px 8px; border-radius:10px; background:#e0e7ff; color:#3730a3; cursor:pointer; font-weight:700; border:1px solid #c7d2fe;" title="Chọn áp dụng cho tất cả dự án">⭐ Chọn Tất Cả Dự Án</span>
              </div>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addCode" placeholder="Ví dụ: MAS OCP2, hoặc 'Tất cả'..." autocomplete="off" oninput="showProjectCodeSuggest('add')" onfocus="showProjectCodeSuggest('add')" required>
                <div class="autocomplete-dropdown" id="addCode_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="addName">Tên Dự Án</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addName" placeholder="Ví dụ: Vinhomes Ocean Park 2..." autocomplete="off" oninput="showProjectNameSuggest('add')" onfocus="showProjectNameSuggest('add')">
                <div class="autocomplete-dropdown" id="addName_dropdown"></div>
              </div>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="field-label" for="addCdt">Chủ Đầu Tư (CĐT)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" style="width:100%;" id="addCdt" placeholder="Ví dụ: Masterise, Vinhomes, hoặc Tất cả..." autocomplete="off" oninput="showCdtSuggest('add')" onfocus="showCdtSuggest('add')">
                <div class="autocomplete-dropdown" id="addCdt_dropdown"></div>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">
                <span class="chip-btn" onclick="selectCdtChip('add', 'Tất cả')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:#e0e7ff; color:#3730a3; cursor:pointer; font-weight:700; border:1px solid #c7d2fe;" title="Áp dụng cho mọi CĐT">⭐ Tất cả CĐT</span>
                <span class="chip-btn" onclick="selectCdtChip('add', 'Masterise Homes')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:#fef3c7; color:#92400e; cursor:pointer; font-weight:700; border:1px solid #fde68a;">🏢 Masterise Homes</span>
                <span class="chip-btn" onclick="selectCdtChip('add', 'Các CĐT Khác')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:#dcfce7; color:#166534; cursor:pointer; font-weight:700; border:1px solid #bbf7d0;" title="Áp dụng mọi CĐT trừ Masterise">🏘️ Các CĐT Khác</span>
                <span class="chip-btn" onclick="toggleCdtOption('add', 'Vinhomes')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer; font-weight:600; border:1px solid var(--border-subtle);">Vinhomes</span>
                <span class="chip-btn" onclick="toggleCdtOption('add', 'Capitaland')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer; font-weight:600; border:1px solid var(--border-subtle);">Capitaland</span>
                <span class="chip-btn" onclick="toggleCdtOption('add', 'Gamuda Land')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer; font-weight:600; border:1px solid var(--border-subtle);">Gamuda</span>
                <span class="chip-btn" onclick="toggleCdtOption('add', 'MIK Group')" style="font-size:10px; padding:2px 7px; border-radius:10px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer; font-weight:600; border:1px solid var(--border-subtle);">MIK</span>
              </div>
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="field-label" for="addRegion" style="margin-bottom:0;">Miền</label>
                <div style="display:flex; gap:3px;">
                  <span onclick="setRegionValue('add', 'Tất cả')" style="font-size:10px; font-weight:700; color:var(--primary-600); cursor:pointer;">[Toàn quốc]</span>
                  <span onclick="setRegionValue('add', 'Miền Bắc')" style="font-size:10px; font-weight:600; color:var(--text-tertiary); cursor:pointer;">[Bắc]</span>
                  <span onclick="setRegionValue('add', 'Miền Nam')" style="font-size:10px; font-weight:600; color:var(--text-tertiary); cursor:pointer;">[Nam]</span>
                  <span onclick="setRegionValue('add', 'Miền Trung')" style="font-size:10px; font-weight:600; color:var(--text-tertiary); cursor:pointer;">[Trung]</span>
                </div>
              </div>
              <select class="filter-select" style="width:100%;" id="addRegion">
                <option value="Tất cả">Tất cả các miền (Toàn quốc)</option>
                <option value="Miền Bắc" selected>Miền Bắc</option>
                <option value="Miền Nam">Miền Nam</option>
                <option value="Miền Trung">Miền Trung</option>
                <option value="Miền Bắc, Miền Nam">Miền Bắc & Miền Nam</option>
              </select>
              <div style="margin-top: 8px;">
                <label class="field-label" for="addFundInTH" style="margin-bottom:3px; font-size:11px;">Loại Quỹ</label>
                <select class="filter-select" style="width:100%; font-weight:600; height:32px;" id="addFundInTH">
                  <option value="Quỹ NW" selected>Quỹ NW (Độc quyền Masterise / CĐT khác)</option>
                  <option value="Quỹ Chéo">Quỹ Chéo (Bảng quy đổi điểm Quỹ Chéo)</option>
                </select>
              </div>
            </div>
          </div>'''

if old_th_fields in content:
    content = content.replace(old_th_fields, new_th_fields, 1)
    print("Step 2: Updated renderFundSpecificFields for TH")
else:
    print("Warning: old_th_fields not found")

# 3. Update editRowModal for TH
old_edit_th = '''          <div class="form-row-2">
            <div class="form-group">
              <label class="field-label" for="editCode">Mã Dự Án (*)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCode" value="${escapeHtml(row.code)}" autocomplete="off" oninput="showProjectCodeSuggest('edit')" onfocus="showProjectCodeSuggest('edit')" required>
                <div class="autocomplete-dropdown" id="editCode_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="editName">Tên Dự Án</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editName" value="${escapeHtml(row.name)}" autocomplete="off" oninput="showProjectNameSuggest('edit')" onfocus="showProjectNameSuggest('edit')">
                <div class="autocomplete-dropdown" id="editName_dropdown"></div>
              </div>
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label class="field-label" for="editCdt">Chủ Đầu Tư (CĐT)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCdt" value="${escapeHtml(row.cdt)}" autocomplete="off" oninput="showCdtSuggest('edit')" onfocus="showCdtSuggest('edit')">
                <div class="autocomplete-dropdown" id="editCdt_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="editRegion">Miền</label>
              <select class="filter-select" id="editRegion">
                <option value="Miền Bắc" ${row.region === 'Miền Bắc' ? 'selected' : ''}>Miền Bắc</option>
                <option value="Miền Nam" ${row.region === 'Miền Nam' ? 'selected' : ''}>Miền Nam</option>
                <option value="Miền Trung" ${row.region === 'Miền Trung' ? 'selected' : ''}>Miền Trung</option>
              </select>
            </div>
            <div class="form-group">
              <label class="field-label" for="editStatus">Trạng Thái</label>
              <select class="filter-select" id="editStatus">
                <option value="Đang bán" ${row.status === 'Đang bán' ? 'selected' : ''}>Đang bán</option>
                <option value="Sold out" ${row.status === 'Sold out' ? 'selected' : ''}>Sold out</option>
              </select>
            </div>
          </div>'''

new_edit_th = '''          <div class="form-row-2">
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="field-label" for="editCode" style="margin-bottom:0;">Mã Dự Án (*)</label>
                <span class="chip-btn" onclick="setAllProjects('edit')" style="font-size:10px; padding:1px 8px; border-radius:10px; background:#e0e7ff; color:#3730a3; cursor:pointer; font-weight:700; border:1px solid #c7d2fe;" title="Chọn áp dụng cho tất cả dự án">⭐ Chọn Tất Cả Dự Án</span>
              </div>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCode" value="${escapeHtml(row.code)}" autocomplete="off" oninput="showProjectCodeSuggest('edit')" onfocus="showProjectCodeSuggest('edit')" required>
                <div class="autocomplete-dropdown" id="editCode_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="editName">Tên Dự Án</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editName" value="${escapeHtml(row.name)}" autocomplete="off" oninput="showProjectNameSuggest('edit')" onfocus="showProjectNameSuggest('edit')">
                <div class="autocomplete-dropdown" id="editName_dropdown"></div>
              </div>
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label class="field-label" for="editCdt">Chủ Đầu Tư (CĐT)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCdt" value="${escapeHtml(row.cdt)}" autocomplete="off" oninput="showCdtSuggest('edit')" onfocus="showCdtSuggest('edit')">
                <div class="autocomplete-dropdown" id="editCdt_dropdown"></div>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
                <span class="chip-btn" onclick="selectCdtChip('edit', 'Tất cả')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:#e0e7ff; color:#3730a3; cursor:pointer; font-weight:700;">Tất cả CĐT</span>
                <span class="chip-btn" onclick="selectCdtChip('edit', 'Masterise Homes')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:#fef3c7; color:#92400e; cursor:pointer; font-weight:700;">Masterise</span>
                <span class="chip-btn" onclick="selectCdtChip('edit', 'Các CĐT Khác')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:#dcfce7; color:#166534; cursor:pointer; font-weight:700;">CĐT Khác</span>
                <span class="chip-btn" onclick="toggleCdtOption('edit', 'Vinhomes')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer;">Vinhomes</span>
                <span class="chip-btn" onclick="toggleCdtOption('edit', 'Capitaland')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer;">Capitaland</span>
                <span class="chip-btn" onclick="toggleCdtOption('edit', 'Gamuda Land')" style="font-size:9px; padding:1px 6px; border-radius:8px; background:var(--bg-muted); color:var(--text-secondary); cursor:pointer;">Gamuda</span>
              </div>
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="field-label" for="editRegion" style="margin-bottom:0;">Miền</label>
                <div style="display:flex; gap:2px;">
                  <span onclick="setRegionValue('edit', 'Tất cả')" style="font-size:9px; font-weight:700; color:var(--primary-600); cursor:pointer;">[Toàn quốc]</span>
                </div>
              </div>
              <select class="filter-select" id="editRegion">
                <option value="Tất cả" ${row.region === 'Tất cả' || !row.region ? 'selected' : ''}>Tất cả các miền (Toàn quốc)</option>
                <option value="Miền Bắc" ${row.region === 'Miền Bắc' ? 'selected' : ''}>Miền Bắc</option>
                <option value="Miền Nam" ${row.region === 'Miền Nam' ? 'selected' : ''}>Miền Nam</option>
                <option value="Miền Trung" ${row.region === 'Miền Trung' ? 'selected' : ''}>Miền Trung</option>
                <option value="Miền Bắc, Miền Nam" ${row.region === 'Miền Bắc, Miền Nam' ? 'selected' : ''}>Miền Bắc & Miền Nam</option>
              </select>
            </div>
            <div class="form-group">
              <label class="field-label" for="editStatus">Trạng Thái</label>
              <select class="filter-select" id="editStatus">
                <option value="Đang bán" ${row.status === 'Đang bán' ? 'selected' : ''}>Đang bán</option>
                <option value="Sold out" ${row.status === 'Sold out' ? 'selected' : ''}>Sold out</option>
              </select>
              <div style="margin-top:4px;">
                <label class="field-label" for="editFundInTH" style="font-size:10px; margin-bottom:2px;">Loại Quỹ</label>
                <select class="filter-select" id="editFundInTH" style="height:28px; font-size:11px;">
                  <option value="Quỹ NW" ${row.fund !== 'Quỹ Chéo' ? 'selected' : ''}>Quỹ NW</option>
                  <option value="Quỹ Chéo" ${row.fund === 'Quỹ Chéo' ? 'selected' : ''}>Quỹ Chéo</option>
                </select>
              </div>
            </div>
          </div>'''

if old_edit_th in content:
    content = content.replace(old_edit_th, new_edit_th, 1)
    print("Step 3: Updated editRowModal for TH")
else:
    print("Warning: old_edit_th not found")

# 4. Update submitAddRow to read addFundInTH and not default to Masterise
old_submit_th = '''        const name = (document.getElementById('addName') && document.getElementById('addName').value.trim()) || code;
        const cdt = (document.getElementById('addCdt') && document.getElementById('addCdt').value.trim()) || 'Masterise';
        const region = document.getElementById('addRegion') ? document.getElementById('addRegion').value : 'Miền Bắc';
        const vals = getThreeFieldValues('add');
        const score = parseFloat(document.getElementById('addScore').value) || 0;

        const scoresObj = {};
        configData.thMonths.forEach(m => { scoresObj[m.dateStr] = score; });

        newRowsTH.push({
          status: 'Đang bán',
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          fund: 'Quỹ NW','''

new_submit_th = '''        const name = (document.getElementById('addName') && document.getElementById('addName').value.trim()) || code;
        const cdt = (document.getElementById('addCdt') && document.getElementById('addCdt').value.trim()) || 'Tất cả';
        const region = document.getElementById('addRegion') ? document.getElementById('addRegion').value : 'Tất cả';
        const fundInTH = (document.getElementById('addFundInTH') ? document.getElementById('addFundInTH').value : 'Quỹ NW');
        const vals = getThreeFieldValues('add');
        const score = parseFloat(document.getElementById('addScore').value) || 0;

        const scoresObj = {};
        configData.thMonths.forEach(m => { scoresObj[m.dateStr] = score; });

        newRowsTH.push({
          status: 'Đang bán',
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          fund: fundInTH,'''

if old_submit_th in content:
    content = content.replace(old_submit_th, new_submit_th, 1)
    print("Step 4: Updated submitAddRow for TH")
else:
    print("Warning: old_submit_th not found")

# Also in configData.thRows.push inside submitAddRow:
old_push_th = '''        // Add to local view
        configData.thRows.push({
          rowIdx: configData.thRows.length + 4,
          status: 'Đang bán',
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          fund: 'Quỹ NW','''

new_push_th = '''        // Add to local view
        configData.thRows.push({
          rowIdx: configData.thRows.length + 4,
          status: 'Đang bán',
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          fund: fundInTH,'''

if old_push_th in content:
    content = content.replace(old_push_th, new_push_th, 1)
    print("Step 4b: Updated local view push in submitAddRow")

# Also in submitEditRow for TH:
old_submit_edit_th = '''        const code = document.getElementById('editCode').value.trim();
        if (!code) { showToast('Vui lòng nhập Mã Dự Án!', true); return; }
        const name = document.getElementById('editName').value.trim() || code;
        const cdt = document.getElementById('editCdt').value.trim();
        const region = document.getElementById('editRegion').value;
        const status = document.getElementById('editStatus').value;
        const vals = getThreeFieldValues('edit');'''

new_submit_edit_th = '''        const code = document.getElementById('editCode').value.trim();
        if (!code) { showToast('Vui lòng nhập Mã Dự Án!', true); return; }
        const name = document.getElementById('editName').value.trim() || code;
        const cdt = document.getElementById('editCdt').value.trim() || 'Tất cả';
        const region = document.getElementById('editRegion').value;
        const fundInTH = document.getElementById('editFundInTH') ? document.getElementById('editFundInTH').value : 'Quỹ NW';
        const status = document.getElementById('editStatus').value;
        const vals = getThreeFieldValues('edit');'''

if old_submit_edit_th in content:
    content = content.replace(old_submit_edit_th, new_submit_edit_th, 1)
    # also update the call to updateMonthlyConfigRow
    content = content.replace("fund: 'Quỹ NW'", "fund: fundInTH", 1)
    print("Step 5: Updated submitEditRow for TH")
else:
    print("Warning: old_submit_edit_th not found")

# 5. Insert testRuleModal before customConfirmModal
test_modal_html = '''  <!-- Modal Kiểm Tra Thử Rule (Rule Tester Modal) -->
  <div class="modal-backdrop" id="testRuleModal" style="display:none;">
    <div class="modal-content" style="max-width: 680px; width: 95%;">
      <div class="modal-header" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff;">
        <h3 class="modal-title" style="color:#ffffff; font-weight:800; display:flex; align-items:center; gap:8px;">
          🧪 Kiểm Tra Thử Rule Tính Điểm KPI
        </h3>
        <button type="button" class="modal-close" onclick="closeTestRuleModal()" style="color:#ffffff;">×</button>
      </div>
      <div class="modal-body" style="padding: 16px; gap: 14px;">
        <div style="font-size: 12px; color: var(--text-secondary); background: #f8fafc; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.5;">
          💡 <b>Hướng dẫn kiểm tra:</b> Nhập thông số giao dịch giả lập để kiểm tra xem rule điểm (Tháng 9 hay tháng cũ) có khớp chính xác không trước khi áp dụng trên sheet Data.
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="field-label">Ngày Giao Dịch / Ngày BC (*)</label>
            <input type="date" class="filter-input" id="testDate" value="2026-09-02" style="font-weight:700;">
          </div>
          <div class="form-group">
            <label class="field-label">Loại Quỹ (*)</label>
            <select class="filter-select" id="testLoaiQuy" style="font-weight:700;">
              <option value="Quỹ NW" selected>Quỹ NW (Masterise / CĐT khác)</option>
              <option value="Quỹ Chéo">Quỹ Chéo</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="field-label">Chủ Đầu Tư (CĐT)</label>
            <input type="text" class="filter-input" id="testCdt" placeholder="VD: Masterise Homes, Vinhomes, Gamuda..." value="Masterise Homes" style="font-weight:600;">
            <div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">
              <span class="chip-btn" onclick="document.getElementById('testCdt').value='Masterise Homes'" style="font-size:10px; padding:1px 6px; border-radius:10px; background:#fef3c7; color:#92400e; cursor:pointer; font-weight:700;">Masterise</span>
              <span class="chip-btn" onclick="document.getElementById('testCdt').value='Vinhomes'" style="font-size:10px; padding:1px 6px; border-radius:10px; background:#e0e7ff; color:#3730a3; cursor:pointer; font-weight:600;">Vinhomes</span>
              <span class="chip-btn" onclick="document.getElementById('testCdt').value='Gamuda Land'" style="font-size:10px; padding:1px 6px; border-radius:10px; background:#dcfce7; color:#166534; cursor:pointer; font-weight:600;">Gamuda</span>
              <span class="chip-btn" onclick="document.getElementById('testCdt').value='Capitaland'" style="font-size:10px; padding:1px 6px; border-radius:10px; background:#f3e8ff; color:#6b21a8; cursor:pointer; font-weight:600;">Capitaland</span>
            </div>
          </div>
          <div class="form-group">
            <label class="field-label">Dự Án (Mã hoặc Tên)</label>
            <input type="text" class="filter-input" id="testDuAn" placeholder="VD: MAS OCP2, VIN VGG, hoặc để trống" value="MAS NEW" style="font-weight:600;">
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-group">
            <label class="field-label">Miền</label>
            <select class="filter-select" id="testRegion">
              <option value="Miền Bắc" selected>Miền Bắc</option>
              <option value="Miền Nam">Miền Nam</option>
              <option value="Miền Trung">Miền Trung</option>
            </select>
          </div>
          <div class="form-group">
            <label class="field-label">Sản Phẩm</label>
            <select class="filter-select" id="testSanPham">
              <option value="Tất cả" selected>Tất cả</option>
              <option value="Cao tầng">Cao tầng</option>
              <option value="Thấp tầng">Thấp tầng</option>
            </select>
          </div>
          <div class="form-group">
            <label class="field-label">Loại Căn</label>
            <input type="text" class="filter-input" id="testLoaiCan" placeholder="VD: 2PN, Biệt thự..." value="2PN">
          </div>
        </div>

        <div class="form-group">
          <label class="field-label" style="font-weight:800; color:var(--primary-600);">Giá Trị Căn (tỷ VNĐ)</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="number" step="0.5" min="0" max="999" class="filter-input" id="testGiaTy" value="15.0" style="font-size:15px; font-weight:800; width:120px; color:#0f172a;">
            <span style="font-weight:700; color:var(--text-secondary);">tỷ VNĐ</span>
            <div style="display:flex; gap:6px; margin-left:auto; flex-wrap:wrap;">
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='4.5'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#f1f5f9; cursor:pointer;">4.5 tỷ</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='8.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#f1f5f9; cursor:pointer;">8 tỷ</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='15.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#f1f5f9; cursor:pointer;">15 tỷ</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='25.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#f1f5f9; cursor:pointer;">25 tỷ</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='45.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#f1f5f9; cursor:pointer;">45 tỷ</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='58.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#fef3c7; color:#92400e; cursor:pointer; font-weight:700;">58 tỷ (+1đ)</span>
              <span class="chip-btn" onclick="document.getElementById('testGiaTy').value='75.0'" style="font-size:11px; padding:2px 8px; border-radius:6px; background:#fef3c7; color:#92400e; cursor:pointer; font-weight:700;">75 tỷ (+3đ)</span>
            </div>
          </div>
        </div>

        <!-- Kết Quả Kiểm Tra -->
        <div id="testResultBox" style="display:none; background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:14px; margin-top:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; font-weight:800; color:#166534; text-transform:uppercase;">KẾT QUẢ TÍNH ĐIỂM KPI:</span>
            <span id="testScoreBadge" style="font-size:20px; font-weight:900; color:#15803d; background:#dcfce7; padding:4px 14px; border-radius:20px; border:1px solid #86efac;">0.0 Điểm</span>
          </div>
          <div id="testDetailText" style="font-size:12px; color:#14532d; line-height:1.6;"></div>
        </div>

      </div>
      <div class="modal-footer" style="background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between;">
        <button type="button" class="btn btn-secondary" onclick="closeTestRuleModal()">Đóng</button>
        <button type="button" class="btn btn-primary" onclick="runTestRuleCalculation()" style="background:#4f46e5; border-color:#4338ca; font-weight:800; padding:8px 20px;">
          ⚡ Kiểm Tra Điểm Ngay
        </button>
      </div>
    </div>
  </div>

'''

confirm_tag = '  <!-- Modal Xác Nhận Đẹp (In-App Confirm thay thế browser confirm) -->'
if confirm_tag in content:
    content = content.replace(confirm_tag, test_modal_html + confirm_tag, 1)
    print("Step 6: Inserted testRuleModal into HTML")
else:
    print("Warning: confirm_tag not found")

# 6. Insert JavaScript helper functions
js_helpers = '''
    /* ========== RULE TESTER & MULTI-SELECT HELPERS ========== */
    function setAllProjects(prefix) {
      const codeEl = document.getElementById(prefix + 'Code');
      const nameEl = document.getElementById(prefix + 'Name');
      if (codeEl) codeEl.value = 'Tất cả';
      if (nameEl) nameEl.value = 'Tất cả dự án';
      showToast('Đã chọn: Áp dụng cho Tất Cả Dự Án');
    }

    function selectCdtChip(prefix, cdtValue) {
      const cdtEl = document.getElementById(prefix + 'Cdt');
      if (cdtEl) {
        cdtEl.value = cdtValue;
        showToast('Đã chọn CĐT: ' + cdtValue);
      }
    }

    function toggleCdtOption(prefix, cdtValue) {
      const cdtEl = document.getElementById(prefix + 'Cdt');
      if (!cdtEl) return;
      let cur = cdtEl.value.trim();
      if (!cur || cur === 'Tất cả' || cur === 'Các CĐT Khác') {
        cdtEl.value = cdtValue;
      } else {
        const list = cur.split(/[,;]/).map(s => s.trim()).filter(s => s);
        if (list.includes(cdtValue)) {
          const filtered = list.filter(s => s !== cdtValue);
          cdtEl.value = filtered.join(', ') || 'Tất cả';
        } else {
          list.push(cdtValue);
          cdtEl.value = list.join(', ');
        }
      }
    }

    function setRegionValue(prefix, regionValue) {
      const regEl = document.getElementById(prefix + 'Region');
      if (regEl) {
        regEl.value = regionValue;
        showToast('Đã chọn Miền: ' + regionValue);
      }
    }

    function openTestRuleModal() {
      const modal = document.getElementById('testRuleModal');
      if (modal) modal.style.display = 'flex';
      const resultBox = document.getElementById('testResultBox');
      if (resultBox) resultBox.style.display = 'none';
    }

    function closeTestRuleModal() {
      const modal = document.getElementById('testRuleModal');
      if (modal) modal.style.display = 'none';
    }

    function runTestRuleCalculation() {
      const dateVal = document.getElementById('testDate').value;
      const loaiQuy = document.getElementById('testLoaiQuy').value;
      const cdt = document.getElementById('testCdt').value.trim();
      const code = document.getElementById('testDuAn').value.trim() || 'Tất cả';
      const region = document.getElementById('testRegion').value;
      const sanPham = document.getElementById('testSanPham').value;
      const loaiCan = document.getElementById('testLoaiCan').value.trim() || 'Tất cả';
      const giaTy = parseFloat(document.getElementById('testGiaTy').value) || 0;

      const txData = {
        dateBC: dateVal ? new Date(dateVal) : new Date(),
        loaiQuy: loaiQuy,
        cdt: cdt,
        code: code,
        name: code,
        region: region,
        sanPham: sanPham,
        loaiCan: loaiCan,
        gia: giaTy * 1e9,
        trangThai: 'Đã bán'
      };

      const resultBox = document.getElementById('testResultBox');
      const scoreBadge = document.getElementById('testScoreBadge');
      const detailText = document.getElementById('testDetailText');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        showLoading('Đang kiểm tra rule...');
        google.script.run
          .withSuccessHandler(function(res) {
            hideLoading();
            if (res && res.success) {
              resultBox.style.display = 'block';
              scoreBadge.innerText = Number(res.score).toFixed(1) + ' Điểm';
              
              let html = `<b>Tháng áp dụng:</b> ${res.monthKey} | <b>Quỹ:</b> ${res.loaiQuy}<br>`;
              html += `<b>CĐT:</b> ${res.cdt || '(Mọi CĐT)'} | <b>Dự án:</b> ${res.duAn} | <b>Miền:</b> ${res.region}<br>`;
              html += `<b>Giá:</b> ${res.giaTy} tỷ VNĐ | <b>Sản phẩm:</b> ${res.sanPham} | <b>Loại căn:</b> ${res.loaiCan}<br>`;
              if (res.valInBillion > 50 && res.monthKey >= '2026-09') {
                const extra = Math.floor((res.valInBillion - 50.0001) / 10) + 1;
                html += `<span style="color:#b45309; font-weight:700;">★ Căn trên 50 tỷ: Được cộng thêm +${extra} điểm lũy tiến (+1đ mỗi 10 tỷ tiếp theo).</span><br>`;
              }
              html += `<span style="color:#15803d; font-weight:700;">✓ Đơn hàng các tháng cũ tuyệt đối không bị ảnh hưởng bởi quy tắc này.</span>`;
              detailText.innerHTML = html;
            } else {
              showToast('Lỗi kiểm tra: ' + (res ? res.error : ''), true);
            }
          })
          .withFailureHandler(function(err) {
            hideLoading();
            showToast('Lỗi: ' + (err.message || err), true);
          })
          .testEvaluateTransaction(txData);
      } else {
        resultBox.style.display = 'block';
        scoreBadge.innerText = 'Chế độ mô phỏng';
        detailText.innerHTML = `Đã nhận thông số: CĐT=${cdt}, Dự án=${code}, Giá=${giaTy} tỷ.`;
      }
    }
'''

# Insert js_helpers before </script>
content = content.replace('</script>', js_helpers + '\n</script>', 1)
print("Step 7: Inserted JS helper functions")

with open('src/ConfigUI.html', 'w', encoding='utf-8') as f:
    f.write(content)

with open('ConfigUI.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished updating src/ConfigUI.html and ConfigUI.html!")
