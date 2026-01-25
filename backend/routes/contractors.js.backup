const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

async function getContractor(id) {
    return db('contractors').where({ id }).first();
}

async function computeContractorTotals(contractorId) {
    // Calculate total entitlements - contractor_total_charge is the STORED calculated amount (quantity × rate)
    // CRITICAL: Always use contractor_total_charge which was calculated at delivery time
    const [{ sum: totalTrips }] = await db('deliveries')
        .where({ contractor_id: contractorId })
        .sum({ sum: 'contractor_total_charge' });

    const [{ sum: paymentsSum }] = await db('contractor_payments')
        .where({ contractor_id: contractorId })
        .sum({ sum: 'amount' });

    const [{ sum: adjustmentsSum }] = await db('adjustments')
        .where({ entity_type: 'contractor', entity_id: contractorId })
        .sum({ sum: 'amount' });

    const contractor = await getContractor(contractorId);
    const opening = contractor ? toNumber(contractor.opening_balance) : 0;

    const totalPayments = toNumber(paymentsSum);
    const totalAdjustments = toNumber(adjustmentsSum);

    // CORRECTED LOGIC FOR CONTRACTORS:
    // What contractor earned from deliveries + adjustments in his favor
    const totalEarned = toNumber(totalTrips) + totalAdjustments;
    
    // What we paid to contractor (payments + advance payments if opening balance is negative)
    const totalPaidToContractor = totalPayments + Math.abs(Math.min(opening, 0));
    
    // What contractor owes us (if opening balance is positive)
    const contractorOwesUs = Math.max(opening, 0);
    
    // Net balance: what contractor earned - what we paid + what he owes us
    const balance = totalEarned - totalPaidToContractor + contractorOwesUs;

    return {
        openingBalance: opening,
        totalTrips: toNumber(totalTrips),
        totalPayments,
        totalAdjustments,
        balance: balance
    };
}

// List contractors with balances
router.get('/', async (req, res, next) => {
    try {
        const contractors = await db('contractors')
            .select('id', 'name', 'opening_balance', 'created_at')
            .orderBy('id', 'desc');

        const enriched = await Promise.all(
            contractors.map(async (c) => {
                const totals = await computeContractorTotals(c.id);
                return { ...c, ...totals };
            })
        );

        res.json(enriched);
    } catch (err) {
        next(err);
    }
});

// Create contractor
router.post('/', async (req, res, next) => {
    try {
        const { name, opening_balance } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }

        const [id] = await db('contractors').insert({
            name: name.trim(),
            opening_balance: toNumber(opening_balance)
        });

        const contractor = await getContractor(id);
        res.status(201).json(contractor);
    } catch (err) {
        next(err);
    }
});

// Update contractor basic information
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, opening_balance } = req.body;
        
        // Check if contractor exists
        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }
        
        // Update contractor data
        const updateData = {
            name: name.trim(),
            opening_balance: toNumber(opening_balance)
        };
        
        await db('contractors').where('id', id).update(updateData);
        
        // Return updated contractor
        const updatedContractor = await getContractor(id);
        res.json(updatedContractor);
        
    } catch (err) {
        console.error('Error updating contractor:', err);
        next(err);
    }
});

// Contractor details
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        const totals = await computeContractorTotals(id);

        const deliveries = await db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'cr.name as crusher_name'
            )
            .where('d.contractor_id', id)
            .orderBy('d.created_at', 'desc');

        const payments = await db('contractor_payments')
            .where({ contractor_id: id })
            .orderBy('paid_at', 'desc');

        const adjustments = await db('adjustments')
            .where({ entity_type: 'contractor', entity_id: id })
            .orderBy('created_at', 'desc');

        res.json({ contractor, totals, deliveries, payments, adjustments });
    } catch (err) {
        next(err);
    }
});

