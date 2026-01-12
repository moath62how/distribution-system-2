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

// ===== 2. Helpers =====

/**
 * Format quantity with one decimal if needed
 * @param {number} qty
 */
function formatQuantity(qty) {
    if (typeof qty !== 'number') return "0";
    return Number(qty).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Creates a single crusher card DOM node
 * @param {object} crusher - Crusher object (id, name, totalDelivered, ...)
 * @returns {HTMLElement}
 */
function createCrusherCard(crusher) {
    // Main card container
    const card = document.createElement('div');
    card.className = 'crusher-card';

    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'crusher-card-name';
    nameDiv.textContent = crusher.name || "—";
    card.appendChild(nameDiv);

    // Total Delivered
    const deliveredDiv = document.createElement('div');
    deliveredDiv.className = 'crusher-card-total';
    let del = typeof crusher.totalDelivered === 'number' ? crusher.totalDelivered : 0;
    deliveredDiv.textContent = "الإجمالي: " + formatQuantity(del) + " طن";
    card.appendChild(deliveredDiv);

    // --- Future: show more fields here if added to crusher object ---

    // Open account button
    const openBtn = document.createElement('button');
    openBtn.className = 'crusher-card-open-btn';
    openBtn.textContent = "فتح الحساب";

    // On click: go to details page with ID in url
    openBtn.addEventListener('click', function () {
        window.location.href = `crusher-details.html?id=${encodeURIComponent(crusher.id)}`;
    });
    card.appendChild(openBtn);

    return card;
}

function renderCrushers(crushers) {
    const container = document.getElementById('crushersContainer');
    if (!container) return;

    // Clear previous content
    container.innerHTML = "";

    // Responsive grid
    const grid = document.createElement('div');
    grid.className = 'crushers-grid';

    // Add cards
    crushers.forEach(crusher => {
        grid.appendChild(createCrusherCard(crusher));
    });

    container.appendChild(grid);
}

// ===== 3. Style (Responsive CSS for the cards/grid) =====
(function () {
    const style = document.createElement('style');
    style.textContent = `
.crushers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px,1fr));
    gap: 16px;
    margin: 18px 0;
}
.crusher-card {
    background: #f8fbff;
    border-radius: 13px;
    box-shadow: 0 5px 18px #28527a18;
    border: 1px solid #e3eefa;
    padding: 21px 16px 16px 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: 135px;
    transition: box-shadow 0.16s;
}
.crusher-card:hover {
    box-shadow: 0 9px 28px #28527a28;
    border-color: #b5dffe;
}
.crusher-card-name {
    font-size: 1.23rem;
    font-weight: bold;
    color: #325385;
    margin-bottom: 13px;
    word-break: break-word;
}
.crusher-card-total {
    font-size: 1.08rem;
    margin-bottom: 22px;
    font-family: 'Cairo', Arial, sans-serif;
    color: #285236;
}
.crusher-card-open-btn {
    margin-top: auto;
    padding: 8px 20px;
    border-radius: 5px;
    background: #247ae0;
    color: #fff;
    border: none;
    font-size: 1rem;
    font-family: 'Cairo', Arial, sans-serif;
    cursor: pointer;
    box-shadow: 0 1px 4px #28527a10;
    transition: background 0.13s, box-shadow 0.13s;
}
.crusher-card-open-btn:hover, .crusher-card-open-btn:focus {
    background: #1960ad;
    box-shadow: 0 3px 14px #28527a22;
}
@media (max-width: 700px) {
    .crusher-card { padding: 15px 8px 13px 8px; }
    .crushers-grid { gap: 11px; }
    #crushersContainer { padding: 0 3px; }
}
`;
    document.head.appendChild(style);
})();

async function fetchCrushers() {
    const resp = await fetch(`${API_BASE}/crushers`);
    if (!resp.ok) throw new Error('تعذر تحميل الكسارات');
    return resp.json();
}

// ===== 4. Initialization on DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function () {
    fetchCrushers()
        .then(renderCrushers)
        .catch(err => {
            console.error(err);
            const container = document.getElementById('crushersContainer') || document.body;
            const msg = document.createElement('div');
            msg.textContent = 'تعذر تحميل بيانات الكسارات';
            msg.style.color = '#c0392b';
            container.appendChild(msg);
        });
});
