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

// --- Helpers ---

function formatCurrency(amount) {
    return Number(amount).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    });
}

/**
 * Creates a single contractor card DOM node
 * @param {object} contractor - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createContractorCard(contractor) {
    // Main card container
    const card = document.createElement('div');
    card.className = 'contractor-card';

    // Contractor name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'contractor-card-name';
    nameDiv.textContent = contractor.name || "—";

    // Balance
    const balanceDiv = document.createElement('div');
    balanceDiv.className = 'contractor-card-balance';
    let bal = typeof contractor.balance === 'number' ? contractor.balance : 0;
    balanceDiv.textContent = formatCurrency(bal);
    if (bal > 0) {
        balanceDiv.classList.add('positive-balance');
    } else if (bal < 0) {
        balanceDiv.classList.add('negative-balance');
    } else {
        balanceDiv.classList.add('zero-balance');
    }

    // Open Account button (فتح الحساب)
    const openBtn = document.createElement('button');
    openBtn.className = 'contractor-card-open-btn';
    openBtn.textContent = "فتح الحساب";
    openBtn.onclick = function () {
        // Navigate to contractor-details.html?id=XYZ
        window.location.href = `contractor-details.html?id=${encodeURIComponent(contractor.id)}`;
    };

    // Structure
    card.appendChild(nameDiv);
    card.appendChild(balanceDiv);
    card.appendChild(openBtn);

    return card;
}

function renderContractors(contractors) {
    const container = document.getElementById('contractorsContainer');
    if (!container) return;
    container.innerHTML = ''; // Clear before render

    // Cards grid container
    const grid = document.createElement('div');
    grid.className = 'contractors-grid';

    contractors.forEach(contractor => {
        grid.appendChild(createContractorCard(contractor));
    });

    container.appendChild(grid);
}

// --- Inject minimal responsive card CSS ---
(function injectContractorCardStyles() {
    if (document.getElementById('contractor-cards-style')) return;

    const style = document.createElement('style');
    style.id = 'contractor-cards-style';
    style.textContent = `
.contractors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
    gap: 18px;
    margin-top: 18px;
    margin-bottom: 22px;
    align-items: stretch;
}
.contractor-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    background: #f6fbff;
    border: 1.7px solid #d5e7fc;
    border-radius: 13px;
    box-shadow: 0 6px 17px #2d53881c;
    padding: 22px 15px 20px 15px;
    min-height: 156px;
    transition: box-shadow 0.15s, border 0.15s;
}
.contractor-card:hover {
    box-shadow: 0 9px 24px #28527a29;
    border-color: #bde5ff;
}
.contractor-card-name {
    font-size: 1.22rem;
    font-weight: bold;
    color: #284b71;
    margin-bottom: 13px;
    word-break: break-word;
}
.contractor-card-balance {
    font-size: 1.04rem;
    margin-bottom: 22px;
    font-family: 'Cairo', Arial, sans-serif;
}
.positive-balance { color: #388e3c; font-weight: 500; }
.negative-balance { color: #c0392b; font-weight: 500; }
.zero-balance { color: #7c7c7c; }
.contractor-card-open-btn {
    margin-top: auto;
    padding: 8px 22px;
    border-radius: 6px;
    background: #247ae0;
    color: #fff;
    border: none;
    font-size: 1rem;
    font-family: 'Cairo', Arial, sans-serif;
    cursor: pointer;
    box-shadow: 0 1px 5px #28527a13;
    transition: background 0.14s, box-shadow 0.14s;
}
.contractor-card-open-btn:hover, .contractor-card-open-btn:focus {
    background: #174886;
    box-shadow: 0 3px 14px #28527a22;
}
@media (max-width: 680px) {
    .contractor-card { padding: 13px 8px 11px 8px; }
    .contractors-grid { gap: 11px; }
    #contractorsContainer { padding: 0 4px; }
}
    `;
    document.head.appendChild(style);
})();

async function fetchContractors() {
    const resp = await fetch(`${API_BASE}/contractors`);
    if (!resp.ok) throw new Error('تعذر تحميل المقاولين');
    return resp.json();
}

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    fetchContractors()
        .then(renderContractors)
        .catch(err => {
            console.error(err);
            const container = document.getElementById('contractorsContainer') || document.body;
            const msg = document.createElement('div');
            msg.textContent = 'تعذر تحميل مقاولين العجل';
            msg.style.color = '#c0392b';
            container.appendChild(msg);
        });
});