// Add contractor payment (advance or settlement)
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, note, paid_at, method, details, payment_image } = req.body;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'المبلغ غير صالح' });
        }

        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        const [paymentId] = await db('contractor_payments').insert({
            contractor_id: id,
            amount: toNumber(amount),
            note: note || null,
            method: method || 'نقدي', // contractor_payments uses 'method'
            details: details || null,
            payment_image: payment_image || null,
            paid_at: paid_at || db.fn.now()
        });

        const payment = await db('contractor_payments').where({ id: paymentId }).first();
        res.status(201).json(payment);
    } catch (err) {
        next(err);
    }
});

// Update contractor payment
router.put('/:id/payments/:paymentId', async (req, res) => {
    try {
        const { id: contractorId, paymentId } = req.params;
        const { amount, method, paid_at, note, details, payment_image } = req.body;
        
        const paymentData = {
            amount: parseFloat(amount),
            method: method || 'نقدي', // contractor_payments uses 'method'
            paid_at: paid_at || new Date().toISOString().split('T')[0],
            note: note || null,
            details: details || null,
            payment_image: payment_image || null
        };
        
        console.log('Updating contractor payment with data:', paymentData);
        
        const updated = await db('contractor_payments')
            .where({ id: paymentId, contractor_id: contractorId })
            .update(paymentData);
            
        if (updated === 0) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }
        
        const payment = await db('contractor_payments').where('id', paymentId).first();
        res.json(payment);
        
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ message: 'خطأ في تحديث الدفعة: ' + error.message });
    }
});

// Delete contractor payment
router.delete('/:id/payments/:paymentId', async (req, res) => {
    try {
        const { id: contractorId, paymentId } = req.params;
        
        const deleted = await db('contractor_payments')
            .where({ id: paymentId, contractor_id: contractorId })
            .del();
            
        if (deleted === 0) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }
        
        res.json({ message: 'تم حذف الدفعة بنجاح' });
        
    } catch (error) {
        console.error('Delete payment error:', error);
        res.status(500).json({ message: 'خطأ في حذف الدفعة' });
    }
});

// Add contractor adjustment
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason, method, details } = req.body;
        if (!amount || isNaN(amount) || Number(amount) === 0) {
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }

        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        const [adjId] = await db('adjustments').insert({
            entity_type: 'contractor',
            entity_id: id,
            amount: toNumber(amount),
            reason: reason || null,
            method: method || null,
            details: details || null,
            created_at: db.fn.now()
        });

        const adjustment = await db('adjustments').where({ id: adjId }).first();
        res.status(201).json(adjustment);
    } catch (err) {
        next(err);
    }
});

// Update contractor adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res) => {
    try {
        const { id: contractorId, adjustmentId } = req.params;
        const { amount, reason, method, details } = req.body;
        
        const adjustmentData = {
            amount: parseFloat(amount),
            reason: reason || null,
            method: method || null,
            details: details || null
        };
        
        const updated = await db('adjustments')
            .where({ id: adjustmentId, entity_type: 'contractor', entity_id: contractorId })
            .update(adjustmentData);
            
        if (updated === 0) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }
        
        const adjustment = await db('adjustments').where('id', adjustmentId).first();
        res.json(adjustment);
        
    } catch (error) {
        console.error('Update adjustment error:', error);
        res.status(500).json({ message: 'خطأ في تحديث التسوية: ' + error.message });
    }
});

// Delete contractor adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res) => {
    try {
        const { id: contractorId, adjustmentId } = req.params;
        
        const deleted = await db('adjustments')
            .where({ id: adjustmentId, entity_type: 'contractor', entity_id: contractorId })
            .del();
            
        if (deleted === 0) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }
        
        res.json({ message: 'تم حذف التسوية بنجاح' });
        
    } catch (error) {
        console.error('Delete adjustment error:', error);
        res.status(500).json({ message: 'خطأ في حذف التسوية' });
    }
});

