import sys

with open('src/ConfigUI.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update .kpi-deck css to 5 columns and add campaign css
old_kpi_css = """    .kpi-deck {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }"""

new_kpi_css = """    .kpi-deck {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }

    @media (max-width: 1200px) {
      .kpi-deck {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 768px) {
      .kpi-deck {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* Campaign Control Card & Styling */
    .campaign-control-card {
      background: linear-gradient(135deg, #fffaf5 0%, #ffffff 100%);
      border: 1.5px solid #fdba74;
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      box-shadow: 0 2px 6px rgba(234, 88, 12, 0.08);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .campaign-control-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .campaign-form-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .campaign-field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .campaign-field-label {
      font-size: var(--text-xs);
      font-weight: 700;
      color: #9a3412;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .cell-score-campaign {
      border-color: #fb923c !important;
      background: #fff7ed !important;
      color: #c2410c !important;
      font-weight: 800 !important;
    }
    .cell-score-campaign:focus {
      border-color: #ea580c !important;
      box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2) !important;
    }"""

assert old_kpi_css in html, "old_kpi_css not found"
html = html.replace(old_kpi_css, new_kpi_css, 1)

# 2. Update KPI deck HTML with 5th card
old_kpi_deck = """      <div class="kpi-card">
        <span class="kpi-label">Thay Đổi Chưa Lưu</span>
        <span class="kpi-value kpi-highlight-warning" id="statUnsavedCount">0 ô</span>
      </div>
    </section>"""

new_kpi_deck = """      <div class="kpi-card">
        <span class="kpi-label">Thay Đổi Chưa Lưu</span>
        <span class="kpi-value kpi-highlight-warning" id="statUnsavedCount">0 ô</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Chiến Dịch Hiện Tại</span>
        <span class="kpi-value" id="statCampaignCount" style="font-size: 14px; line-height: 1.3;">Chưa có</span>
      </div>
    </section>"""

assert old_kpi_deck in html, "old_kpi_deck not found"
html = html.replace(old_kpi_deck, new_kpi_deck, 1)

# 3. Update Tab bar and insert Campaign Control Panel
old_tab_bar = """      <button type="button" class="tab-btn" id="tabBtnF2" onclick="switchTab('f2')">
        <span>🔄</span> Dự Án F2 (Quỹ Chéo)
        <span class="tab-badge" id="badgeF2Count">29</span>
      </button>
    </nav>"""

new_tab_bar = """      <button type="button" class="tab-btn" id="tabBtnF2" onclick="switchTab('f2')">
        <span>🔄</span> Dự Án F2 (Quỹ Chéo)
        <span class="tab-badge" id="badgeF2Count">29</span>
      </button>
      <button type="button" class="tab-btn" id="tabBtnCampaign" onclick="switchTab('campaign')">
        <span>🔥</span> Điểm Chiến Dịch
        <span class="tab-badge" id="badgeCampaignCount">0</span>
      </button>
    </nav>

    <!-- Campaign Control Panel (Hiển thị khi chọn tab Điểm Chiến Dịch) -->
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

assert old_tab_bar in html, "old_tab_bar not found"
html = html.replace(old_tab_bar, new_tab_bar, 1)

# 4. Global state variable additions
old_state = """    // Global State
    let configData = {
      thMonths: [],
      thRows: [],
      f2Months: [],
      f2Rows: [],
      latestMonth: ''
    };

    let activeTab = 'th'; // 'th' hoặc 'f2'
    let modifiedCellsTH = new Map(); // key: `${rowIdx}_${colIdx}` -> { rowIdx, colIdx, score }
    let modifiedCellsF2 = new Map();
    let newRowsTH = [];
    let newRowsF2 = [];"""

new_state = """    // Global State
    let configData = {
      thMonths: [],
      thRows: [],
      f2Months: [],
      f2Rows: [],
      latestMonth: '',
      campaign: { name: '', startDate: '', endDate: '', status: 'Tạm dừng', rows: [] }
    };

    let activeTab = 'th'; // 'th', 'f2' hoặc 'campaign'
    let modifiedCellsTH = new Map(); // key: `${rowIdx}_${colIdx}` -> { rowIdx, colIdx, score }
    let modifiedCellsF2 = new Map();
    let newRowsTH = [];
    let newRowsF2 = [];
    let isCampaignDirty = false;"""

assert old_state in html, "old_state not found"
html = html.replace(old_state, new_state, 1)

# 5. Update fetchData
old_fetch = """          if (res && res.success) {
            configData = res;
            modifiedCellsTH.clear();
            modifiedCellsF2.clear();
            newRowsTH = [];
            newRowsF2 = [];
            updateUnsavedBadge();
            populateFilters();
            renderStats();
            renderTable();
          }"""

new_fetch = """          if (res && res.success) {
            configData = res;
            if (!configData.campaign) {
              configData.campaign = { name: '', startDate: '', endDate: '', status: 'Tạm dừng', rows: [] };
            }
            modifiedCellsTH.clear();
            modifiedCellsF2.clear();
            newRowsTH = [];
            newRowsF2 = [];
            isCampaignDirty = false;
            if (activeTab === 'campaign') {
              populateCampaignForm();
            }
            updateUnsavedBadge();
            populateFilters();
            renderStats();
            renderTable();
          }"""

assert old_fetch in html, "old_fetch not found"
html = html.replace(old_fetch, new_fetch, 1)

# 6. Update renderStats and updateUnsavedBadge
old_stats = """    function renderStats() {
      document.getElementById('statTHCount').innerText = `${configData.thRows.length} dòng`;
      document.getElementById('statF2Count').innerText = `${configData.f2Rows.length} dự án`;
      document.getElementById('statLatestMonth').innerText = configData.latestMonth || '--/----';
      document.getElementById('badgeTHCount').innerText = configData.thRows.length;
      document.getElementById('badgeF2Count').innerText = configData.f2Rows.length;
    }

    function updateUnsavedBadge() {
      const total = modifiedCellsTH.size + modifiedCellsF2.size + newRowsTH.length + newRowsF2.length;
      document.getElementById('statUnsavedCount').innerText = `${total} ô/dòng`;
      const badge = document.getElementById('saveBadge');
      if (total > 0) {
        badge.innerText = total;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }"""

new_stats = """    function renderStats() {
      document.getElementById('statTHCount').innerText = `${configData.thRows.length} dòng`;
      document.getElementById('statF2Count').innerText = `${configData.f2Rows.length} dự án`;
      document.getElementById('statLatestMonth').innerText = configData.latestMonth || '--/----';
      document.getElementById('badgeTHCount').innerText = configData.thRows.length;
      document.getElementById('badgeF2Count').innerText = configData.f2Rows.length;

      const camp = configData.campaign;
      const campStatus = (camp && camp.status) ? camp.status : 'Chưa có';
      const campRowsCount = (camp && camp.rows) ? camp.rows.length : 0;
      const statCampEl = document.getElementById('statCampaignCount');
      if (statCampEl) {
        if (campStatus === 'Đang chạy') {
          statCampEl.innerHTML = `<span style="color:var(--success);font-weight:800;">🟢 Đang chạy</span> <span style="font-size:12px;color:var(--text-tertiary);">(${campRowsCount} dòng)</span>`;
        } else if (campStatus === 'Tạm dừng') {
          statCampEl.innerHTML = `<span style="color:var(--warning);font-weight:800;">⏸️ Tạm dừng</span> <span style="font-size:12px;color:var(--text-tertiary);">(${campRowsCount} dòng)</span>`;
        } else {
          statCampEl.innerHTML = `<span style="color:var(--text-tertiary);font-weight:700;">⚪ ${escapeHtml(campStatus)}</span> <span style="font-size:12px;color:var(--text-tertiary);">(${campRowsCount} dòng)</span>`;
        }
      }

      const badgeCamp = document.getElementById('badgeCampaignCount');
      if (badgeCamp) {
        badgeCamp.innerText = campRowsCount;
      }
    }

    function updateUnsavedBadge() {
      const campDirtyCount = isCampaignDirty ? 1 : 0;
      const total = modifiedCellsTH.size + modifiedCellsF2.size + newRowsTH.length + newRowsF2.length + campDirtyCount;
      document.getElementById('statUnsavedCount').innerText = `${total} ô/dòng`;
      const badge = document.getElementById('saveBadge');
      if (total > 0) {
        badge.innerText = total;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }"""

assert old_stats in html, "old_stats not found"
html = html.replace(old_stats, new_stats, 1)

# 7. Update switchTab, populateFilters, applyFilters, renderTable
old_switch = """    function switchTab(tab) {
      activeTab = tab;
      document.getElementById('tabBtnTH').className = 'tab-btn' + (tab === 'th' ? ' active' : '');
      document.getElementById('tabBtnF2').className = 'tab-btn' + (tab === 'f2' ? ' active' : '');

      // Toggle các filter không áp dụng cho F2
      const isTH = (tab === 'th');
      document.getElementById('cdtFilter').style.display = isTH ? 'inline-block' : 'none';
      document.getElementById('regionFilter').style.display = isTH ? 'inline-block' : 'none';
      document.getElementById('statusFilter').style.display = isTH ? 'inline-block' : 'none';

      populateFilters();
      renderTable();
    }

    function populateFilters() {
      // Month dropdown
      const monthSelect = document.getElementById('monthFilter');
      const curMonthVal = monthSelect.value;
      const months = (activeTab === 'th') ? configData.thMonths : configData.f2Months;

      monthSelect.innerHTML = '<option value="ALL">🗓️ Xem tất cả các tháng (Ma trận)</option>';
      months.forEach(m => {
        monthSelect.innerHTML += `<option value="${m.dateStr}">Tháng ${m.display}</option>`;
      });
      if (curMonthVal && months.some(m => m.dateStr === curMonthVal)) {
        monthSelect.value = curMonthVal;
      }

      // CĐT dropdown for TH
      if (activeTab === 'th') {
        const cdtSelect = document.getElementById('cdtFilter');
        const curCdt = cdtSelect.value;
        const cdts = Array.from(new Set(configData.thRows.map(r => r.cdt).filter(Boolean))).sort();
        cdtSelect.innerHTML = '<option value="ALL">🏢 Tất cả CĐT</option>';
        cdts.forEach(c => {
          cdtSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        if (curCdt) cdtSelect.value = curCdt;
      }
    }

    function applyFilters() {
      renderTable();
    }

    function renderTable() {
      const thead = document.getElementById('tableHead');
      const tbody = document.getElementById('tableBody');

      const searchQ = document.getElementById('searchInput').value.trim().toLowerCase();
      const selMonth = document.getElementById('monthFilter').value;
      const selCdt = document.getElementById('cdtFilter').value;
      const selRegion = document.getElementById('regionFilter').value;
      const selStatus = document.getElementById('statusFilter').value;

      if (activeTab === 'th') {
        renderTableTH(thead, tbody, searchQ, selMonth, selCdt, selRegion, selStatus);
      } else {
        renderTableF2(thead, tbody, searchQ, selMonth);
      }
    }"""

new_switch = """    function switchTab(tab) {
      activeTab = tab;
      document.getElementById('tabBtnTH').className = 'tab-btn' + (tab === 'th' ? ' active' : '');
      document.getElementById('tabBtnF2').className = 'tab-btn' + (tab === 'f2' ? ' active' : '');
      const tabBtnCamp = document.getElementById('tabBtnCampaign');
      if (tabBtnCamp) tabBtnCamp.className = 'tab-btn' + (tab === 'campaign' ? ' active' : '');

      const isTH = (tab === 'th');
      const isCampaign = (tab === 'campaign');
      const showFilters = isTH || isCampaign;

      document.getElementById('cdtFilter').style.display = showFilters ? 'inline-block' : 'none';
      document.getElementById('regionFilter').style.display = showFilters ? 'inline-block' : 'none';
      document.getElementById('statusFilter').style.display = showFilters ? 'inline-block' : 'none';
      document.getElementById('monthFilter').style.display = isCampaign ? 'none' : 'inline-block';

      const campPanel = document.getElementById('campaignControlPanel');
      if (campPanel) campPanel.style.display = isCampaign ? 'flex' : 'none';

      if (isCampaign) {
        populateCampaignForm();
      }

      populateFilters();
      renderTable();
    }

    function populateCampaignForm() {
      const camp = configData.campaign || { name: '', startDate: '', endDate: '', status: 'Tạm dừng', rows: [] };
      const nameEl = document.getElementById('campaignName');
      const startEl = document.getElementById('campaignStartDate');
      const endEl = document.getElementById('campaignEndDate');
      const statusEl = document.getElementById('campaignStatus');

      if (nameEl) nameEl.value = camp.name || '';
      if (startEl) startEl.value = camp.startDate || '';
      if (endEl) endEl.value = camp.endDate || '';
      if (statusEl) statusEl.value = camp.status || 'Tạm dừng';
    }

    function markCampaignDirty() {
      isCampaignDirty = true;
      const txt = document.getElementById('campaignDirtyText');
      if (txt) txt.style.display = 'inline';
      updateUnsavedBadge();
    }

    function populateFilters() {
      // Month dropdown
      const monthSelect = document.getElementById('monthFilter');
      const curMonthVal = monthSelect.value;
      const months = (activeTab === 'th') ? configData.thMonths : (configData.f2Months || []);

      if (activeTab !== 'campaign') {
        monthSelect.innerHTML = '<option value="ALL">🗓️ Xem tất cả các tháng (Ma trận)</option>';
        months.forEach(m => {
          monthSelect.innerHTML += `<option value="${m.dateStr}">Tháng ${m.display}</option>`;
        });
        if (curMonthVal && months.some(m => m.dateStr === curMonthVal)) {
          monthSelect.value = curMonthVal;
        }
      }

      // CĐT dropdown for TH and Campaign
      if (activeTab === 'th' || activeTab === 'campaign') {
        const cdtSelect = document.getElementById('cdtFilter');
        const curCdt = cdtSelect.value;
        const sourceRows = (activeTab === 'th') ? configData.thRows : (configData.campaign?.rows || []);
        const cdts = Array.from(new Set(sourceRows.map(r => r.cdt).filter(Boolean))).sort();
        cdtSelect.innerHTML = '<option value="ALL">🏢 Tất cả CĐT</option>';
        cdts.forEach(c => {
          cdtSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        if (curCdt) cdtSelect.value = curCdt;
      }
    }

    function applyFilters() {
      renderTable();
    }

    function renderTable() {
      const thead = document.getElementById('tableHead');
      const tbody = document.getElementById('tableBody');

      const searchQ = document.getElementById('searchInput').value.trim().toLowerCase();
      const selMonth = document.getElementById('monthFilter').value;
      const selCdt = document.getElementById('cdtFilter').value;
      const selRegion = document.getElementById('regionFilter').value;
      const selStatus = document.getElementById('statusFilter').value;

      if (activeTab === 'th') {
        renderTableTH(thead, tbody, searchQ, selMonth, selCdt, selRegion, selStatus);
      } else if (activeTab === 'f2') {
        renderTableF2(thead, tbody, searchQ, selMonth);
      } else if (activeTab === 'campaign') {
        renderTableCampaign(thead, tbody, searchQ, selCdt, selRegion, selStatus);
      }
    }"""

assert old_switch in html, "old_switch not found"
html = html.replace(old_switch, new_switch, 1)

# 8. Add renderTableCampaign and campaign helpers right after renderTableF2
target_after_f2 = """      tbody.innerHTML = bodyHtml;
    }"""

campaign_table_code = """      tbody.innerHTML = bodyHtml;
    }

    function renderTableCampaign(thead, tbody, searchQ, selCdt, selRegion, selStatus) {
      let headHtml = `<tr>
        <th style="width: 44px; text-align: center;">STT</th>
        <th style="width: 72px; text-align: center;">Thao Tác</th>
        <th style="width: 120px;">CĐT</th>
        <th style="width: 90px;">Mã DA</th>
        <th style="min-width: 170px;">Tên Dự Án</th>
        <th style="width: 95px;">Miền</th>
        <th style="width: 90px; text-align: center;">Trạng Thái</th>
        <th style="width: 100px; text-align: center;">Sản Phẩm</th>
        <th style="min-width: 130px; text-align: center;">Loại Căn</th>
        <th style="min-width: 110px; text-align: center;">Khoảng Giá</th>
        <th style="width: 120px; text-align: center; background: #ffedd5; color: #9a3412;">🔥 Điểm CD</th>
        <th style="min-width: 120px;">Ghi Chú</th>
      </tr>`;
      thead.innerHTML = headHtml;

      const rows = configData.campaign?.rows || [];
      const filtered = rows.filter(r => {
        if (searchQ) {
          const matchStr = `${r.code} ${r.name} ${r.cdt} ${r.sanPham} ${r.loaiCan} ${r.khoangGia}`.toLowerCase();
          if (!matchStr.includes(searchQ)) return false;
        }
        if (selCdt !== 'ALL' && r.cdt !== selCdt) return false;
        if (selRegion !== 'ALL' && r.region !== selRegion) return false;
        if (selStatus !== 'ALL' && r.status !== selStatus) return false;
        return true;
      });

      if (filtered.length === 0) {
        const msg = (rows.length === 0)
          ? 'Chưa có cấu hình điểm chiến dịch. Bấm nút <b>"📋 Sao Chép Từ Tổng Hợp"</b> phía trên để tạo nhanh danh sách điều kiện!'
          : 'Không tìm thấy dòng chiến dịch phù hợp với bộ lọc.';
        tbody.innerHTML = `<tr><td colspan="12" class="empty-state">${msg}</td></tr>`;
        return;
      }

      let bodyHtml = '';
      filtered.forEach((r, idx) => {
        const isSoldout = (r.status === 'Sold out');
        const statusBadge = isSoldout 
          ? `<span class="badge badge-soldout">Sold out</span>` 
          : `<span class="badge badge-dangban">Đang bán</span>`;

        const spBadge = (r.sanPham && r.sanPham !== '*' && r.sanPham !== 'Tất cả')
          ? `<span class="badge badge-sp">${escapeHtml(r.sanPham)}</span>`
          : `<span class="badge badge-all">Tất cả</span>`;

        const lcBadge = (r.loaiCan && r.loaiCan !== '*' && r.loaiCan !== 'Tất cả')
          ? `<span class="badge badge-lc" title="${escapeHtml(r.loaiCan)}">${escapeHtml(r.loaiCan)}</span>`
          : `<span class="badge badge-all">Tất cả</span>`;

        const giaBadge = (r.khoangGia && r.khoangGia !== '*' && r.khoangGia !== 'Tất cả')
          ? `<span class="badge badge-gia" title="${escapeHtml(r.khoangGia)}">${escapeHtml(r.khoangGia)}</span>`
          : `<span class="badge badge-all">Tất cả</span>`;

        const scoreVal = (r.score !== undefined && r.score !== null) ? r.score : 0;
        const noteVal = r.note || '';

        bodyHtml += `<tr>
          <td class="col-stt">${r.stt || (idx + 1)}</td>
          <td class="col-actions">
            <button type="button" class="btn-icon" title="Sửa dòng này" onclick="openEditRowModal('campaign', ${r.rowIdx})">✏️</button>
            <button type="button" class="btn-icon btn-icon-delete" title="Xóa dòng này" onclick="deleteRow('campaign', ${r.rowIdx}, '${escapeJs(r.code)}')">🗑️</button>
          </td>
          <td class="col-text" title="${escapeHtml(r.cdt)}">${escapeHtml(r.cdt)}</td>
          <td class="col-code">${escapeHtml(r.code)}</td>
          <td class="col-name" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>
          <td class="col-region">${escapeHtml(r.region)}</td>
          <td class="col-status" style="text-align: center;">${statusBadge}</td>
          <td class="col-center">${spBadge}</td>
          <td class="col-center">${lcBadge}</td>
          <td class="col-center">${giaBadge}</td>
          <td class="col-score" style="background: #fff7ed; text-align: center;">
            <input type="number" step="0.01" min="0" 
              class="cell-score-input cell-score-campaign" 
              value="${scoreVal}" 
              data-row="${r.rowIdx}"
              onchange="handleCampaignScoreChange(this, ${r.rowIdx})"
              onfocus="this.select()">
          </td>
          <td class="col-text">
            <input type="text" class="filter-input" style="height: 28px; width: 100%; font-size: 12px;"
              value="${escapeHtml(noteVal)}"
              data-row="${r.rowIdx}"
              onchange="handleCampaignNoteChange(this, ${r.rowIdx})"
              placeholder="Ghi chú...">
          </td>
        </tr>`;
      });

      tbody.innerHTML = bodyHtml;
    }

    function handleCampaignScoreChange(inputEl, rowIdx) {
      const val = parseFloat(inputEl.value);
      const cleanVal = isNaN(val) ? 0 : val;
      const row = configData.campaign?.rows?.find(r => r.rowIdx === rowIdx);
      if (row) {
        row.score = cleanVal;
        markCampaignDirty();
        inputEl.style.background = '#fef3c7';
      }
    }

    function handleCampaignNoteChange(inputEl, rowIdx) {
      const row = configData.campaign?.rows?.find(r => r.rowIdx === rowIdx);
      if (row) {
        row.note = inputEl.value.trim();
        markCampaignDirty();
      }
    }

    function cloneFromTongHopToCampaign() {
      if (!configData.thRows || configData.thRows.length === 0) {
        showToast('Không có dữ liệu trong Bảng Tổng Hợp để sao chép!', true);
        return;
      }

      showConfirmModal({
        icon: '📋',
        title: 'Sao Chép Cấu Hình Từ Tổng Hợp',
        message: `Hệ thống sẽ sao chép toàn bộ ${configData.thRows.length} dòng điều kiện (CĐT, Mã DA, Tên DA, Sản Phẩm, Loại Căn, Khoảng Giá) từ Bảng Tổng Hợp sang Bảng Chiến Dịch.\\n\\nĐiểm chiến dịch ban đầu sẽ được lấy từ tháng mới nhất (${configData.thMonths[0]?.display || 'tháng gần nhất'}).\\n\\nBạn có muốn tiếp tục?`
      }, function() {
        const latestMonthKey = (configData.thMonths && configData.thMonths.length > 0) ? configData.thMonths[0].dateStr : null;
        
        if (!configData.campaign) configData.campaign = {};
        configData.campaign.rows = configData.thRows.map((r, idx) => {
          let baselineScore = 0;
          if (latestMonthKey && r.scores && r.scores[latestMonthKey] !== undefined) {
            baselineScore = r.scores[latestMonthKey];
          } else if (r.scores) {
            const keys = Object.keys(r.scores);
            baselineScore = keys.length > 0 ? r.scores[keys[0]] : 0;
          }

          return {
            rowIdx: idx,
            stt: idx + 1,
            cdt: r.cdt || '',
            code: r.code || '',
            name: r.name || '',
            region: r.region || '',
            status: r.status || 'Đang bán',
            sanPham: r.sanPham || 'Tất cả',
            loaiCan: r.loaiCan || 'Tất cả',
            khoangGia: r.khoangGia || 'Tất cả',
            score: baselineScore,
            note: r.note || ''
          };
        });

        markCampaignDirty();
        renderStats();
        renderTable();
        showToast(`Đã sao chép thành công ${configData.campaign.rows.length} dòng từ Tổng Hợp! Hãy chỉnh sửa điểm và bấm "Lưu Bảng Chiến Dịch".`);
      });
    }

    function saveCampaignChanges() {
      const name = (document.getElementById('campaignName').value || '').trim();
      const startDate = document.getElementById('campaignStartDate').value;
      const endDate = document.getElementById('campaignEndDate').value;
      const status = document.getElementById('campaignStatus').value;

      if (!name) {
        showToast('Vui lòng nhập Tên Chiến Dịch!', true);
        document.getElementById('campaignName').focus();
        return;
      }

      if (status === 'Đang chạy') {
        if (!startDate || !endDate) {
          showToast('Chiến dịch Đang chạy bắt buộc phải có Từ Ngày và Đến Ngày!', true);
          return;
        }
        if (new Date(startDate) > new Date(endDate)) {
          showToast('Từ Ngày không được lớn hơn Đến Ngày!', true);
          return;
        }
      }

      const payload = {
        name: name,
        startDate: startDate,
        endDate: endDate,
        status: status,
        rows: configData.campaign?.rows || []
      };

      showLoading('Đang lưu bảng Điểm Chiến Dịch vào Google Sheets...');

      google.script.run
        .withSuccessHandler(function(res) {
          hideLoading();
          if (res && res.success) {
            isCampaignDirty = false;
            configData.campaign.name = name;
            configData.campaign.startDate = startDate;
            configData.campaign.endDate = endDate;
            configData.campaign.status = status;

            const txt = document.getElementById('campaignDirtyText');
            if (txt) txt.style.display = 'none';

            renderStats();
            updateUnsavedBadge();
            showToast(`Đã lưu thành công chiến dịch "${name}" với ${res.rowCount || configData.campaign.rows.length} dòng!`);
          } else {
            showToast('Lỗi khi lưu chiến dịch: ' + ((res && res.error) || 'Không rõ'), true);
          }
        })
        .withFailureHandler(function(err) {
          hideLoading();
          showToast('Lỗi kết nối khi lưu chiến dịch: ' + (err.message || err), true);
        })
        .saveCampaignData(payload);
    }"""

# Replace only the second occurrence of `tbody.innerHTML = bodyHtml;\n    }` (the one inside renderTableF2)
idx_first = html.find(target_after_f2)
assert idx_first != -1, "first target_after_f2 not found"
idx_second = html.find(target_after_f2, idx_first + len(target_after_f2))
assert idx_second != -1, "second target_after_f2 not found"

html = html[:idx_second] + campaign_table_code + html[idx_second + len(target_after_f2):]

# 9. Update saveAllChanges to handle campaign tab
old_save_all = """    function saveAllChanges() {
      const thUpdates = Array.from(modifiedCellsTH.values());"""

new_save_all = """    function saveAllChanges() {
      if (activeTab === 'campaign') {
        saveCampaignChanges();
        return;
      }
      const thUpdates = Array.from(modifiedCellsTH.values());"""

assert old_save_all in html, "old_save_all not found"
html = html.replace(old_save_all, new_save_all, 1)

# 10. Update openAddRowModal, renderFundSpecificFields, and submitAddRow
old_add_option = """            <option value="th" ${activeTab === 'th' ? 'selected' : ''}>🏢 Quỹ NW (Bảng Tổng Hợp - Tính Điểm Theo Dự Án & Điều Kiện)</option>
            <option value="f2" ${activeTab === 'f2' ? 'selected' : ''}>🔄 Quỹ Chéo (Bảng Dự Án F2 - Điểm Quỹ Chéo Độc Lập)</option>"""

new_add_option = """            <option value="th" ${activeTab === 'th' ? 'selected' : ''}>🏢 Quỹ NW (Bảng Tổng Hợp - Tính Điểm Theo Dự Án & Điều Kiện)</option>
            <option value="f2" ${activeTab === 'f2' ? 'selected' : ''}>🔄 Quỹ Chéo (Bảng Dự Án F2 - Điểm Quỹ Chéo Độc Lập)</option>
            <option value="campaign" ${activeTab === 'campaign' ? 'selected' : ''}>🔥 Quỹ Chiến Dịch (Bảng Điểm Chiến Dịch Cột X)</option>"""

assert old_add_option in html, "old_add_option not found"
html = html.replace(old_add_option, new_add_option, 1)

# In submitAddRow: handle fundType === 'campaign'
old_submit_add = """      if (fundType === 'th') {"""

new_submit_add = """      if (fundType === 'campaign') {
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
      }

      if (fundType === 'th') {"""

assert old_submit_add in html, "old_submit_add not found"
html = html.replace(old_submit_add, new_submit_add, 1)

# 11. Update openEditRowModal and submitEditRow and deleteRow for campaign
old_edit_modal = """    function openEditRowModal(tab, rowIdx) {
      const modal = document.getElementById('editRowModal');
      const title = document.getElementById('modalEditTitle');
      const body = document.getElementById('modalEditBody');

      if (tab === 'th') {"""

new_edit_modal = """    function openEditRowModal(tab, rowIdx) {
      const modal = document.getElementById('editRowModal');
      const title = document.getElementById('modalEditTitle');
      const body = document.getElementById('modalEditBody');

      if (tab === 'campaign') {
        const row = configData.campaign?.rows?.find(r => r.rowIdx === rowIdx);
        if (!row) { showToast('Không tìm thấy dòng chiến dịch!', true); return; }

        const spVal = (row.sanPham && row.sanPham !== '*' && row.sanPham !== 'Tất cả') ? row.sanPham : 'Tất cả';
        const lcVal = (row.loaiCan && row.loaiCan !== '*' && row.loaiCan !== 'Tất cả') ? row.loaiCan : 'Tất cả';
        const giaVal = (row.khoangGia && row.khoangGia !== '*' && row.khoangGia !== 'Tất cả') ? row.khoangGia : 'Tất cả';
        const parsedPrice = parseKhoangGiaToMinMax(row.khoangGia);

        title.innerText = `✏️ Sửa Dự Án Chiến Dịch: ${row.code} (${row.name})`;
        body.innerHTML = `
          <input type="hidden" id="editRowIdx" value="${rowIdx}">
          <input type="hidden" id="editTab" value="campaign">
          
          <div class="form-row-2">
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
          </div>

          <div style="background: var(--bg-muted); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-xs); font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">
                🎯 Cập Nhật 3 Tiêu Chí Khớp (Sản Phẩm - Loại Căn - Khoảng Giá)
              </span>
              <span style="font-size: 11px; color: var(--text-tertiary);">
                (* hoặc để trống = Áp dụng tất cả)
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
      }

      if (tab === 'th') {"""

assert old_edit_modal in html, "old_edit_modal not found"
html = html.replace(old_edit_modal, new_edit_modal, 1)

# In submitEditRow: handle tab === 'campaign'
old_submit_edit = """    function submitEditRow() {
      const rowIdx = parseInt(document.getElementById('editRowIdx').value, 10);
      const tab = document.getElementById('editTab').value;"""

new_submit_edit = """    function submitEditRow() {
      const rowIdx = parseInt(document.getElementById('editRowIdx').value, 10);
      const tab = document.getElementById('editTab').value;

      if (tab === 'campaign') {
        const row = configData.campaign?.rows?.find(r => r.rowIdx === rowIdx);
        if (!row) { showToast('Không tìm thấy dòng chiến dịch!', true); return; }

        const code = document.getElementById('editCode').value.trim();
        const name = document.getElementById('editName').value.trim() || code;
        const cdt = document.getElementById('editCdt').value.trim();
        const region = document.getElementById('editRegion').value;
        const status = document.getElementById('editStatus').value;
        const vals = getThreeFieldValues('edit');
        const scoreEl = document.getElementById('editScoreCampaign');

        row.code = code;
        row.name = name;
        row.cdt = cdt;
        row.region = region;
        row.status = status;
        row.sanPham = vals.sanPham;
        row.loaiCan = vals.loaiCan;
        row.khoangGia = vals.khoangGia;
        if (scoreEl) row.score = parseFloat(scoreEl.value) || 0;

        closeEditRowModal();
        markCampaignDirty();
        renderTable();
        showToast('Đã cập nhật dòng chiến dịch thành công!');
        return;
      }"""

assert old_submit_edit in html, "old_submit_edit not found"
html = html.replace(old_submit_edit, new_submit_edit, 1)

# In deleteRow: handle tab === 'campaign'
old_delete_row = """    function deleteRow(tab, rowIdx, displayName) {
      showConfirmModal({"""

new_delete_row = """    function deleteRow(tab, rowIdx, displayName) {
      if (tab === 'campaign') {
        showConfirmModal({
          icon: '🗑️',
          title: 'Xóa Dòng Cấu Hình Chiến Dịch',
          message: `Bạn có chắc muốn xóa dòng "${displayName}" khỏi bảng Chiến Dịch?`
        }, function() {
          if (configData.campaign && configData.campaign.rows) {
            configData.campaign.rows = configData.campaign.rows.filter(r => r.rowIdx !== rowIdx);
            configData.campaign.rows.forEach((r, idx) => {
              r.rowIdx = idx;
              r.stt = idx + 1;
            });
          }
          markCampaignDirty();
          renderStats();
          renderTable();
          showToast('Đã xóa dòng cấu hình khỏi chiến dịch!');
        });
        return;
      }

      showConfirmModal({"""

assert old_delete_row in html, "old_delete_row not found"
html = html.replace(old_delete_row, new_delete_row, 1)

with open('src/ConfigUI.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('All UI and JS updates successfully applied to src/ConfigUI.html!')
