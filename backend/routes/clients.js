const express = require('express');
const db = require('../db');
const ApiFeatures = require('../controllers/apiFeatures');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Helper function for date formatting
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

async function getClient(id) {
    return db('clients').where({ id }).first();
}

async function computeClientTotals(clientId) {
    const [{ sum: deliveriesSum }] = await db('deliveries')
        .where({ client_id: clientId })
        .sum({ sum: 'total_value' });

    const [{ sum: paymentsSum }] = await db('payments')
        .where({ client_id: clientId })
        .sum({ sum: 'amount' });

    const [{ sum: adjustmentsSum }] = await db('adjustments')
        .where({ entity_type: 'client', entity_id: clientId })
        .sum({ sum: 'amount' });

    const client = await getClient(clientId);
    const opening = client ? toNumber(client.opening_balance) : 0;

    const totalDeliveries = toNumber(deliveriesSum);
    const totalPayments = toNumber(paymentsSum);
    const totalAdjustments = toNumber(adjustmentsSum);

    return {
        openingBalance: opening,
        totalDeliveries,
        totalPayments,
        totalAdjustments,
        balance: opening + totalDeliveries + totalAdjustments - totalPayments
    };
}

// Get all clients with balances, supporting search, filter, sort, pagination
router.get('/', async (req, res, next) => {
    try {
        const baseQuery = db('clients').select('id', 'name', 'phone', 'opening_balance');
        const features = new ApiFeatures(baseQuery, req.query);
        await features
            .search(['name', 'phone'])
            .filter(['id'])
            .sort('-id')
            .paginate(25);

        const { data: clients, pagination } = await features.get();

        const enriched = await Promise.all(
            clients.map(async (client) => {
                const totals = await computeClientTotals(client.id);
                return { ...client, ...totals };
            })
        );

        res.json({ data: enriched, pagination });
    } catch (err) {
        next(err);
    }
});

// Create a new client
router.post('/', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }

        const [id] = await db('clients').insert({
            name: name.trim(),
            phone: phone || null,
            opening_balance: toNumber(opening_balance)
        });

        console.log('Client created:', { id, name: name.trim() });

        const created = await getClient(id);
        res.status(201).json(created);
    } catch (err) {
        console.error('Error creating client:', err);
        next(err);
    }
});

// Update client basic information
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, opening_balance } = req.body;
        
        // Check if client exists
        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }
        
        // Update client data
        const updateData = {
            name: name.trim(),
            phone: phone || null,
            opening_balance: toNumber(opening_balance)
        };
        
        await db('clients').where('id', id).update(updateData);
        
        // Return updated client
        const updatedClient = await getClient(id);
        res.json(updatedClient);
        
    } catch (err) {
        console.error('Error updating client:', err);
        next(err);
    }
});

// Client details with deliveries, payments, adjustments, and material totals
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        const totals = await computeClientTotals(id);

        const deliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
            .select(
                'd.*',
                'c.name as crusher_name',
                'ct.name as contractor_name'
            )
            .where('d.client_id', id)
            .orderBy('d.created_at', 'desc');

        deliveries.forEach(d => {
            // Use stored total_value or calculate correctly (quantity - discount) * price
            const price = Number(d.price_per_meter || 0);
            const qty = Number(d.quantity || 0);
            const discount = Number(d.discount_volume || 0);
            const netQty = Math.max(qty - discount, 0);
            
            // Use stored value if available, otherwise calculate correctly
            if (!d.total_value || d.total_value === 0) {
                d.total_value = netQty * price;
            }
        });

        // Calculate material totals with normalized material names
        const materialMap = {};
        deliveries.forEach(d => {
            // Normalize material names
            let normalizedMaterial = (d.material || 'غير محدد').toString().trim();
            switch (normalizedMaterial) {
                case 'سن1':
                    normalizedMaterial = 'سن 1';
                    break;
                case 'سن2':
                    normalizedMaterial = 'سن 2';
                    break;
                case 'سن3':
                    normalizedMaterial = 'سن 3';
                    break;
            }
            
            if (!materialMap[normalizedMaterial]) materialMap[normalizedMaterial] = { totalQty: 0, totalValue: 0 };
            materialMap[normalizedMaterial].totalQty += Number(d.quantity || 0);
            materialMap[normalizedMaterial].totalValue += Number(d.total_value || 0);
        });
        const materialTotals = Object.keys(materialMap).map(k => ({ material: k, ...materialMap[k] }));
        materialTotals.sort((a, b) => b.totalQty - a.totalQty);

        const payments = await db('payments')
            .where({ client_id: id })
            .orderBy('paid_at', 'desc');

        const adjustments = await db('adjustments')
            .where({ entity_type: 'client', entity_id: id })
            .orderBy('created_at', 'desc');

        res.json({ client, totals, deliveries, payments, adjustments, materialTotals });
    } catch (err) {
        next(err);
    }
});

