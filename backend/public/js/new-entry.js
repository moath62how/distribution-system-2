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

// Store crusher data for price lookup
let crushersData = [];

async function populateSelect(id, data, placeholder) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = placeholder;
    select.appendChild(defaultOpt);

    if (!data || !Array.isArray(data)) {
        console.error('Invalid data for populateSelect:', data);
        return;
    }

    data.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        select.appendChild(opt);
    });
}

async function loadDropdowns() {
    try {
        const [clients, crushers, contractors] = await Promise.all([
            fetch(`${API_BASE}/clients`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            fetch(`${API_BASE}/crushers`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            }),
            fetch(`${API_BASE}/contractors`, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
        ]);

        // Extract arrays from API responses (handle both old and new formats)
        const clientsArray = clients.clients || clients.data || clients;
        const crushersArray = crushers.crushers || crushers.data || crushers;
        const contractorsArray = contractors.contractors || contractors.data || contractors;

        // Store crushers data for price lookup
        crushersData = crushersArray;

        populateSelect('client', clientsArray, 'اختر العميل');
        populateSelect('crusher', crushersArray, 'اختر الكسارة');
        populateSelect('wheelContractor', contractorsArray, 'اختر المقاول');
    } catch (err) {
        console.error(err);
        const errorDiv = document.getElementById('formError');
        errorDiv.textContent = 'تعذر تحميل البيانات الأساسية';
        errorDiv.style.display = 'block';
    }
}

// Get crusher price by material
function getCrusherPriceByMaterial(crusherId, material) {
    const crusher = crushersData.find(c => c.id === crusherId);
    if (!crusher) return 0;

    const materialMap = {
        'رمل': 'sand_price',
        'سن 1': 'aggregate1_price',
        'سن 2': 'aggregate2_price',
        'سن 3': 'aggregate3_price'
    };

    return crusher[materialMap[material]] || 0;
}

function updateCrusherPrice() {
    const crusherId = document.getElementById('crusher').value;
    const material = document.getElementById('material').value;
    const crusherPriceDisplay = document.getElementById('crusherPriceDisplay');
    const crusherPriceValue = document.getElementById('crusherPriceValue');

    if (crusherId && material) {
        const crusherPrice = getCrusherPriceByMaterial(crusherId, material);
        // Store the crusher price for use in form submission
        document.getElementById('crusher').dataset.currentPrice = crusherPrice;

        // Show the crusher price to the user
        if (crusherPrice > 0) {
            crusherPriceValue.textContent = `${crusherPrice.toLocaleString('ar-EG')} جنيه`;
            crusherPriceValue.style.color = '#1e4d72';
            crusherPriceDisplay.style.display = 'block';
        } else {
            crusherPriceValue.textContent = 'غير محدد - يرجى تحديث أسعار الكسارة';
            crusherPriceValue.style.color = '#d32f2f';
            crusherPriceDisplay.style.display = 'block';
        }
    } else {
        crusherPriceDisplay.style.display = 'none';
    }
}

function setupEventListeners() {
    // Discount fields toggle
    const discountYes = document.getElementById('discountYes');
    const discountNo = document.getElementById('discountNo');
    const deductAmountField = document.getElementById('deductAmountField');

    discountYes.addEventListener('change', () => {
        if (discountYes.checked) {
            deductAmountField.style.display = '';
            document.getElementById('deductAmount').required = true;
        }
    });

    discountNo.addEventListener('change', () => {
        if (discountNo.checked) {
            deductAmountField.style.display = 'none';
            const d = document.getElementById('deductAmount');
            d.required = false;
            d.value = "";
        }
    });

    // Add event listeners for crusher price updates
    document.getElementById('crusher').addEventListener('change', updateCrusherPrice);
    document.getElementById('material').addEventListener('change', updateCrusherPrice);

    // Form submission
    document.getElementById('newEntryForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        let valid = true;
        let err = "";

        const requiredFields = [
            { id: 'client', msg: 'يرجى اختيار العميل' },
            { id: 'material', msg: 'يرجى اختيار نوع المادة' },
            { id: 'crusher', msg: 'يرجى اختيار الكسارة' },
            { id: 'voucher', msg: 'يرجى إدخال رقم البون' },
            { id: 'wheelContractor', msg: 'يرجى اختيار مقاول النقل' },
            { id: 'driver', msg: 'يرجى إدخال اسم السائق' },
            { id: 'carHead', msg: 'يرجى إدخال رقم الرأس' },
            { id: 'carTail', msg: 'يرجى إدخال رقم المقطورة' },
            { id: 'quantity', msg: 'يرجى إدخال كمية الحمولة', type: 'number' },
            { id: 'price', msg: 'يرجى إدخال السعر', type: 'number' },
            { id: 'carVolume', msg: 'يرجى إدخال تكعيب السيارة', type: 'number' }
        ];

        if (discountYes.checked) {
            requiredFields.push({ id: 'deductAmount', msg: 'يرجى تحديد قيمة الخصم', type: 'number' });
        }

        for (const f of requiredFields) {
            const el = document.getElementById(f.id);
            if (!el || !el.value || (el.value.trim && !el.value.trim())) {
                valid = false;
                err = f.msg;
                break;
            }
            if (f.type === 'number' && (isNaN(parseFloat(el.value)) || parseFloat(el.value) <= 0)) {
                valid = false;
                err = f.msg;
                break;
            }
        }

        const crusherId = document.getElementById('crusher').value;
        const material = document.getElementById('material').value;
        const crusherPrice = getCrusherPriceByMaterial(crusherId, material);

        // Validate that crusher price is available
        if (!crusherPrice || crusherPrice <= 0) {
            valid = false;
            err = 'سعر المادة غير محدد في الكسارة المختارة. يرجى تحديث أسعار الكسارة أولاً.';
        }

        const errorDiv = document.getElementById('formError');
        if (!valid) {
            errorDiv.textContent = err;
            errorDiv.style.display = "block";
            return false;
        }
        errorDiv.style.display = "none";

        const payload = {
            client_id: document.getElementById('client').value,
            crusher_id: crusherId || null,
            contractor_id: document.getElementById('wheelContractor').value || null,
            material: material,
            voucher: document.getElementById('voucher').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            discount_volume: discountYes.checked ? (parseFloat(document.getElementById('deductAmount').value) || 0) : 0,
            price_per_meter: parseFloat(document.getElementById('price').value),
            material_price_at_time: crusherPrice, // Use actual crusher price for historical preservation
            driver_name: document.getElementById('driver').value,
            car_head: document.getElementById('carHead').value,
            car_tail: document.getElementById('carTail').value,
            car_volume: parseFloat(document.getElementById('carVolume').value) || null,
            contractor_charge_per_meter: parseFloat(document.getElementById('contractorCharge').value) || 0
        };

        try {
            const resp = await fetch(`${API_BASE}/deliveries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(msg || 'فشل الحفظ');
            }

            await Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم حفظ التسليم بنجاح',
                confirmButtonText: 'حسناً'
            });

            // Reset form but preserve dropdown selections
            const preservedValues = {
                client: document.getElementById('client').value,
                crusher: document.getElementById('crusher').value,
                wheelContractor: document.getElementById('wheelContractor').value
            };

            this.reset();

            // Restore preserved values
            document.getElementById('client').value = preservedValues.client;
            document.getElementById('crusher').value = preservedValues.crusher;
            document.getElementById('wheelContractor').value = preservedValues.wheelContractor;

            // Hide discount field and reset crusher price display
            deductAmountField.style.display = 'none';
            document.getElementById('deductAmount').required = false;
            updateCrusherPrice(); // Update crusher price display after form reset

        } catch (errResp) {
            console.error(errResp);
            errorDiv.textContent = 'تعذر حفظ التسليم';
            errorDiv.style.display = "block";
        }

        return false;
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDropdowns();
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadDropdowns();

    // Auto refresh dropdowns every 30 seconds
    setInterval(() => {
        loadDropdowns();
    }, 30000);
});