import sys

with open('src/ConfigUI.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove app-subtitle in main header
old_header_sub = """        <p class="app-subtitle">Hệ thống phân bổ & điều chỉnh hệ số điểm CVKD (Quỹ NW, Quỹ Chéo F2 & Điểm Chiến Dịch)</p>"""
if old_header_sub in html:
    html = html.replace(old_header_sub, "", 1)

# 2. Update campaignControlPanel header and body:
# - Remove subtitle: Thiết lập điểm ưu đãi áp dụng theo khoảng ngày giao dịch...
# - Remove note box: 💡 Quy tắc áp dụng: Khi chiến dịch ở trạng thái Đang chạy...
# - Rename title: Cấu Hình Điểm Chiến Dịch
# - Replace button 'Sao Chép Từ Tổng Hợp' with 'Tạo Dòng Mới' and 'Chọn Dòng Từ Tổng Hợp'
old_camp_panel = """    <!-- Campaign Control Panel (Hiển thị khi chọn tab Điểm Chiến Dịch) -->
    <div class="campaign-control-card" id="campaignControlPanel" style="display: none;">
      <div class="campaign-control-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px; line-height: 1;">🔥</span>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #9a3412;">Cấu Hình Chiến Dịch Điểm Tạm (Cột X)</div>
            <div style="font-size: 12.5px; color: #7c2d12;">Thiết lập điểm ưu đãi áp dụng theo khoảng ngày giao dịch (Ngày BC) ghi trực tiếp vào Cột X</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="cloneFromTongHopToCampaign()" style="border-color: #fdba74; color: #9a3412; background: #ffffff;" title="Sao chép toàn bộ 106 điều kiện từ Tổng Hợp sang Chiến Dịch">
            <span>📋</span> Sao Chép Từ Tổng Hợp
          </button>
          <button type="button" class="btn btn-primary" onclick="saveCampaignChanges()" style="background-color: #ea580c; border-color: #c2410c;">
            <span>💾</span> Lưu Bảng Chiến Dịch
          </button>
        </div>
      </div>

      <div class="campaign-form-row">
        <div class="campaign-field-group" style="flex: 2; min-width: 260px;">
          <label class="campaign-field-label" for="campaignName">Tên Chiến Dịch (*)</label>
          <input type="text" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignName" placeholder="VD: Chiến dịch Bùng Nổ Mùa Hè 2026" oninput="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 150px;">
          <label class="campaign-field-label" for="campaignStartDate">Từ Ngày (*)</label>
          <input type="date" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignStartDate" onchange="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 150px;">
          <label class="campaign-field-label" for="campaignEndDate">Đến Ngày (*)</label>
          <input type="date" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignEndDate" onchange="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 160px;">
          <label class="campaign-field-label" for="campaignStatus">Trạng Thái Chiến Dịch</label>
          <select class="filter-select" style="width: 100%; border-color: #fed7aa; font-weight: 700;" id="campaignStatus" onchange="markCampaignDirty()">
            <option value="Đang chạy">🟢 Đang chạy (Active)</option>
            <option value="Tạm dừng">⏸️ Tạm dừng (Paused)</option>
            <option value="Kết thúc">⚪ Kết thúc (Ended)</option>
          </select>
        </div>
      </div>

      <div style="font-size: 12px; color: #9a3412; background: rgba(255, 237, 213, 0.6); padding: 8px 12px; border-radius: var(--radius-sm); border-left: 3px solid #f97316; display: flex; align-items: center; justify-content: space-between;">
        <span>💡 <b>Quy tắc áp dụng:</b> Khi chiến dịch ở trạng thái <b>Đang chạy</b>, các giao dịch có <i>Ngày BC</i> nằm trong khoảng <i>Từ ngày</i> đến <i>Đến ngày</i> sẽ tự động áp dụng Điểm Chiến Dịch và ghi vào <b>Cột X (Điểm tạm)</b> trong sheet Data.</span>
        <span id="campaignDirtyText" style="font-weight: 800; color: #c2410c; display: none;">⚠️ Có thay đổi chưa lưu</span>
      </div>
    </div>"""

new_camp_panel = """    <!-- Campaign Control Panel (Hiển thị khi chọn tab Điểm Chiến Dịch) -->
    <div class="campaign-control-card" id="campaignControlPanel" style="display: none;">
      <div class="campaign-control-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px; line-height: 1;">🔥</span>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 16px; font-weight: 800; color: #9a3412;">Cấu Hình Điểm Chiến Dịch</div>
            <span id="campaignDirtyText" style="font-size: 12px; font-weight: 800; color: #c2410c; background: #ffedd5; padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid #fdba74; display: none;">⚠️ Có thay đổi chưa lưu</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-secondary" onclick="openAddCampaignRowModal()" style="border-color: #fdba74; color: #9a3412; background: #ffffff;" title="Tạo mới một dòng cấu hình cho chiến dịch">
            <span>➕</span> Tạo Dòng Mới
          </button>
          <button type="button" class="btn btn-secondary" onclick="openPickFromTongHopModal()" style="border-color: #fdba74; color: #9a3412; background: #ffffff;" title="Chọn từng dòng từ Bảng Tổng Hợp để thêm vào Chiến Dịch">
            <span>📥</span> Chọn Dòng Từ Tổng Hợp
          </button>
          <button type="button" class="btn btn-primary" onclick="saveCampaignChanges()" style="background-color: #ea580c; border-color: #c2410c;">
            <span>💾</span> Lưu Bảng Chiến Dịch
          </button>
        </div>
      </div>

      <div class="campaign-form-row">
        <div class="campaign-field-group" style="flex: 2; min-width: 260px;">
          <label class="campaign-field-label" for="campaignName">Tên Chiến Dịch (*)</label>
          <input type="text" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignName" placeholder="VD: Chiến dịch Bùng Nổ Mùa Hè 2026" oninput="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 150px;">
          <label class="campaign-field-label" for="campaignStartDate">Từ Ngày (*)</label>
          <input type="date" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignStartDate" onchange="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 150px;">
          <label class="campaign-field-label" for="campaignEndDate">Đến Ngày (*)</label>
          <input type="date" class="filter-input" style="width: 100%; border-color: #fed7aa;" id="campaignEndDate" onchange="markCampaignDirty()">
        </div>

        <div class="campaign-field-group" style="flex: 1; min-width: 160px;">
          <label class="campaign-field-label" for="campaignStatus">Trạng Thái Chiến Dịch</label>
          <select class="filter-select" style="width: 100%; border-color: #fed7aa; font-weight: 700;" id="campaignStatus" onchange="markCampaignDirty()">
            <option value="Đang chạy">🟢 Đang chạy (Active)</option>
            <option value="Tạm dừng">⏸️ Tạm dừng (Paused)</option>
            <option value="Kết thúc">⚪ Kết thúc (Ended)</option>
          </select>
        </div>
      </div>
    </div>"""

assert old_camp_panel in html, "old_camp_panel not found"
html = html.replace(old_camp_panel, new_camp_panel, 1)

# 3. Add modal #pickTHRowModal in HTML
modal_target = """  <!-- Modal Thêm Dòng Mới -->"""

new_pick_modal = """  <!-- Modal Chọn Dòng Từ Bảng Tổng Hợp Để Thêm Vào Chiến Dịch -->
  <div class="modal-backdrop" id="pickTHRowModal">
    <div class="modal-content" style="max-width: 980px; width: 95%;">
      <div class="modal-header">
        <h3 class="modal-title">📥 Chọn Dòng Từ Bảng Tổng Hợp Để Thêm Vào Chiến Dịch</h3>
        <button type="button" class="modal-close" onclick="closePickTHRowModal()">×</button>
      </div>
      <div class="modal-body" style="gap: 12px;">
        <input type="text" class="filter-input" id="searchPickTH" placeholder="🔍 Tìm theo mã DA, tên DA, CĐT, loại căn, khoảng giá..." oninput="renderPickTHList()" style="width: 100%;">
        <div class="table-scroll-wrapper" style="max-height: 420px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
          <table>
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">STT</th>
                <th style="width: 90px;">Mã DA</th>
                <th style="min-width: 160px;">Tên Dự Án</th>
                <th style="width: 100px;">CĐT</th>
                <th style="width: 90px; text-align: center;">Sản Phẩm</th>
                <th style="min-width: 130px;">Loại Căn</th>
                <th style="min-width: 100px; text-align: center;">Khoảng Giá</th>
                <th style="width: 85px; text-align: center;">Điểm Gốc</th>
                <th style="width: 120px; text-align: center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="pickTHTableBody"></tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closePickTHRowModal()">Đóng</button>
      </div>
    </div>
  </div>

  <!-- Modal Thêm Dòng Mới -->"""

assert modal_target in html, "modal_target not found"
html = html.replace(modal_target, new_pick_modal, 1)

# 4. In renderTableTH, add copy-to-campaign button for each row in Thao Tác column:
old_th_actions = """          <td class="freeze-col-actions" style="text-align:center; white-space:nowrap; padding:4px 6px;">
            <button type="button" class="btn-action btn-action-edit" onclick="openEditRowModal('th', ${r.rowIdx})" title="Chỉnh sửa dòng này">✏️</button>
            <button type="button" class="btn-action btn-action-del" onclick="deleteRow('th', ${r.rowIdx}, '${escapeHtml(r.code)} - ${escapeHtml(r.name)}')" title="Xóa dòng này">🗑️</button>
          </td>"""

new_th_actions = """          <td class="freeze-col-actions" style="text-align:center; white-space:nowrap; padding:4px 6px;">
            <button type="button" class="btn-action btn-action-edit" onclick="openEditRowModal('th', ${r.rowIdx})" title="Chỉnh sửa dòng này">✏️</button>
            <button type="button" class="btn-action" style="color:#ea580c; border-color:#fdba74; background:#fff7ed;" onclick="pickThRowToCampaign(${r.rowIdx})" title="Sao chép dòng này sang Điểm Chiến Dịch">🔥</button>
            <button type="button" class="btn-action btn-action-del" onclick="deleteRow('th', ${r.rowIdx}, '${escapeHtml(r.code)} - ${escapeHtml(r.name)}')" title="Xóa dòng này">🗑️</button>
          </td>"""

assert old_th_actions in html, "old_th_actions not found"
html = html.replace(old_th_actions, new_th_actions, 1)

# 5. In renderTableCampaign, update empty state message
old_empty_msg = """        const msg = (rows.length === 0)
          ? 'Chưa có cấu hình điểm chiến dịch. Bấm nút <b>"📋 Sao Chép Từ Tổng Hợp"</b> phía trên để tạo nhanh danh sách điều kiện!'
          : 'Không tìm thấy dòng chiến dịch phù hợp với bộ lọc.';"""

new_empty_msg = """        const msg = (rows.length === 0)
          ? 'Chưa có cấu hình điểm chiến dịch. Bấm <b>"➕ Tạo Dòng Mới"</b> hoặc <b>"📥 Chọn Dòng Từ Tổng Hợp"</b> để thêm dự án vào chiến dịch!'
          : 'Không tìm thấy dòng chiến dịch phù hợp với bộ lọc.';"""

assert old_empty_msg in html, "old_empty_msg not found"
html = html.replace(old_empty_msg, new_empty_msg, 1)

# 6. Fix renderFundSpecificFields: remove the errant submitAddRow code inside it
errant_render_block = """      if (fundType === 'campaign') {
        const codeInput = document.getElementById('addCode');
        const code = codeInput ? codeInput.value.trim() : '';
        if (!code) { showToast('Vui lòng nhập Mã Dự Án!', true); return; }

        const name = (document.getElementById('addName') && document.getElementById('addName').value.trim()) || code;
        const cdt = (document.getElementById('addCdt') && document.getElementById('addCdt').value.trim()) || '';
        const region = document.getElementById('addRegion') ? document.getElementById('addRegion').value : 'Miền Bắc';
        const vals = getThreeFieldValues('add');
        const score = parseFloat(document.getElementById('addScore').value) || 0;

        if (!configData.campaign) configData.campaign = { rows: [] };
        if (!configData.campaign.rows) configData.campaign.rows = [];

        const newRow = {
          rowIdx: configData.campaign.rows.length,
          stt: configData.campaign.rows.length + 1,
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          status: 'Đang bán',
          sanPham: vals.sanPham,
          loaiCan: vals.loaiCan,
          khoangGia: vals.khoangGia,
          score: score,
          note: ''
        };

        configData.campaign.rows.push(newRow);
        closeAddRowModal();
        markCampaignDirty();
        renderStats();
        renderTable();
        showToast(`Đã thêm dự án "${code}" vào bảng Điểm Chiến Dịch!`);
        return;
      }"""

if errant_render_block in html:
    html = html.replace(errant_render_block, "", 1)

# Check renderFundSpecificFields handling for campaign
render_fund_target = """      if (fundType === 'th') {
        if (title) title.innerText = '➕ Thêm Dự Án / Điều Kiện (Quỹ NW)';"""

new_render_fund = """      if (fundType === 'th' || fundType === 'campaign') {
        if (title) title.innerText = (fundType === 'campaign') ? '➕ Thêm Dự Án Vào Điểm Chiến Dịch' : '➕ Thêm Dự Án / Điều Kiện (Quỹ NW)';"""

assert render_fund_target in html, "render_fund_target not found"
html = html.replace(render_fund_target, new_render_fund, 1)

# 7. Add pick from TH functions and openAddCampaignRowModal
helper_target = """    function cloneFromTongHopToCampaign() {"""

new_campaign_actions = """    function openAddCampaignRowModal() {
      openAddRowModal();
      const fundSelect = document.getElementById('addFundType');
      if (fundSelect) {
        fundSelect.value = 'campaign';
        onFundTypeChange();
      }
    }

    function openPickFromTongHopModal() {
      const modal = document.getElementById('pickTHRowModal');
      if (!modal) return;
      const searchInput = document.getElementById('searchPickTH');
      if (searchInput) searchInput.value = '';
      renderPickTHList();
      modal.style.display = 'flex';
    }

    function closePickTHRowModal() {
      const modal = document.getElementById('pickTHRowModal');
      if (modal) modal.style.display = 'none';
    }

    function renderPickTHList() {
      const tbody = document.getElementById('pickTHTableBody');
      if (!tbody) return;
      const q = (document.getElementById('searchPickTH')?.value || '').trim().toLowerCase();
      const rows = configData.thRows || [];
      const latestMonthKey = (configData.thMonths && configData.thMonths.length > 0) ? configData.thMonths[0].dateStr : null;

      const filtered = rows.filter(r => {
        if (!q) return true;
        const s = `${r.code} ${r.name} ${r.cdt} ${r.sanPham} ${r.loaiCan} ${r.khoangGia}`.toLowerCase();
        return s.includes(q);
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-tertiary);">Không tìm thấy dòng dự án phù hợp</td></tr>';
        return;
      }

      let html = '';
      filtered.forEach((r, idx) => {
        let baselineScore = 0;
        if (latestMonthKey && r.scores && r.scores[latestMonthKey] !== undefined) {
          baselineScore = r.scores[latestMonthKey];
        } else if (r.scores) {
          const keys = Object.keys(r.scores);
          baselineScore = keys.length > 0 ? r.scores[keys[0]] : 0;
        }

        html += `<tr>
          <td style="text-align:center; font-size:11px; color:var(--text-tertiary);">${idx + 1}</td>
          <td style="font-weight:700; font-family:var(--font-mono); color:var(--brand);">${escapeHtml(r.code)}</td>
          <td style="font-weight:600;">${escapeHtml(r.name)}</td>
          <td style="color:var(--text-secondary); font-size:12px;">${escapeHtml(r.cdt)}</td>
          <td style="text-align:center;"><span class="badge" style="background:#ecfdf5; color:#065f46; font-size:11px;">${escapeHtml(r.sanPham || 'Tất cả')}</span></td>
          <td style="font-size:12px;" title="${escapeHtml(r.loaiCan || '')}">${escapeHtml(r.loaiCan || 'Tất cả')}</td>
          <td style="text-align:center; font-size:12px;">${escapeHtml(r.khoangGia || 'Tất cả')}</td>
          <td style="text-align:center; font-weight:700; font-family:var(--font-mono);">${formatScoreDisplay(baselineScore)}</td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-secondary" style="height:28px; padding:0 8px; font-size:12px; border-color:#fdba74; color:#ea580c; background:#fff7ed;" onclick="pickThRowToCampaign(${r.rowIdx})">
              ➕ Chọn & Sửa
            </button>
          </td>
        </tr>`;
      });

      tbody.innerHTML = html;
    }

    function pickThRowToCampaign(thRowIdx) {
      const r = configData.thRows.find(item => item.rowIdx === thRowIdx);
      if (!r) {
        showToast('Không tìm thấy dòng cấu hình trong Bảng Tổng Hợp!', true);
        return;
      }

      closePickTHRowModal();

      const latestMonthKey = (configData.thMonths && configData.thMonths.length > 0) ? configData.thMonths[0].dateStr : null;
      let baselineScore = 0;
      if (latestMonthKey && r.scores && r.scores[latestMonthKey] !== undefined) {
        baselineScore = r.scores[latestMonthKey];
      } else if (r.scores) {
        const keys = Object.keys(r.scores);
        baselineScore = keys.length > 0 ? r.scores[keys[0]] : 0;
      }

      openEditRowModal('campaign-copy', thRowIdx, {
        code: r.code,
        name: r.name,
        cdt: r.cdt,
        region: r.region,
        status: r.status || 'Đang bán',
        sanPham: r.sanPham || 'Tất cả',
        loaiCan: r.loaiCan || 'Tất cả',
        khoangGia: r.khoangGia || 'Tất cả',
        score: baselineScore
      });
    }

    function cloneFromTongHopToCampaign() {"""

assert helper_target in html, "helper_target not found"
html = html.replace(helper_target, new_campaign_actions, 1)

# 8. Update openEditRowModal to support 'campaign-copy'
edit_modal_check = """      if (tab === 'campaign') {"""

new_edit_modal_check = """      if (tab === 'campaign' || tab === 'campaign-copy') {
        const isCopy = (tab === 'campaign-copy');
        let row = null;
        if (isCopy) {
          row = arguments[2] || {};
        } else {
          row = configData.campaign?.rows?.find(r => r.rowIdx === rowIdx);
        }
        if (!row) { showToast('Không tìm thấy dòng cấu hình!', true); return; }

        const spVal = (row.sanPham && row.sanPham !== '*' && row.sanPham !== 'Tất cả') ? row.sanPham : 'Tất cả';
        const lcVal = (row.loaiCan && row.loaiCan !== '*' && row.loaiCan !== 'Tất cả') ? row.loaiCan : 'Tất cả';
        const giaVal = (row.khoangGia && row.khoangGia !== '*' && row.khoangGia !== 'Tất cả') ? row.khoangGia : 'Tất cả';
        const parsedPrice = parseKhoangGiaToMinMax(row.khoangGia);

        title.innerText = isCopy ? `🔥 Sao Chép Vào Chiến Dịch: ${row.code} (${row.name})` : `✏️ Sửa Dự Án Chiến Dịch: ${row.code} (${row.name})`;
        body.innerHTML = `
          <input type="hidden" id="editRowIdx" value="${rowIdx}">
          <input type="hidden" id="editTab" value="${tab}">
          
          <div class="form-row-2">
            <div class="form-group">
              <label class="field-label" for="editCode">Mã Dự Án (*)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCode" value="${escapeHtml(row.code || '')}" autocomplete="off" oninput="showProjectCodeSuggest('edit')" onfocus="showProjectCodeSuggest('edit')" required>
                <div class="autocomplete-dropdown" id="editCode_dropdown"></div>
              </div>
            </div>
            <div class="form-group">
              <label class="field-label" for="editName">Tên Dự Án</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editName" value="${escapeHtml(row.name || '')}" autocomplete="off" oninput="showProjectNameSuggest('edit')" onfocus="showProjectNameSuggest('edit')">
                <div class="autocomplete-dropdown" id="editName_dropdown"></div>
              </div>
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label class="field-label" for="editCdt">Chủ Đầu Tư (CĐT)</label>
              <div class="autocomplete-container">
                <input type="text" class="filter-input" id="editCdt" value="${escapeHtml(row.cdt || '')}" autocomplete="off" oninput="showCdtSuggest('edit')" onfocus="showCdtSuggest('edit')">
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
          </div>

          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                🎯 Cập Nhật 3 Tiêu Chí Khớp (Sản Phẩm - Loại Căn - Khoảng Giá)
              </span>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="field-label" for="editSelSanPham">1. Sản Phẩm</label>
                <select class="filter-select" style="width:100%; height:36px;" id="editSelSanPham">
                  <option value="Tất cả" ${spVal === 'Tất cả' || spVal === '*' || !spVal ? 'selected' : ''}>Tất cả (Cao & Thấp tầng)</option>
                  <option value="Cao tầng" ${spVal === 'Cao tầng' ? 'selected' : ''}>Cao tầng</option>
                  <option value="Thấp tầng" ${spVal === 'Thấp tầng' ? 'selected' : ''}>Thấp tầng</option>
                </select>
              </div>

              <div class="form-group" style="position: relative;">
                <label class="field-label">2. Loại Căn</label>
                <div class="multi-select-container" id="editLoaiCanContainer">
                  <div class="multi-select-trigger" id="editLoaiCanTrigger" onclick="toggleMultiSelect('edit')">
                    <span class="multi-select-label" id="editLoaiCanLabel">${escapeHtml(lcVal)}</span>
                    <span class="multi-select-arrow">▼</span>
                  </div>
                  <div class="multi-select-dropdown" id="editLoaiCanDropdown">
                    <div class="multi-select-search-box">
                      <input type="text" class="multi-select-search" id="editLoaiCanSearch" placeholder="🔍 Tìm loại căn..." oninput="filterMultiSelectOptions('edit')">
                    </div>
                    <div class="multi-select-actions">
                      <span class="multi-select-btn-link" onclick="selectAllUnits('edit')">Chọn tất cả</span>
                      <span class="multi-select-btn-link" onclick="clearAllUnits('edit')">Bỏ chọn</span>
                    </div>
                    <div class="multi-select-options" id="editLoaiCanOptions"></div>
                  </div>
                </div>
                <input type="hidden" id="editLoaiCanInput" value="${escapeHtml(lcVal)}">
              </div>
            </div>

            <div class="form-group" style="background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="field-label" style="margin-bottom:0;">3. Khoảng Giá (Tỷ VNĐ)</label>
                <span id="editKhoangGiaPreview" style="font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--brand); background: var(--brand-subtle); padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid var(--brand-border);">
                  ${escapeHtml(formatPriceRangeOutput(parsedPrice.min, parsedPrice.max, parsedPrice.isDat))}
                </span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 12px; color: var(--text-tertiary);">Từ</span>
                  <input type="number" class="filter-input" id="editGiaTu" value="${parsedPrice.min}" min="0" max="999" step="0.5" style="width: 75px; text-align: center; height: 32px;" oninput="onPriceInputChange('edit')">
                  <span style="font-size: 12px; color: var(--text-tertiary);">tỷ</span>
                </div>
                
                <span style="color: var(--text-tertiary); font-weight: 700;">-</span>

                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-size: 12px; color: var(--text-tertiary);">Đến</span>
                  <input type="number" class="filter-input" id="editGiaDen" value="${parsedPrice.max}" min="0" max="999" step="0.5" style="width: 75px; text-align: center; height: 32px;" oninput="onPriceInputChange('edit')">
                  <span style="font-size: 12px; color: var(--text-tertiary);">tỷ</span>
                </div>

                <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px; padding-left: 8px; border-left: 1px solid var(--border-subtle);">
                  <input type="checkbox" id="editIsDat" ${parsedPrice.isDat ? 'checked' : ''} onchange="onPriceInputChange('edit')">
                  <label for="editIsDat" style="font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-secondary);">Giá đất</label>
                </div>
              </div>
              <input type="hidden" id="editKhoangGiaInput" value="${escapeHtml(giaVal)}">
            </div>

            <div class="form-group" style="margin-top: 4px;">
              <label class="field-label" for="editScoreCampaign" style="color: #9a3412; font-weight: 800;">🔥 Điểm Chiến Dịch (*)</label>
              <input type="number" step="0.01" min="0" class="filter-input cell-score-campaign" style="width: 140px; font-weight: 800;" id="editScoreCampaign" value="${row.score !== undefined ? row.score : 0}">
            </div>
          </div>
        `;

        buildMultiSelectOptions('edit', ALL_UNIT_TYPES.filter(u => {
          const escapedU = u.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
          const re = new RegExp('(^|[,;\\\\s(])' + escapedU + '($|[,;\\\\s)])', 'i');
          return re.test(lcVal);
        }));

        modal.style.display = 'flex';
        return;
      }"""

# Find and replace openEditRowModal campaign check
assert edit_modal_check in html, "edit_modal_check not found"
html = html.replace(edit_modal_check, new_edit_modal_check, 1)

# 9. In submitEditRow, handle tab === 'campaign-copy'
submit_edit_check = """      if (tab === 'campaign') {"""

new_submit_edit_check = """      if (tab === 'campaign-copy') {
        const code = document.getElementById('editCode').value.trim();
        const name = document.getElementById('editName').value.trim() || code;
        const cdt = document.getElementById('editCdt').value.trim();
        const region = document.getElementById('editRegion').value;
        const status = document.getElementById('editStatus').value;
        const vals = getThreeFieldValues('edit');
        const scoreEl = document.getElementById('editScoreCampaign');
        const score = scoreEl ? (parseFloat(scoreEl.value) || 0) : 0;

        if (!configData.campaign) configData.campaign = { rows: [] };
        if (!configData.campaign.rows) configData.campaign.rows = [];

        const newRow = {
          rowIdx: configData.campaign.rows.length,
          stt: configData.campaign.rows.length + 1,
          cdt: cdt,
          code: code,
          name: name,
          region: region,
          status: status,
          sanPham: vals.sanPham,
          loaiCan: vals.loaiCan,
          khoangGia: vals.khoangGia,
          score: score,
          note: ''
        };

        configData.campaign.rows.push(newRow);
        closeEditRowModal();
        markCampaignDirty();
        renderStats();
        if (activeTab === 'campaign') {
          renderTable();
        } else {
          switchTab('campaign');
        }
        showToast(`Đã thêm dự án "${code}" vào Điểm Chiến Dịch!`);
        return;
      }

      if (tab === 'campaign') {"""

assert submit_edit_check in html, "submit_edit_check not found"
html = html.replace(submit_edit_check, new_submit_edit_check, 1)

with open('src/ConfigUI.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('ConfigUI.html successfully updated!')