// Add client payment
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, note, paid_at, method, details, payment_image } = req.body;

        console.log('Payment request received:', {
            clientId: id,
            amount,
            note,
            method,
            details,
            hasImage: !!payment_image,
            imageLength: payment_image ? payment_image.length : 0
        });

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'المبلغ غير صالح' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Validate unique payment details for specific methods
        if (details && ['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(method)) {
            // Check in payments table
            const existingClientPayment = await db('payments')
                .where({ details, method })
                .first();
                
            // Check in crusher_payments table
            const existingCrusherPayment = await db('crusher_payments')
                .where({ payment_method: method })
                .whereRaw('note LIKE ?', [`%${details}%`])
                .first();
                
            // Check in contractor_payments table
            const existingContractorPayment = await db('contractor_payments')
                .whereRaw('note LIKE ?', [`%${details}%`])
                .first();
                
            // Check in adjustments table
            const existingAdjustment = await db('adjustments')
                .where({ details, method })
                .first();

            if (existingClientPayment || existingCrusherPayment || existingContractorPayment || existingAdjustment) {
                let errorMsg = '';
                if (method === 'شيك') {
                    errorMsg = `رقم الشيك ${details} مستخدم من قبل`;
                } else if (method === 'بنكي') {
                    errorMsg = `رقم الحوالة البنكية ${details} مستخدم من قبل`;
                } else {
                    errorMsg = `رقم المعاملة ${details} مستخدم من قبل`;
                }
                return res.status(400).json({ message: errorMsg });
            }
        }

        const [paymentId] = await db('payments').insert({
            client_id: id,
            amount: toNumber(amount),
            note: note || null,
            method: method || null,
            details: details || null,
            payment_image: payment_image || null,
            paid_at: paid_at || db.fn.now()
        });

        console.log('Payment inserted successfully with ID:', paymentId);

        const payment = await db('payments').where({ id: paymentId }).first();
        res.status(201).json(payment);
    } catch (err) {
        console.error('Payment insertion error:', err);
        console.error('Error details:', {
            message: err.message,
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage
        });
        next(err);
    }
});

// Add client adjustment (positive or negative)
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason, method, details, payment_image } = req.body;
        if (!amount || isNaN(amount) || Number(amount) === 0) {
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Validate unique payment details for specific methods
        if (details && ['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(method)) {
            // Check in payments table
            const existingClientPayment = await db('payments')
                .where({ details, method })
                .first();
                
            // Check in crusher_payments table
            const existingCrusherPayment = await db('crusher_payments')
                .where({ payment_method: method })
                .whereRaw('note LIKE ?', [`%${details}%`])
                .first();
                
            // Check in contractor_payments table
            const existingContractorPayment = await db('contractor_payments')
                .whereRaw('note LIKE ?', [`%${details}%`])
                .first();
                
            // Check in adjustments table
            const existingAdjustment = await db('adjustments')
                .where({ details, method })
                .first();

            if (existingClientPayment || existingCrusherPayment || existingContractorPayment || existingAdjustment) {
                let errorMsg = '';
                if (method === 'شيك') {
                    errorMsg = `رقم الشيك ${details} مستخدم من قبل`;
                } else if (method === 'بنكي') {
                    errorMsg = `رقم الحوالة البنكية ${details} مستخدم من قبل`;
                } else {
                    errorMsg = `رقم المعاملة ${details} مستخدم من قبل`;
                }
                return res.status(400).json({ message: errorMsg });
            }
        }

        const [adjId] = await db('adjustments').insert({
            entity_type: 'client',
            entity_id: id,
            amount: toNumber(amount),
            reason: reason || null,
            method: method || null,
            details: details || null,
            payment_image: payment_image || null,
            created_at: db.fn.now()
        });

        const adjustment = await db('adjustments').where({ id: adjId }).first();
        res.status(201).json(adjustment);
    } catch (err) {
        next(err);
    }
});

