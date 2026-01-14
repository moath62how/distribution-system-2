const API_BASE = (function () {
    if (window.__API_BASE__) return window.__API_BASE__;
    try {
        const origin = window.location.origin;
        if (!origin || origin === 'null') return 'http://localhost:5000/api';
        return origin.replace(/\/$/, '') + '/api';
    } catch (e) {
        return 'http://localhost:5000/api';
    }
})();

// State
let allDeliveries = [], allPayments = [], allAdjustments = [];
let deliveriesSort = 'date-desc', paymentsSort = 'date-desc', adjustmentsSort = 'date-desc';

// Helpers
function getClientIdFromURL() {
    return new URLSearchParams(window.location.search).get('id');
}

function formatCurrency(amount) {
    return Number(amount).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('ar-EG');
}

// Generic table builder
function buildTable(data, fields) {
    const table = document.createElement('table');
    table.className = "client-detail-table";
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            const value = row[f.key];
            if (f.key === "total_value" || f.key === "amount") {
                td.textContent = formatCurrency(value);
                if (f.key === "amount") {
                    td.style.fontWeight = 'bold';
                    td.style.color = value < 0 ? '#c0392b' : '#388e3c';
                }
            } else if (["price_per_meter"].includes(f.key)) {
                td.textContent = formatCurrency(value);
            } else if (["quantity"].includes(f.key)) {
                td.textContent = Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else if (["created_at", "paid_at"].includes(f.key)) {
                td.textContent = formatDate(value);
            } else {
                td.textContent = value !== undefined && value !== null ? value : "";
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
}

// Deliveries
function renderDeliveriesTable(deliveries, showControls = true) {
    const container = document.getElementById('deliveriesTableDiv');
    if (!container) return;

    const fields = [
        { label: "التاريخ", key: "created_at" },
        { label: "نوع الحمولة", key: "material" },
        { label: "رقم البون", key: "voucher" },
        { label: "الكمية", key: "quantity" },
        { label: "سعر المتر", key: "price_per_meter" },
        { label: "الإجمالي", key: "total_value" },
        { label: "الكسارة", key: "crusher_name" },
        { label: "مقاول النقل", key: "contractor_name" }
    ];

    if (!showControls) {
        container.innerHTML = '';
        container.appendChild(buildTable(deliveries, fields));
        return;
    }

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسليمات...';
    searchInput.className = 'table-search';

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderDeliveries(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderDeliveries(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="value-desc">الأعلى قيمة أولاً</option>
                            <option value="value-asc">الأقل قيمة أولاً</option>`;
    sortSelect.value = deliveriesSort;
    sortSelect.addEventListener('change', (e) => {
        deliveriesSort = e.target.value;
        filterAndRenderDeliveries(searchInput.value);
    });

    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(deliveries, fields));
}


function filterAndRenderDeliveries(searchTerm = '') {
    let filtered = allDeliveries.filter(d => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (d.material || '').toLowerCase().includes(term) ||
            (d.voucher || '').toLowerCase().includes(term) ||
            (d.crusher_name || '').toLowerCase().includes(term) ||
            (d.contractor_name || '').toLowerCase().includes(term);
    });

    filtered = filtered.sort((a, b) => {
        switch (deliveriesSort) {
            case 'date-asc': return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc': return new Date(b.created_at) - new Date(a.created_at);
            case 'value-asc': return (a.total_value || 0) - (b.total_value || 0);
            case 'value-desc': return (b.total_value || 0) - (a.total_value || 0);
            default: return 0;
        }
    });

    const container = document.getElementById('deliveriesTableDiv');
    if (!container) return;

    const fields = [
        { label: "التاريخ", key: "created_at" },
        { label: "نوع الحمولة", key: "material" },
        { label: "رقم البون", key: "voucher" },
        { label: "الكمية", key: "quantity" },
        { label: "سعر المتر", key: "price_per_meter" },
        { label: "الإجمالي", key: "total_value" },
        { label: "الكسارة", key: "crusher_name" },
        { label: "مقاول النقل", key: "contractor_name" }
    ];

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسليمات...';
    searchInput.className = 'table-search';
    searchInput.value = searchTerm;

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderDeliveries(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderDeliveries(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="value-desc">الأعلى قيمة أولاً</option>
                            <option value="value-asc">الأقل قيمة أولاً</option>`;
    sortSelect.value = deliveriesSort;
    sortSelect.addEventListener('change', (e) => {
        deliveriesSort = e.target.value;
        filterAndRenderDeliveries(searchInput.value);
    });

    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(filtered, fields));
}

// Payments
function renderPaymentsTable(payments, showControls = true) {
    const container = document.getElementById('paymentsTableDiv');
    if (!container) return;

    const fields = [
        { label: "التاريخ", key: "paid_at" },
        { label: "المبلغ", key: "amount" },
        { label: "طريقة الدفع", key: "method" },
        { label: "ملاحظات", key: "note" }
    ];

    if (!showControls) {
        container.innerHTML = '';
        container.appendChild(buildTable(payments, fields));
        return;
    }

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة دفعة جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', showPaymentForm);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في المدفوعات...';
    searchInput.className = 'table-search';

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderPayments(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderPayments(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="amount-desc">الأعلى مبلغ أولاً</option>
                            <option value="amount-asc">الأقل مبلغ أولاً</option>`;
    sortSelect.value = paymentsSort;
    sortSelect.addEventListener('change', (e) => {
        paymentsSort = e.target.value;
        filterAndRenderPayments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(payments, fields));
}

function filterAndRenderPayments(searchTerm = '') {
    let filtered = allPayments.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (p.note || '').toLowerCase().includes(term) ||
            (p.method || '').toLowerCase().includes(term);
    });

    filtered = filtered.sort((a, b) => {
        switch (paymentsSort) {
            case 'date-asc': return new Date(a.paid_at) - new Date(b.paid_at);
            case 'date-desc': return new Date(b.paid_at) - new Date(a.paid_at);
            case 'amount-asc': return (a.amount || 0) - (b.amount || 0);
            case 'amount-desc': return (b.amount || 0) - (a.amount || 0);
            default: return 0;
        }
    });

    const container = document.getElementById('paymentsTableDiv');
    if (!container) return;

    const fields = [
        { label: "التاريخ", key: "paid_at" },
        { label: "المبلغ", key: "amount" },
        { label: "طريقة الدفع", key: "method" },
        { label: "ملاحظات", key: "note" }
    ];

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة دفعة جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', showPaymentForm);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في المدفوعات...';
    searchInput.className = 'table-search';
    searchInput.value = searchTerm;

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderPayments(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderPayments(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="amount-desc">الأعلى مبلغ أولاً</option>
                            <option value="amount-asc">الأقل مبلغ أولاً</option>`;
    sortSelect.value = paymentsSort;
    sortSelect.addEventListener('change', (e) => {
        paymentsSort = e.target.value;
        filterAndRenderPayments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(filtered, fields));
}

// Financial Summary
function renderFinancialSummary(container, totals) {
    const totalDeliveries = totals?.totalDeliveries ?? 0;
    const totalPayments = totals?.totalPayments ?? 0;
    const totalAdjustments = totals?.totalAdjustments ?? 0;
    const openingBalance = totals?.openingBalance ?? 0;
    const finalBalance = totals?.balance ?? (totalDeliveries - totalPayments + totalAdjustments + openingBalance);

    container.innerHTML = `
    <div class="client-financial-summary">
        <table><tbody>
            <tr><td>الرصيد الافتتاحي</td><td>${formatCurrency(openingBalance)}</td></tr>
            <tr><td>إجمالي التسليمات</td><td>${formatCurrency(totalDeliveries)}</td></tr>
            <tr><td>إجمالي المدفوعات</td><td>${formatCurrency(totalPayments)}</td></tr>
            <tr><td>إجمالي التعديلات</td><td>${formatCurrency(totalAdjustments)}</td></tr>
            <tr class="balance-row"><td><strong>الرصيد النهائي</strong></td><td><strong>${formatCurrency(finalBalance)}</strong></td></tr>
        </tbody></table>
    </div>`;
}

// Material Cards
function renderMaterialCards(container, materialTotals) {
    if (!materialTotals || materialTotals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">لا توجد بيانات مواد</p>';
        return;
    }
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'material-cards-grid';
    materialTotals.forEach(m => {
        const card = document.createElement('div');
        card.className = 'material-card';
        card.innerHTML = `<div class="material-card-title">${m.material}</div>
            <div class="material-card-stat"><span>الكمية:</span><strong>${Number(m.totalQty || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} م³</strong></div>
            <div class="material-card-stat"><span>القيمة:</span><strong>${formatCurrency(m.totalValue)}</strong></div>`;
        grid.appendChild(card);
    });
    container.appendChild(grid);
}

// CSS Injection
(function injectCss() {
    const style = document.createElement('style');
    style.innerHTML = `.material-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 20px 0; }
    .material-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .material-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    .material-card-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 12px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 8px; }
    .material-card-stat { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; font-size: 0.95rem; }
    .material-card-stat span { opacity: 0.9; }
    .material-card-stat strong { font-size: 1.05rem; text-align: right; }
    .table-controls { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .add-btn, .search-btn { padding: 10px 16px; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Cairo', Arial, sans-serif; font-weight: 500; transition: background 0.2s; white-space: nowrap; }
    .add-btn { background: #4CAF50; }
    .add-btn:hover { background: #45a049; }
    .search-btn { background: #2d6cdf; }
    .search-btn:hover { background: #174886; }
    .table-search { flex: 1; min-width: 200px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-family: 'Cairo', Arial, sans-serif; font-size: 0.95rem; }
    .table-search:focus { outline: none; border-color: #2d6cdf; box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.1); }
    .table-sort { padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-family: 'Cairo', Arial, sans-serif; background: white; cursor: pointer; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1000; justify-content: center; align-items: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 32px; border-radius: 10px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); }
    .modal-header { font-size: 1.5rem; font-weight: bold; margin-bottom: 24px; color: #333; text-align: right; }
    .form-group { margin-bottom: 20px; text-align: right; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #555; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-family: 'Cairo', Arial, sans-serif; font-size: 0.95rem; box-sizing: border-box; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #2d6cdf; box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.1); }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .btn-submit, .btn-cancel { padding: 10px 24px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Cairo', Arial, sans-serif; font-weight: 500; transition: background 0.2s; }
    .btn-submit { background: #2d6cdf; color: white; }
    .btn-submit:hover { background: #174886; }
    .btn-cancel { background: #e0e0e0; color: #333; }
    .btn-cancel:hover { background: #d0d0d0; }
    .form-message { padding: 12px; border-radius: 6px; margin-bottom: 16px; text-align: right; }
    .form-message.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
    .form-message.error { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
    @media (max-width: 680px) { .table-controls { flex-direction: column; } .table-search { min-width: unset; } }`;
    document.head.appendChild(style);
})();

// Adjustments
function renderAdjustmentsTable(adjustments, showControls = true) {
    const container = document.getElementById('adjustmentsTableDiv');
    if (!container) return;

    const fields = [
        { label: 'التاريخ', key: 'created_at' },
        { label: 'القيمة', key: 'amount' },
        { label: 'السبب', key: 'reason' }
    ];

    if (!showControls) {
        container.innerHTML = '';
        container.appendChild(buildTable(adjustments, fields));
        return;
    }

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة تسوية جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', showAdjustmentForm);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسويات...';
    searchInput.className = 'table-search';

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderAdjustments(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderAdjustments(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="amount-desc">الأعلى مبلغ أولاً</option>
                            <option value="amount-asc">الأقل مبلغ أولاً</option>`;
    sortSelect.value = adjustmentsSort;
    sortSelect.addEventListener('change', (e) => {
        adjustmentsSort = e.target.value;
        filterAndRenderAdjustments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(adjustments, fields));
}

function filterAndRenderAdjustments(searchTerm = '') {
    let filtered = allAdjustments.filter(a => {
        if (!searchTerm) return true;
        return (a.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    filtered = filtered.sort((a, b) => {
        switch (adjustmentsSort) {
            case 'date-asc': return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc': return new Date(b.created_at) - new Date(a.created_at);
            case 'amount-asc': return (a.amount || 0) - (b.amount || 0);
            case 'amount-desc': return (b.amount || 0) - (a.amount || 0);
            default: return 0;
        }
    });

    const container = document.getElementById('adjustmentsTableDiv');
    if (!container) return;

    const fields = [
        { label: 'التاريخ', key: 'created_at' },
        { label: 'القيمة', key: 'amount' },
        { label: 'السبب', key: 'reason' }
    ];

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة تسوية جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', showAdjustmentForm);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسويات...';
    searchInput.className = 'table-search';
    searchInput.value = searchTerm;

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderAdjustments(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderAdjustments(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="amount-desc">الأعلى مبلغ أولاً</option>
                            <option value="amount-asc">الأقل مبلغ أولاً</option>`;
    sortSelect.value = adjustmentsSort;
    sortSelect.addEventListener('change', (e) => {
        adjustmentsSort = e.target.value;
        filterAndRenderAdjustments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(filtered, fields));
}

// Modal Helpers
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.textContent = message;
        msgDiv.className = `form-message ${type}`;
    }
}

// Payment Modal
function createPaymentModal() {
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content">
        <div class="modal-header">إضافة دفعة جديدة</div>
        <div id="paymentMessage"></div>
        <form id="paymentForm">
            <div class="form-group">
                <label for="paymentAmount">المبلغ *</label>
                <input type="number" id="paymentAmount" required min="0" step="0.01">
            </div>
            <div class="form-group">
                <label for="paymentDate">التاريخ</label>
                <input type="date" id="paymentDate">
            </div>
            <div class="form-group">
                <label for="paymentNote">ملاحظات</label>
                <textarea id="paymentNote"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-cancel" onclick="closeModal('paymentModal')">إلغاء</button>
                <button type="submit" class="btn-submit">إضافة</button>
            </div>
        </form>
    </div>`;

    modal.querySelector('#paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = getClientIdFromURL();
        const amount = document.getElementById('paymentAmount').value;
        const paid_at = document.getElementById('paymentDate').value;
        const note = document.getElementById('paymentNote').value;

        try {
            const resp = await fetch(`${API_BASE}/clients/${clientId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, paid_at, note })
            });
            if (!resp.ok) throw new Error('فشل إضافة الدفعة');
            showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
            setTimeout(() => { closeModal('paymentModal'); location.reload(); }, 1000);
        } catch (err) {
            showMessage('paymentMessage', err.message, 'error');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal('paymentModal');
    });

    document.body.appendChild(modal);
    return modal;
}

function showPaymentForm() {
    const modal = document.getElementById('paymentModal') || createPaymentModal();
    modal.classList.add('active');
}

// Adjustment Modal
function createAdjustmentModal() {
    const modal = document.createElement('div');
    modal.id = 'adjustmentModal';
    modal.className = 'modal';
    modal.innerHTML = `<div class="modal-content">
        <div class="modal-header">إضافة تسوية جديدة</div>
        <div id="adjustmentMessage"></div>
        <form id="adjustmentForm">
            <div class="form-group">
                <label for="adjustmentAmount">المبلغ * (موجب للإضافة، سالب للخصم)</label>
                <input type="number" id="adjustmentAmount" required step="0.01">
            </div>
            <div class="form-group">
                <label for="adjustmentReason">السبب</label>
                <textarea id="adjustmentReason"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-cancel" onclick="closeModal('adjustmentModal')">إلغاء</button>
                <button type="submit" class="btn-submit">إضافة</button>
            </div>
        </form>
    </div>`;

    modal.querySelector('#adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = getClientIdFromURL();
        const amount = document.getElementById('adjustmentAmount').value;
        const reason = document.getElementById('adjustmentReason').value;

        try {
            const resp = await fetch(`${API_BASE}/clients/${clientId}/adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, reason })
            });
            if (!resp.ok) throw new Error('فشل إضافة التسوية');
            showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
            setTimeout(() => { closeModal('adjustmentModal'); location.reload(); }, 1000);
        } catch (err) {
            showMessage('adjustmentMessage', err.message, 'error');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal('adjustmentModal');
    });

    document.body.appendChild(modal);
    return modal;
}

function showAdjustmentForm() {
    const modal = document.getElementById('adjustmentModal') || createAdjustmentModal();
    modal.classList.add('active');
}

// Fetch & Render
async function fetchClientDetails() {
    const clientId = getClientIdFromURL();
    if (!clientId) {
        document.body.innerHTML = '<p style="color: red; margin: 20px;">خطأ: لم يتم تحديد العميل</p>';
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/clients/${clientId}`);
        if (!resp.ok) throw new Error('فشل تحميل بيانات العميل');

        const result = await resp.json();
        allDeliveries = result.deliveries || [];
        allPayments = result.payments || [];
        allAdjustments = result.adjustments || [];

        document.getElementById('clientName').textContent = result.client.name;

        const summaryDiv = document.querySelector('.summary-card') || document.createElement('div');
        renderFinancialSummary(summaryDiv, result.totals);

        renderDeliveriesTable(allDeliveries);
        renderPaymentsTable(allPayments);

        const adjustmentsDiv = document.getElementById('adjustmentsTableDiv');
        if (adjustmentsDiv) {
            if (allAdjustments && allAdjustments.length > 0) {
                renderAdjustmentsTable(allAdjustments);
            } else {
                adjustmentsDiv.innerHTML = '<p style="text-align: center; color: #999;">لا توجد تسويات</p>';
            }
        }

        // Material cards section
        const materialSection = document.createElement('div');
        materialSection.className = 'section';
        const materialTitle = document.createElement('h3');
        materialTitle.textContent = 'ملخص المواد';
        materialSection.appendChild(materialTitle);
        const materialCardsDiv = document.createElement('div');
        renderMaterialCards(materialCardsDiv, result.materialTotals);
        materialSection.appendChild(materialCardsDiv);

        const deliveriesSection = document.querySelector('.section');
        if (deliveriesSection && deliveriesSection.parentNode) {
            deliveriesSection.parentNode.insertBefore(materialSection, deliveriesSection.nextSibling);
        }
    } catch (err) {
        console.error(err);
        document.body.innerHTML = `<p style="color: red; margin: 20px;">خطأ: ${err.message}</p>`;
    }
}

function showAdjustmentForm() {
    const modal = document.getElementById('adjustmentModal') || createAdjustmentModal();
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function createPaymentModal() {
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">إضافة دفعة جديدة</div>
            <div id="paymentMessage"></div>
            <form id="paymentForm">
                <div class="form-group">
                    <label for="paymentAmount">المبلغ *</label>
                    <input type="number" id="paymentAmount" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="paymentDate">التاريخ</label>
                    <input type="date" id="paymentDate">
                </div>
                <div class="form-group">
                    <label for="paymentNote">ملاحظات</label>
                    <textarea id="paymentNote"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal('paymentModal')">إلغاء</button>
                    <button type="submit" class="btn-submit">إضافة</button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#paymentForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = getClientIdFromURL();
        const amount = document.getElementById('paymentAmount').value;
        const paid_at = document.getElementById('paymentDate').value;
        const note = document.getElementById('paymentNote').value;

        try {
            const resp = await fetch(`${API_BASE}/clients/${clientId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, paid_at, note })
            });

            if (!resp.ok) throw new Error('فشل إضافة الدفعة');

            showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
            form.reset();
            setTimeout(() => {
                closeModal('paymentModal');
                location.reload();
            }, 1000);
        } catch (err) {
            showMessage('paymentMessage', err.message, 'error');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal('paymentModal');
    });

    document.body.appendChild(modal);
    return modal;
}

function createAdjustmentModal() {
    const modal = document.createElement('div');
    modal.id = 'adjustmentModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">إضافة تسوية جديدة</div>
            <div id="adjustmentMessage"></div>
            <form id="adjustmentForm">
                <div class="form-group">
                    <label for="adjustmentAmount">المبلغ * (موجب للإضافة، سالب للخصم)</label>
                    <input type="number" id="adjustmentAmount" required step="0.01">
                </div>
                <div class="form-group">
                    <label for="adjustmentReason">السبب</label>
                    <textarea id="adjustmentReason"></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal('adjustmentModal')">إلغاء</button>
                    <button type="submit" class="btn-submit">إضافة</button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#adjustmentForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = getClientIdFromURL();
        const amount = document.getElementById('adjustmentAmount').value;
        const reason = document.getElementById('adjustmentReason').value;

        try {
            const resp = await fetch(`${API_BASE}/clients/${clientId}/adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, reason })
            });

            if (!resp.ok) throw new Error('فشل إضافة التسوية');

            showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
            form.reset();
            setTimeout(() => {
                closeModal('adjustmentModal');
                location.reload();
            }, 1000);
        } catch (err) {
            showMessage('adjustmentMessage', err.message, 'error');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal('adjustmentModal');
    });

    document.body.appendChild(modal);
    return modal;
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.textContent = message;
        msgDiv.className = `form-message ${type}`;
    }
}

