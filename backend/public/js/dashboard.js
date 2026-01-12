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

/**
 * صيغة العملة بالجنيه المصري
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    // تضمن التنسيق بالعربي والجنيه المصري – دوال النظام فقط
    return Number(amount).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    });
}

async function loadMetrics() {
    const resp = await fetch(`${API_BASE}/metrics`);
    if (!resp.ok) {
        throw new Error('تعذر تحميل إحصائيات اللوحة');
    }
    return resp.json();
}

// ========== 4. Cards Logic (Auto Update on DOMContentLoaded) ==========

/**
 * تحديث قيمة كارد بناءً على data-card أو id.
 * لدعم المستقبل بحيث يمكن إضافة كروت جديدة بسهولة عبر HTML.
 * @param {string} key - المفتاح الدلالي (data-card="sales" مثلاً)
 * @param {string|number} value - القيمة النهائية للنص
 */
function updateCardValue(key, value) {
    // أولاً: حاول إيجاد العنصر بكلاس "card-value" ومعرّف الكارد المناسب (data-card)
    const selector = `[data-card="${key}"] .card-value, #${key} .card-value, .dashboard-card.${key} .card-value`;
    const cardValueEl = document.querySelector(selector);

    if (cardValueEl) {
        cardValueEl.textContent = value;
    }
}

// ========== 5. Main Init ==========

document.addEventListener("DOMContentLoaded", function () {
    loadMetrics()
        .then(stats => {
            updateCardValue("sales", formatCurrency(stats.totalSales || 0));
            updateCardValue("profit", formatCurrency(stats.netProfit || 0));
            updateCardValue("customers", stats.totalClients || 0);
            updateCardValue("clients", stats.totalClients || 0); // دعم كلا التسميتين
            updateCardValue("quarries", stats.totalCrushers || 0);
            updateCardValue("crushers", stats.totalCrushers || 0);
            updateCardValue("contractors", stats.totalContractors || 0);
            updateCardValue("deliveries", stats.totalDeliveries || 0);
        })
        .catch(err => {
            console.error(err);
            updateCardValue("sales", "—");
            updateCardValue("profit", "—");
        });
});
