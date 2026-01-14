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

let currentPage = 1;
let currentSearch = '';
let totalPages = 1;

// --- Helpers ---

function formatCurrency(amount) {
    return Number(amount).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 });
}

/**
 * Creates a single client card DOM node
 * @param {object} client - Client object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createClientCard(client) {
    // Main card container
    const card = document.createElement('div');
    card.className = 'client-card';

    // Client name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'client-card-name';
    nameDiv.textContent = client.name || "—";

    // Balance
    const balanceDiv = document.createElement('div');
    balanceDiv.className = 'client-card-balance';
    let bal = typeof client.balance === 'number' ? client.balance : 0;
    balanceDiv.textContent = formatCurrency(bal);
    if (bal > 0) {
        balanceDiv.classList.add('positive-balance');
    } else if (bal < 0) {
        balanceDiv.classList.add('negative-balance');
    } else {
        balanceDiv.classList.add('zero-balance');
    }

    // Add more fields here if needed (e.g. phone, address...)

    // Open button
    const openBtn = document.createElement('button');
    openBtn.className = 'client-card-open-btn';
    openBtn.textContent = 'فتح الحساب';
    openBtn.addEventListener('click', function () {
        window.location.href = `clients-details.html?id=${encodeURIComponent(client.id)}`;
    });

    // Assemble card
    card.appendChild(nameDiv);
    card.appendChild(balanceDiv);
    card.appendChild(openBtn);

    return card;
}

function renderClients(clients) {
    // Get or create container
    let container = document.getElementById('clientsContainer');
    if (!container) {
        // Fallback: create if not present
        container = document.createElement('div');
        container.id = 'clientsContainer';
        document.body.appendChild(container);
    }
    container.innerHTML = '';

    // Cards grid
    const grid = document.createElement('div');
    grid.className = 'clients-grid';

    clients.forEach(client => {
        const card = createClientCard(client);
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function renderPagination(pagination) {
    if (!pagination) return;

    const container = document.getElementById('paginationContainer');
    if (!container) return;

    container.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'pagination';

    // Previous button
    if (pagination.page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'السابق';
        prevBtn.className = 'pagination-btn';
        prevBtn.addEventListener('click', () => loadClients(pagination.page - 1));
        nav.appendChild(prevBtn);
    }

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `صفحة ${pagination.page} من ${pagination.pages}`;
    nav.appendChild(pageInfo);

    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'التالي';
        nextBtn.className = 'pagination-btn';
        nextBtn.addEventListener('click', () => loadClients(pagination.page + 1));
        nav.appendChild(nextBtn);
    }

    container.appendChild(nav);
}

// --- Responsive styles injection ---
(function injectClientsCss() {
    const style = document.createElement('style');
    style.innerHTML = `
    #clientsContainer {
        max-width: 1100px;
        margin: 24px auto 0 auto;
        padding: 0 14px;
    }
    .clients-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 22px;
        align-items: stretch;
    }
    .client-card {
        background: #fff;
        border: 1px solid #e5e9f2;
        border-radius: 9px;
        box-shadow: 0 3px 12px #28527a13;
        padding: 28px 20px 22px 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-height: 160px;
        position: relative;
        transition: box-shadow 0.17s;
    }
    .client-card:hover {
        box-shadow: 0 9px 24px #28527a29;
        border-color: #c8e2ff;
    }
    .client-card-name {
        font-size: 1.25rem;
        font-weight: bold;
        color: #28527a;
        margin-bottom: 15px;
        word-break: break-word;
    }
    .client-card-balance {
        font-size: 1.07rem;
        margin-bottom: 24px;
        font-family: 'Cairo', Arial, sans-serif;
    }
    .positive-balance { color: #388e3c; font-weight: 500; }
    .negative-balance { color: #c0392b; font-weight: 500; }
    .zero-balance { color: #7c7c7c; }
    .client-card-open-btn {
        margin-top: auto;
        padding: 8px 22px;
        border-radius: 6px;
        background: #2d6cdf;
        color: #fff;
        border: none;
        font-size: 1rem;
        font-family: 'Cairo', Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 1px 5px #28527a13;
        transition: background 0.14s, box-shadow 0.14s;
    }
    .client-card-open-btn:hover, .client-card-open-btn:focus {
        background: #174886;
        box-shadow: 0 3px 14px #28527a22;
    }
    #paginationContainer {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 32px 0;
        gap: 16px;
    }
    .pagination {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
    }
    .pagination-btn {
        padding: 8px 16px;
        background: #2d6cdf;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: background 0.14s;
    }
    .pagination-btn:hover {
        background: #174886;
    }
    .pagination-info {
        font-size: 0.95rem;
        color: #555;
        font-weight: 500;
    }
    #searchContainer {
        max-width: 1100px;
        margin: 16px auto 0;
        padding: 0 14px;
        display: flex;
        gap: 8px;
    }
    #clientSearch {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.95rem;
        font-family: 'Cairo', Arial, sans-serif;
    }
    #clientSearch:focus {
        outline: none;
        border-color: #2d6cdf;
        box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.1);
    }
    #searchBtn {
        padding: 10px 20px;
        background: #2d6cdf;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Cairo', Arial, sans-serif;
        transition: background 0.14s;
    }
    #searchBtn:hover {
        background: #174886;
    }
    @media (max-width: 680px) {
        .client-card { padding: 18px 11px 14px 11px; }
        .clients-grid { gap: 13px; }
        #clientsContainer { padding: 0 4px; }
        #searchContainer { flex-direction: column; }
    }
    `;
    document.head.appendChild(style);
})();

async function loadClients(page = 1) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 25);
    if (currentSearch) {
        params.set('q', currentSearch);
    }

    const resp = await fetch(`${API_BASE}/clients?${params}`);

    if (!resp.ok) throw new Error('تعذر تحميل العملاء');
    const result = await resp.json();

    renderClients(result.data);
    if (result.pagination) {
        renderPagination(result.pagination);
        currentPage = result.pagination.page;
    }
}

async function fetchClients() {
    return loadClients(1);
}

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.id = 'searchContainer';
    const searchInput = document.createElement('input');
    searchInput.id = 'clientSearch';
    searchInput.type = 'text';
    searchInput.placeholder = 'ابحث عن عميل...';

    const searchBtn = document.createElement('button');
    searchBtn.id = 'searchBtn';
    searchBtn.textContent = 'بحث';
    searchBtn.addEventListener('click', () => {
        currentSearch = searchInput.value;
        loadClients(1);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            currentSearch = searchInput.value;
            loadClients(1);
        }
    });

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchBtn);
    document.body.insertBefore(searchContainer, document.getElementById('clientsContainer'));

    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'paginationContainer';
    document.body.appendChild(paginationContainer);

    fetchClients()
        .catch(err => {
            console.error(err);
            const container = document.getElementById('clientsContainer') || document.body;
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'تعذر تحميل العملاء';
            errorDiv.style.color = '#c0392b';
            errorDiv.style.margin = '16px 0';
            container.appendChild(errorDiv);
        });
});