async function fetchClientDetails() {
    const clientId = getClientIdFromURL();
    if (!clientId) {
        document.body.innerHTML = '<p style="color: red; margin: 20px;">خطأ: لم يتم تحديد العميل</p>';
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/clients/${clientId}`);
        if (!resp.ok) throw new Error('فشل تحميل بيانات العميل');

        const result = await resp.json();

        // Store in state
        allDeliveries = result.deliveries || [];
        allPayments = result.payments || [];
        allAdjustments = result.adjustments || [];

        // Update page title
        document.getElementById('clientName').textContent = result.client.name;

        // Render financial summary
        const summaryDiv = document.querySelector('.summary-card') || document.createElement('div');
        renderFinancialSummary(summaryDiv, result.totals);

        // Render deliveries
        const deliveriesDiv = document.getElementById('deliveriesTableDiv');
        if (deliveriesDiv) renderDeliveriesTable(deliveriesDiv, allDeliveries);

        // Render payments
        const paymentsDiv = document.getElementById('paymentsTableDiv');
        if (paymentsDiv) renderPaymentsTable(paymentsDiv, allPayments);

        // Render adjustments
        const adjustmentsDiv = document.getElementById('adjustmentsTableDiv');
        if (adjustmentsDiv) {
            if (allAdjustments && allAdjustments.length > 0) {
                renderAdjustmentsTable(adjustmentsDiv, allAdjustments);
            } else {
                adjustmentsDiv.innerHTML = '<p style="text-align: center; color: #999;">لا توجد تسويات</p>';
            }
        }

        // Render material cards - create section for them
        const materialSection = document.createElement('div');
        materialSection.className = 'section';
        materialSection.id = 'materialSection';
        const materialTitle = document.createElement('h3');
        materialTitle.textContent = 'ملخص المواد';
        materialSection.appendChild(materialTitle);

        const materialCardsDiv = document.createElement('div');
        materialCardsDiv.id = 'materialCardsDiv';
        materialSection.appendChild(materialCardsDiv);

        renderMaterialCards(materialCardsDiv, result.materialTotals);

        // Insert material cards after deliveries section
        const deliveriesSection = document.querySelector('.section');
        if (deliveriesSection && deliveriesSection.parentNode) {
            deliveriesSection.parentNode.insertBefore(materialSection, deliveriesSection.nextSibling);
        }
    } catch (err) {
        console.error(err);
        document.body.innerHTML = `<p style="color: red; margin: 20px;">خطأ: ${err.message}</p>`;
    }
}

function renderAdjustmentsTable(container, adjustments) {
    const table = document.createElement('table');
    table.className = 'client-detail-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const fields = [
        { label: 'التاريخ', key: 'created_at' },
        { label: 'القيمة', key: 'amount' },
        { label: 'السبب', key: 'reason' }
    ];
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    adjustments.forEach(adj => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            if (f.key === 'amount') {
                td.textContent = formatCurrency(adj[f.key]);
                td.style.color = adj[f.key] > 0 ? '#388e3c' : '#c0392b';
                td.style.fontWeight = 'bold';
            } else if (f.key === 'created_at') {
                td.textContent = formatDate(adj[f.key]);
            } else {
                td.textContent = adj[f.key] || '';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة تسوية جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', () => showAdjustmentForm());

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسويات...';
    searchInput.className = 'table-search';
    searchInput.id = 'adjustmentsSearchInput';

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => {
        filterAndRenderAdjustments(searchInput.value);
    });

    // Allow Enter key to trigger search
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filterAndRenderAdjustments(searchInput.value);
        }
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `
        <option value="date-desc">الأحدث أولاً</option>
        <option value="date-asc">الأقدم أولاً</option>
        <option value="amount-desc">الأعلى مبلغ أولاً</option>
        <option value="amount-asc">الأقل مبلغ أولاً</option>
    `;
    sortSelect.value = adjustmentsSort;
    sortSelect.addEventListener('change', (e) => {
        adjustmentsSort = e.target.value;
        filterAndRenderAdjustments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(table);
}

function filterAndRenderAdjustments(searchTerm = '') {
    let filtered = allAdjustments.filter(a => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (a.reason || '').toLowerCase().includes(term);
    });

    // Apply sort
    filtered = filtered.sort((a, b) => {
        switch (adjustmentsSort) {
            case 'date-asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'amount-asc':
                return (a.amount || 0) - (b.amount || 0);
            case 'amount-desc':
                return (b.amount || 0) - (a.amount || 0);
            default:
                return 0;
        }
    });

    const container = document.getElementById('adjustmentsTableDiv');
    if (!container) return;

    const fields = [
        { label: 'التاريخ', key: 'created_at' },
        { label: 'القيمة', key: 'amount' },
        { label: 'السبب', key: 'reason' }
    ];

    container.innerHTML = '';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'table-controls';

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ إضافة تسوية جديدة';
    addBtn.className = 'add-btn';
    addBtn.addEventListener('click', showAdjustmentForm);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث في التسويات...';
    searchInput.className = 'table-search';
    searchInput.value = searchTerm;

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '🔍 بحث';
    searchBtn.className = 'search-btn';
    searchBtn.addEventListener('click', () => filterAndRenderAdjustments(searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterAndRenderAdjustments(searchInput.value);
    });

    const sortSelect = document.createElement('select');
    sortSelect.className = 'table-sort';
    sortSelect.innerHTML = `<option value="date-desc">الأحدث أولاً</option>
                            <option value="date-asc">الأقدم أولاً</option>
                            <option value="amount-desc">الأعلى مبلغ أولاً</option>
                            <option value="amount-asc">الأقل مبلغ أولاً</option>`;
    sortSelect.value = adjustmentsSort;
    sortSelect.addEventListener('change', (e) => {
        adjustmentsSort = e.target.value;
        filterAndRenderAdjustments(searchInput.value);
    });

    controlsDiv.appendChild(addBtn);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(searchBtn);
    controlsDiv.appendChild(sortSelect);
    container.appendChild(controlsDiv);
    container.appendChild(buildTable(filtered, fields));
}

document.addEventListener('DOMContentLoaded', fetchClientDetails);