// Generate deliveries report PDF
router.get('/:id/reports/deliveries', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        
        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        // Get deliveries for the specified period
        let deliveriesQuery = db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'cr.name as crusher_name'
            )
            .where('d.contractor_id', id)
            .orderBy('d.created_at', 'asc');

        if (from && to) {
            deliveriesQuery = deliveriesQuery.whereBetween('d.created_at', [from + ' 00:00:00', to + ' 23:59:59']);
        }

        const deliveries = await deliveriesQuery;

        // Generate HTML for PDF
        const html = generateDeliveriesReportHTML(contractor, deliveries, from, to);
        
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
        
        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        // Get data for the specified period
        let deliveriesQuery = db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'cr.name as crusher_name'
            )
            .where('d.contractor_id', id);

        let paymentsQuery = db('contractor_payments').where('contractor_id', id);
        let adjustmentsQuery = db('adjustments').where({ entity_type: 'contractor', entity_id: id });

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
        const totalTrips = deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0);
        const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        
        // Get opening balance (always from contractor record)
        const openingBalance = contractor.opening_balance || 0;
        
        // CORRECTED LOGIC FOR CONTRACTORS:
        // What contractor earned from deliveries + adjustments in his favor
        const totalEarned = totalTrips + totalAdjustments;
        
        // What we paid to contractor (payments + advance payments if opening balance is negative)
        const totalPaidToContractor = totalPayments + Math.abs(Math.min(openingBalance, 0));
        
        // What contractor owes us (if opening balance is positive)
        const contractorOwesUs = Math.max(openingBalance, 0);
        
        // Net balance: what contractor earned - what we paid + what he owes us
        const balance = totalEarned - totalPaidToContractor + contractorOwesUs;
        
        const totals = {
            openingBalance,
            totalTrips,
            totalPayments,
            totalAdjustments,
            balance
        };

        // Create date range text
        const dateRangeText = from && to ? 
            `من ${new Date(from).toLocaleDateString('ar-EG')} إلى ${new Date(to).toLocaleDateString('ar-EG')}` : 
            'جميع الفترات';

        // Generate HTML for PDF
        const html = generateAccountStatementHTML(contractor, deliveries, payments, adjustments, totals, dateRangeText);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        next(err);
    }
});