// Update client payment
router.put('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { id, paymentId } = req.params;
        const { amount, note, paid_at, method, details, payment_image } = req.body;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'المبلغ غير صالح' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Check if payment exists
        const existingPayment = await db('payments').where({ id: paymentId, client_id: id }).first();
        if (!existingPayment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        const updateData = {
            amount: toNumber(amount),
            note: note || null,
            method: method || null,
            details: details || null,
            paid_at: paid_at || db.fn.now()
        };

        // Only update image if provided
        if (payment_image !== undefined) {
            updateData.payment_image = payment_image;
        }

        await db('payments').where({ id: paymentId }).update(updateData);

        const updatedPayment = await db('payments').where({ id: paymentId }).first();
        res.json(updatedPayment);
    } catch (err) {
        next(err);
    }
});

// Delete client payment
router.delete('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { id, paymentId } = req.params;

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Check if payment exists
        const existingPayment = await db('payments').where({ id: paymentId, client_id: id }).first();
        if (!existingPayment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        await db('payments').where({ id: paymentId }).del();
        res.json({ message: 'تم حذف الدفعة بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Update client adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { id, adjustmentId } = req.params;
        const { amount, reason, method, details, payment_image } = req.body;
        
        if (!amount || isNaN(amount) || Number(amount) === 0) {
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Check if adjustment exists
        const existingAdjustment = await db('adjustments').where({ 
            id: adjustmentId, 
            entity_type: 'client', 
            entity_id: id 
        }).first();
        if (!existingAdjustment) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }

        const updateData = {
            amount: toNumber(amount),
            reason: reason || null,
            method: method || null,
            details: details || null
        };

        // Only update image if provided
        if (payment_image !== undefined) {
            updateData.payment_image = payment_image;
        }

        await db('adjustments').where({ id: adjustmentId }).update(updateData);

        const updatedAdjustment = await db('adjustments').where({ id: adjustmentId }).first();
        res.json(updatedAdjustment);
    } catch (err) {
        next(err);
    }
});

// Delete client adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { id, adjustmentId } = req.params;

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Check if adjustment exists
        const existingAdjustment = await db('adjustments').where({ 
            id: adjustmentId, 
            entity_type: 'client', 
            entity_id: id 
        }).first();
        if (!existingAdjustment) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }

        await db('adjustments').where({ id: adjustmentId }).del();
        res.json({ message: 'تم حذف التسوية بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Generate deliveries report PDF
router.get('/:id/reports/deliveries', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        
        if (!from || !to) {
            return res.status(400).json({ message: 'تاريخ البداية والنهاية مطلوبان' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        const deliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .select(
                'd.material',
                'd.quantity',
                'd.created_at',
                'd.voucher',
                'd.price_per_meter',
                'c.name as crusher_name'
            )
            .where('d.client_id', id)
            .whereBetween('d.created_at', [from + ' 00:00:00', to + ' 23:59:59'])
            .orderBy('d.created_at', 'desc');

        // Group by material with normalized names
        const materialTotals = {};
        deliveries.forEach(d => {
            // Normalize material names
            let normalizedMaterial = (d.material || 'غير محدد').toString().trim();
            switch (normalizedMaterial) {
                case 'سن1':
                    normalizedMaterial = 'سن 1';
                    break;
                case 'سن2':
                    normalizedMaterial = 'سن 2';
                    break;
                case 'سن3':
                    normalizedMaterial = 'سن 3';
                    break;
            }
            
            if (!materialTotals[normalizedMaterial]) {
                materialTotals[normalizedMaterial] = { quantity: 0, value: 0, count: 0 };
            }
            materialTotals[normalizedMaterial].quantity += Number(d.quantity || 0);
            materialTotals[normalizedMaterial].value += Number(d.quantity || 0) * Number(d.price_per_meter || 0);
            materialTotals[normalizedMaterial].count += 1;
        });

        // Generate HTML for PDF
        const html = generateDeliveriesReportHTML(client, deliveries, materialTotals, from, to);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        next(err);
    }
});

// Generate account statement PDF
router.get('/:id/reports/statement', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        let deliveriesQuery = db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .select('d.*', 'c.name as crusher_name')
            .where('d.client_id', id);

        let paymentsQuery = db('payments').where('client_id', id);
        let adjustmentsQuery = db('adjustments').where({ entity_type: 'client', entity_id: id });

        // Apply date filters if provided
        if (from && to) {
            deliveriesQuery = deliveriesQuery.whereBetween('d.created_at', [from + ' 00:00:00', to + ' 23:59:59']);
            paymentsQuery = paymentsQuery.whereBetween('paid_at', [from + ' 00:00:00', to + ' 23:59:59']);
            adjustmentsQuery = adjustmentsQuery.whereBetween('created_at', [from + ' 00:00:00', to + ' 23:59:59']);
        }

        const deliveries = await deliveriesQuery.orderBy('d.created_at', 'asc');
        const payments = await paymentsQuery.orderBy('paid_at', 'asc');
        const adjustments = await adjustmentsQuery.orderBy('created_at', 'asc');

        // Calculate totals from filtered data
        const totalDeliveries = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
        const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        
        // Get opening balance (always from client record)
        const openingBalance = Number(client.opening_balance || 0);
        
        // Calculate final balance
        // Positive opening balance = client owes us
        // Deliveries = client owes us more
        // Payments = client paid us (reduces what they owe)
        // Adjustments = can be positive (client owes more) or negative (we owe client)
        const balance = openingBalance + totalDeliveries - totalPayments + totalAdjustments;
        
        const totals = {
            openingBalance,
            totalDeliveries,
            totalPayments,
            totalAdjustments,
            balance
        };

        // Determine date range for display
        let dateRangeText = '';
        if (from && to) {
            dateRangeText = `من ${formatDate(from)} إلى ${formatDate(to)}`;
        } else {
            // Get actual date range from data
            const allDates = [
                ...deliveries.map(d => d.created_at),
                ...payments.map(p => p.paid_at),
                ...adjustments.map(a => a.created_at)
            ].filter(Boolean).sort();
            
            if (allDates.length > 0) {
                const firstDate = allDates[0];
                const lastDate = allDates[allDates.length - 1];
                dateRangeText = `من ${formatDate(firstDate)} إلى ${formatDate(lastDate)}`;
            } else {
                dateRangeText = 'جميع البيانات';
            }
        }

        // Generate HTML for PDF
        const html = generateAccountStatementHTML(client, deliveries, payments, adjustments, totals, dateRangeText);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        next(err);
    }
});

function generateDeliveriesReportHTML(client, deliveries, materialTotals, fromDate, toDate) {
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';
    const formatQuantity = (amount) => Number(amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) + ' م³';

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير التوريدات - ${client.name}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 20px; direction: rtl; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .client-name { font-size: 24px; font-weight: bold; color: #333; }
        .report-title { font-size: 20px; color: #666; margin: 10px 0; }
        .date-range { font-size: 16px; color: #888; }
        .summary { margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6; }
        .summary-value { font-size: 18px; font-weight: bold; color: #007bff; }
        .summary-label { font-size: 14px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .print-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="client-name">${client.name}</div>
        <div class="report-title">تقرير التوريدات المفصل</div>
        <div class="date-range">من ${formatDate(fromDate)} إلى ${formatDate(toDate)}</div>
    </div>
    
    <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>
    
    <div class="summary">
        <h3>ملخص المواد</h3>
        <div class="summary-grid">
            ${Object.keys(materialTotals).map(material => `
                <div class="summary-card">
                    <div class="summary-value">${formatQuantity(materialTotals[material].quantity)}</div>
                    <div class="summary-label">${material}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">
                        ${materialTotals[material].count} تسليمة - ${formatCurrency(materialTotals[material].value)}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    
    <h3>تفاصيل التسليمات</h3>
    <table>
        <thead>
            <tr>
                <th>التاريخ</th>
                <th>نوع المادة</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
                <th>رقم البون</th>
                <th>المقاول</th>
            </tr>
        </thead>
        <tbody>
            ${deliveries.map(d => `
                <tr>
                    <td>${formatDate(d.created_at)}</td>
                    <td>${d.material || '-'}</td>
                    <td>${formatQuantity(d.quantity)}</td>
                    <td>${formatCurrency(d.price_per_meter)}</td>
                    <td>${formatCurrency(Number(d.quantity || 0) * Number(d.price_per_meter || 0))}</td>
                    <td>${d.voucher || '-'}</td>
                    <td>${d.contractor_name || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        تم إنشاء هذا التقرير في ${new Date().toLocaleDateString('ar-EG')} - نظام إدارة التوزيع
    </div>
</body>
</html>`;
}

function generateAccountStatementHTML(client, deliveries, payments, adjustments, totals, dateRangeText) {
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';

    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>كشف حساب - ${client.name}</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            margin: 20px; 
            direction: rtl; 
            background: #f8f9fa;
            color: #333;
        }
        .print-button { 
            position: fixed; 
            top: 20px; 
            left: 20px; 
            background: #007bff; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 14px;
            z-index: 1000;
        }
        .print-button:hover { background: #0056b3; }
        @media print {
            .print-button { display: none; }
            body { background: white; margin: 10px; }
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .client-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .report-title { 
            font-size: 22px; 
            color: #27ae60; 
            margin: 10px 0; 
        }
        .date-range { 
            font-size: 16px; 
            color: #7f8c8d;
            background: #ecf0f1;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
        }
        .summary { 
            background: rgb(6, 100, 149);
            color: white;
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        .summary h3 {
            margin: 0 0 20px 0;
            font-size: 20px;
            text-align: center;
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 20px; 
        }
        .summary-item { 
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
        }
        .summary-value { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .summary-label { 
            font-size: 14px; 
            opacity: 0.9;
        }
        .balance-positive { color: #e74c3c; }
        .balance-negative { color: #27ae60; }
        .section { 
            background: white;
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            padding: 20px;
            background: #34495e;
            color: white;
            margin: 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        th, td { 
            border: 1px solid #bdc3c7; 
            padding: 12px 8px; 
            text-align: center; 
        }
        th { 
            background-color: #ecf0f1; 
            font-weight: bold;
            color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #e8f4fd;
        }
        .print-btn { 
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white; 
            padding: 12px 25px; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            margin: 10px;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
            transition: all 0.3s ease;
        }
        .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            color: #7f8c8d;
            font-size: 14px;
        }
        .no-data {
            text-align: center;
            padding: 30px;
            color: #7f8c8d;
            font-style: italic;
        }
        @media print { 
            .print-btn { display: none; }
            body { background: white; }
            .section, .header, .summary { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="client-name">${client.name}</div>
        <div class="report-title">كشف حساب شامل</div>
        <div class="date-range">${dateRangeText}</div>
    </div>
    
    <button class="print-btn" onclick="window.print()">🖨️ طباعة كشف الحساب</button>
    
    <div class="summary">
        <h3>ملخص الحساب الإجمالي</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value ${(totals.openingBalance || 0) > 0 ? 'balance-negative' : (totals.openingBalance || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.openingBalance || 0))}</div>
                <div class="summary-label">الرصيد الافتتاحي ${(totals.openingBalance || 0) > 0 ? '(عليه)' : (totals.openingBalance || 0) < 0 ? '(له)' : '(متوازن)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-negative">${formatCurrency(totals.totalDeliveries || 0)}</div>
                <div class="summary-label">إجمالي التوريدات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-positive">${formatCurrency(totals.totalPayments || 0)}</div>
                <div class="summary-label">المدفوع من العميل</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.totalAdjustments || 0) > 0 ? 'balance-negative' : (totals.totalAdjustments || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.totalAdjustments || 0))}</div>
                <div class="summary-label">التسويات ${(totals.totalAdjustments || 0) > 0 ? '(على العميل)' : (totals.totalAdjustments || 0) < 0 ? '(للعميل)' : '(متوازنة)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.balance || 0) > 0 ? 'balance-negative' : (totals.balance || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.balance || 0))}</div>
                <div class="summary-label">الرصيد الصافي ${(totals.balance || 0) > 0 ? '(عليه)' : (totals.balance || 0) < 0 ? '(له)' : '(متوازن)'}</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h3 class="section-title">📦 التوريدات</h3>
        ${deliveries.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>نوع المادة</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                    <th>رقم البون</th>
                </tr>
            </thead>
            <tbody>
                ${deliveries.map(d => `
                    <tr>
                        <td>${formatDate(d.created_at)}</td>
                        <td>${d.material || '-'}</td>
                        <td>${Number(d.quantity || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} م³</td>
                        <td>${formatCurrency(d.price_per_meter)}</td>
                        <td class="balance-negative"><strong>${formatCurrency(Number(d.quantity || 0) * Number(d.price_per_meter || 0))}</strong></td>
                        <td>${d.voucher || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<div class="no-data">لا توجد توريدات في هذه الفترة</div>'}
    </div>
    
    <div class="section">
        <h3 class="section-title">💰 المدفوعات</h3>
        ${payments.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>طريقة الدفع</th>
                    <th>التفاصيل</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${payments.map(p => `
                    <tr>
                        <td>${formatDate(p.paid_at)}</td>
                        <td class="balance-positive"><strong>${formatCurrency(p.amount)}</strong></td>
                        <td>${p.payment_method || p.method || '-'}</td>
                        <td>${p.details || '-'}</td>
                        <td>${p.note || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<div class="no-data">لا توجد مدفوعات في هذه الفترة</div>'}
    </div>
    
    ${adjustments.length > 0 ? `
    <div class="section">
        <h3 class="section-title">⚖️ التسويات والتعديلات</h3>
        <table>
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>المبلغ</th>
                    <th>النوع</th>
                    <th>السبب</th>
                </tr>
            </thead>
            <tbody>
                ${adjustments.map(a => {
                    const amount = Number(a.amount || 0);
                    const isPositive = amount > 0;
                    return `
                    <tr>
                        <td>${formatDate(a.created_at)}</td>
                        <td class="${isPositive ? 'balance-negative' : 'balance-positive'}">
                            <strong>${formatCurrency(Math.abs(amount))}</strong>
                            <br><small style="font-size: 12px;">${isPositive ? '(على العميل)' : '(للعميل)'}</small>
                        </td>
                        <td>${a.method || 'تعديل حسابي'}</td>
                        <td>${a.reason || '-'}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    <div class="footer">
        <p><strong>تم إنشاء هذا الكشف في:</strong> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        <p>نظام إدارة التوزيع - كشف حساب معتمد</p>
    </div>
</body>
</html>`;
}

// Delete client (with conflict checking)
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }
        
        // Check for conflicts - deliveries
        const deliveriesCount = await db('deliveries').where('client_id', id).count('id as count').first();
        if (deliveriesCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف العميل "${client.name}" لأنه مرتبط بـ ${deliveriesCount.count} تسليمة. يجب حذف التسليمات أولاً.`,
                conflict: 'deliveries',
                count: deliveriesCount.count
            });
        }
        
        // Check for conflicts - payments
        const paymentsCount = await db('payments').where('client_id', id).count('id as count').first();
        if (paymentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف العميل "${client.name}" لأنه مرتبط بـ ${paymentsCount.count} دفعة. يجب حذف المدفوعات أولاً.`,
                conflict: 'payments',
                count: paymentsCount.count
            });
        }
        
        // Check for conflicts - adjustments
        const adjustmentsCount = await db('adjustments').where({ entity_type: 'client', entity_id: id }).count('id as count').first();
        if (adjustmentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف العميل "${client.name}" لأنه مرتبط بـ ${adjustmentsCount.count} تسوية. يجب حذف التسويات أولاً.`,
                conflict: 'adjustments',
                count: adjustmentsCount.count
            });
        }
        
        // If no conflicts, delete the client
        await db('clients').where('id', id).del();
        
        res.json({ 
            message: `تم حذف العميل "${client.name}" بنجاح`,
            deletedClient: client
        });
        
    } catch (err) {
        console.error('Delete client error:', err);
        res.status(500).json({ message: 'خطأ في حذف العميل: ' + err.message });
    }
});

module.exports = router;
