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

// -------- 1. جلب ID العميل من URL ----------
function getClientIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// -------- Helpers --------
function formatCurrency(amount) {
    return Number(amount).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    // YYYY-MM-DD > DD/MM/YYYY
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('ar-EG');
}

// -------- 3. توليد جدول التسليمات (deliveries) ----------
function renderDeliveriesTable(container, deliveries) {
    const table = document.createElement('table');
    table.className = "client-detail-table";
    // رأس الجدول - مرن لإضافة أعمدة مستقبلًا
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const fields = [
        { label: "التاريخ", key: "created_at" },
        { label: "نوع الحمولة", key: "material" },
        { label: "رقم البون", key: "voucher" },
        { label: "الكمية", key: "quantity" },
        { label: "خصم", key: "discount_volume" },
        { label: "الصافي", key: "net_quantity" },
        { label: "سعر المتر", key: "price_per_meter" },
        { label: "الإجمالي", key: "total_value" },
        { label: "الكسارة", key: "crusher_name" },
        { label: "مقاول النقل", key: "contractor_name" }
    ];
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // جسم الجدول
    const tbody = document.createElement('tbody');
    deliveries.forEach(delivery => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            const value = delivery[f.key];
            if (f.key === "total_value") {
                td.textContent = formatCurrency(value);
                td.className = "cell-delivery-total";
            } else if (["price_per_meter"].includes(f.key)) {
                td.textContent = formatCurrency(value);
            } else if (["quantity", "discount_volume", "net_quantity"].includes(f.key)) {
                td.textContent = Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else if (f.key === "created_at") {
                td.textContent = formatDate(value);
            } else {
                td.textContent = value !== undefined && value !== null ? value : "";
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // مسح وتهيئة الحاوية
    container.innerHTML = "";
    container.appendChild(table);
}

// -------- 4. توليد جدول المدفوعات (payments) ----------
function renderPaymentsTable(container, payments) {
    const table = document.createElement('table');
    table.className = "client-detail-table";
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const fields = [
        { label: "التاريخ", key: "paid_at" },
        { label: "المبلغ", key: "amount" },
        { label: "طريقة الدفع", key: "method" },
        { label: "ملاحظات", key: "notes" }
    ];
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // جسم الجدول
    const tbody = document.createElement('tbody');
    payments.forEach(payment => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            if (f.key === "amount") {
                td.textContent = formatCurrency(payment[f.key]);
                td.className = "cell-payment-amount";
            } else if (f.key === "paid_at") {
                td.textContent = formatDate(payment[f.key]);
            } else {
                td.textContent = payment[f.key] !== undefined ? payment[f.key] : "";
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // مسح وتهيئة الحاوية
    container.innerHTML = "";
    container.appendChild(table);
}

// --------  الحسابات المالية  -----------
function renderFinancialSummary(container, totals, clientData) {
    // totals قادم من الباك اند، مع احتساب الرصيد
    const totalDeliveries = totals?.totalDeliveries ?? 0;
    const totalPayments = totals?.totalPayments ?? 0;
    const totalAdjustments = totals?.totalAdjustments ?? 0;
    const openingBalance = totals?.openingBalance ?? 0;
    const finalBalance = totals?.balance ?? (totalDeliveries - totalPayments + totalAdjustments + openingBalance);

    // إنشاء الملخص
    container.innerHTML = `
    <div class="client-financial-summary">
        <table>
            <tbody>
                <tr>
                    <td>الرصيد الافتتاحي</td>
                    <td>${formatCurrency(openingBalance)}</td>
                </tr>
                <tr>
                    <td>إجمالي التسليمات</td>
                    <td>${formatCurrency(totalDeliveries)}</td>
                </tr>
                <tr>
                    <td>إجمالي المدفوعات</td>
                    <td>${formatCurrency(totalPayments)}</td>
                </tr>
                <tr>
                    <td>إجمالي التعديلات</td>
                    <td>${formatCurrency(totalAdjustments)}</td>
                </tr>
                <tr class="balance-row">
                    <td><strong>الرصيد النهائي</strong></td>
                    <td><strong>${formatCurrency(finalBalance)}</strong></td>
                </tr>
            </tbody>
        </table>
    </div>
    `;
}

// -------- (إضافي) جدول التعديلات -----------
/**
function renderAdjustmentsTable(container, adjustments) {
    const table = document.createElement('table');
    table.className = "client-detail-table";
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const fields = [
        { label: "التاريخ", key: "created_at" },
        { label: "القيمة", key: "amount" },
        { label: "السبب", key: "reason" }
    ];
    fields.forEach(f => {
        const th = document.createElement('th');
        th.textContent = f.label;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // جسم الجدول
    const tbody = document.createElement('tbody');
    adjustments.forEach(adj => {
        const tr = document.createElement('tr');
        fields.forEach(f => {
            const td = document.createElement('td');
            if (f.key === "amount") {
                td.textContent = formatCurrency(adj[f.key]);
                td.className = "cell-adj-amount";
            } else if (f.key === "created_at") {
                td.textContent = formatDate(adj[f.key]);
            } else {
                td.textContent = adj[f.key] !== undefined ? adj[f.key] : "";
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = "";
    container.appendChild(table);
}

async function fetchClientDetails(id) {
    const resp = await fetch(`${API_BASE}/clients/${id}`);
    if (!resp.ok) {
        throw new Error('تعذر تحميل بيانات العميل');
    }
    return resp.json();
}

// ------- التهيئة التلقائية عند تحميل الصفحة ------
document.addEventListener('DOMContentLoaded', function() {
    const clientId = getClientIdFromURL();
    if (!clientId) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'لم يتم تحديد العميل!' });
        return;
    }

    fetchClientDetails(clientId)
        .then((data) => {
            const nameHeader = document.getElementById('clientName');
            if (nameHeader) nameHeader.textContent = data.client?.name || "-";

            const deliveriesDiv    = document.getElementById('deliveriesTableDiv');
            const paymentsDiv      = document.getElementById('paymentsTableDiv');
            const adjustmentsDiv   = document.getElementById('adjustmentsTableDiv');
            const summaryDiv       = document.getElementById('financialSummaryDiv');

            if (deliveriesDiv) renderDeliveriesTable(deliveriesDiv, data.deliveries || []);
            if (paymentsDiv)   renderPaymentsTable(paymentsDiv, data.payments   || []);
            if (adjustmentsDiv) renderAdjustmentsTable(adjustmentsDiv, data.adjustments || []);
            if (summaryDiv)    renderFinancialSummary(summaryDiv, data.totals, data);
        })
        .catch((err) => {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'حدث خطأ أثناء تحميل بيانات العميل' });
        });
});

// ----  (CSS suggestion للجدول إن لم يكن موجود) ----
// يمكن تضمين CSS في ملف منفصل أو داخل الصفحة:
/*
.client-detail-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
    font-size: 1rem;
    background: #fcfcff;
}
.client-detail-table th, .client-detail-table td {
    border: 1px solid #dbeafe;
    padding: 9px 10px;
    text-align: center;
}
.client-detail-table th { background: #e8f1ff; font-weight: 600; }
.client-detail-table .cell-delivery-total,
.client-detail-table .cell-payment-amount,
.client-detail-table .cell-adj-amount
    { font-weight: bold; }
.client-financial-summary table { width: 100%; margin-top: 7px; }
.client-financial-summary .balance-row td { color: #174886; font-size: 1.13em; font-weight: bold; }
*/