function generateDeliveriesReportHTML(contractor, deliveries, fromDate, toDate) {
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';
    const formatQuantity = (amount) => Number(amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) + ' م³';
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');
    
    const dateRangeText = fromDate && toDate ? 
        `من ${formatDate(fromDate)} إلى ${formatDate(toDate)}` : 
        'جميع الفترات';

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>تقرير مشاوير المقاول - ${contractor.name}</title>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .header { text-align: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
            .contractor-name { font-size: 18px; color: #e74c3c; margin-bottom: 5px; }
            .date-range { font-size: 14px; color: #7f8c8d; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .summary-item { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary-value { font-size: 18px; font-weight: bold; color: #2c3e50; }
            .summary-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
            .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th { background: #34495e; color: white; padding: 12px; text-align: center; font-size: 14px; }
            .table td { padding: 10px; text-align: center; border-bottom: 1px solid #ecf0f1; font-size: 13px; }
            .table tr:nth-child(even) { background: #f8f9fa; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #7f8c8d; }
            .print-btn { position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000; }
            .print-btn:hover { background: #0056b3; }
            @media print { .print-btn { display: none; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">شركة المواد الإنشائية</div>
            <div class="report-title">تقرير مشاوير المقاول</div>
            <div class="contractor-name">${contractor.name}</div>
            <div class="date-range">${dateRangeText}</div>
        </div>

        <button class="print-btn" onclick="window.print()" style="position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000;">🖨️ طباعة التقرير</button>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-value">${deliveries.length}</div>
                <div class="summary-label">عدد المشاوير</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatQuantity(deliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0))}</div>
                <div class="summary-label">إجمالي الكمية</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0))}</div>
                <div class="summary-label">إجمالي المستحقات</div>
            </div>
        </div>

        ${deliveries.length > 0 ? `
        <div class="section">
            <div class="section-title">📋 تفاصيل المشاوير</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>العميل</th>
                        <th>الكسارة</th>
                        <th>المادة</th>
                        <th>رقم البون</th>
                        <th>كمية الحمولة</th>
                        <th>سعر المتر</th>
                        <th>مستحق المقاول</th>
                    </tr>
                </thead>
                <tbody>
                    ${deliveries.map(d => `
                    <tr>
                        <td>${formatDate(d.created_at)}</td>
                        <td>${d.client_name || '-'}</td>
                        <td>${d.crusher_name || '-'}</td>
                        <td>${d.material || '-'}</td>
                        <td>${d.voucher || '-'}</td>
                        <td>${formatQuantity(d.quantity || 0)}</td>
                        <td>${formatCurrency(d.contractor_charge_per_meter || 0)}</td>
                        <td>${formatCurrency(d.contractor_total_charge || 0)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<div class="section"><div class="section-title">لا توجد مشاوير في هذه الفترة</div></div>'}

        <div class="footer">
            تم إنشاء هذا التقرير في ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
        </div>
    </body>
    </html>
    `;
}

function generateAccountStatementHTML(contractor, deliveries, payments, adjustments, totals, dateRangeText) {
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>كشف حساب المقاول - ${contractor.name}</title>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .header { text-align: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
            .contractor-name { font-size: 18px; color: #e74c3c; margin-bottom: 5px; }
            .date-range { font-size: 14px; color: #7f8c8d; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .summary-item { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary-value { font-size: 18px; font-weight: bold; }
            .summary-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
            .balance-positive { color: #27ae60; }
            .balance-negative { color: #e74c3c; }
            .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th { background: #34495e; color: white; padding: 12px; text-align: center; font-size: 14px; }
            .table td { padding: 10px; text-align: center; border-bottom: 1px solid #ecf0f1; font-size: 13px; }
            .table tr:nth-child(even) { background: #f8f9fa; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #7f8c8d; }
            .print-btn { position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000; }
            .print-btn:hover { background: #0056b3; }
            @media print { .print-btn { display: none; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">شركة المواد الإنشائية</div>
            <div class="report-title">كشف حساب المقاول</div>
            <div class="contractor-name">${contractor.name}</div>
            <div class="date-range">${dateRangeText}</div>
        </div>

        <button class="print-btn" onclick="window.print()" style="position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000;">🖨️ طباعة كشف الحساب</button>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-value ${(totals.openingBalance || 0) > 0 ? 'balance-negative' : (totals.openingBalance || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.openingBalance || 0))}</div>
                <div class="summary-label">الرصيد الافتتاحي ${(totals.openingBalance || 0) > 0 ? '(مستحق للمقاول)' : (totals.openingBalance || 0) < 0 ? '(مستحق لنا)' : '(متوازن)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-negative">${formatCurrency(totals.totalTrips || 0)}</div>
                <div class="summary-label">إجمالي مستحقات المشاوير</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.totalAdjustments || 0) >= 0 ? 'balance-negative' : 'balance-positive'}">${formatCurrency(Math.abs(totals.totalAdjustments || 0))}</div>
                <div class="summary-label">التسويات ${(totals.totalAdjustments || 0) >= 0 ? '(للمقاول)' : '(على المقاول)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-positive">${formatCurrency(totals.totalPayments || 0)}</div>
                <div class="summary-label">المدفوع للمقاول</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.balance || 0) > 0 ? 'balance-negative' : (totals.balance || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.balance || 0))}</div>
                <div class="summary-label">الرصيد الصافي ${(totals.balance || 0) > 0 ? '(مستحق للمقاول)' : (totals.balance || 0) < 0 ? '(مستحق لنا)' : '(متوازن)'}</div>
            </div>
        </div>

        ${deliveries.length > 0 ? `
        <div class="section">
            <div class="section-title">🚛 المشاوير</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>العميل</th>
                        <th>الكسارة</th>
                        <th>المادة</th>
                        <th>كمية الحمولة</th>
                        <th>سعر المتر</th>
                        <th>مستحق المقاول</th>
                    </tr>
                </thead>
                <tbody>
                    ${deliveries.map(d => `
                    <tr>
                        <td>${formatDate(d.created_at)}</td>
                        <td>${d.client_name || '-'}</td>
                        <td>${d.crusher_name || '-'}</td>
                        <td>${d.material || '-'}</td>
                        <td>${Number(d.quantity || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} م³</td>
                        <td>${formatCurrency(d.contractor_charge_per_meter || 0)}</td>
                        <td>${formatCurrency(d.contractor_total_charge || 0)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${payments.length > 0 ? `
        <div class="section">
            <div class="section-title">💰 المدفوعات</div>
            <table class="table">
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
                        <td>${formatCurrency(p.amount)}</td>
                        <td>${p.method || '-'}</td>
                        <td>${p.details || '-'}</td>
                        <td>${p.note || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${adjustments.length > 0 ? `
        <div class="section">
            <div class="section-title">⚖️ التسويات والتعديلات</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>المبلغ</th>
                        <th>طريقة التسوية</th>
                        <th>السبب</th>
                        <th>التفاصيل</th>
                    </tr>
                </thead>
                <tbody>
                    ${adjustments.map(a => {
                        const amount = Number(a.amount || 0);
                        const isPositive = amount >= 0;
                        return `
                        <tr>
                            <td>${formatDate(a.created_at)}</td>
                            <td class="${isPositive ? 'balance-negative' : 'balance-positive'}">${formatCurrency(Math.abs(amount))} ${isPositive ? '(إضافة)' : '(خصم)'}</td>
                            <td>${a.method || '-'}</td>
                            <td>${a.reason || '-'}</td>
                            <td>${a.details || '-'}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            تم إنشاء هذا الكشف في ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
        </div>
    </body>
    </html>
    `;
}

// Delete contractor (with conflict checking)
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const contractor = await getContractor(id);
        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }
        
        // Check for conflicts - deliveries
        const deliveriesCount = await db('deliveries').where('contractor_id', id).count('id as count').first();
        if (deliveriesCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف المقاول "${contractor.name}" لأنه مرتبط بـ ${deliveriesCount.count} تسليمة. يجب حذف التسليمات أولاً.`,
                conflict: 'deliveries',
                count: deliveriesCount.count
            });
        }
        
        // Check for conflicts - payments
        const paymentsCount = await db('contractor_payments').where('contractor_id', id).count('id as count').first();
        if (paymentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف المقاول "${contractor.name}" لأنه مرتبط بـ ${paymentsCount.count} دفعة. يجب حذف المدفوعات أولاً.`,
                conflict: 'payments',
                count: paymentsCount.count
            });
        }
        
        // Check for conflicts - adjustments
        const adjustmentsCount = await db('adjustments').where({ entity_type: 'contractor', entity_id: id }).count('id as count').first();
        if (adjustmentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف المقاول "${contractor.name}" لأنه مرتبط بـ ${adjustmentsCount.count} تسوية. يجب حذف التسويات أولاً.`,
                conflict: 'adjustments',
                count: adjustmentsCount.count
            });
        }
        
        // If no conflicts, delete the contractor
        await db('contractors').where('id', id).del();
        
        res.json({ 
            message: `تم حذف المقاول "${contractor.name}" بنجاح`,
            deletedContractor: contractor
        });
        
    } catch (err) {
        console.error('Delete contractor error:', err);
        res.status(500).json({ message: 'خطأ في حذف المقاول: ' + err.message });
    }
});

module.exports = router;
