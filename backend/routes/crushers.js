const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

async function getCrusher(id) {
    return db('crushers').where({ id }).first();
}

async function computeCrusherTotals(crusherId) {
    // Get all deliveries for this crusher
    const deliveries = await db('deliveries')
        .where({ crusher_id: crusherId })
        .select('car_volume', 'discount_volume', 'material_price_at_time', 'crusher_total_cost');

    // Calculate total volume (net quantity after discount)
    const totalVolume = deliveries.reduce((sum, d) => {
        const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
        return sum + netQuantity;
    }, 0);

    // Calculate total value WE OWE the crusher (using STORED crusher_total_cost from historical prices)
    // CRITICAL: Always use crusher_total_cost which was calculated at delivery time with historical prices
    const totalRequired = deliveries.reduce((sum, d) => {
        return sum + Number(d.crusher_total_cost || 0);
    }, 0);

    const deliveriesCount = deliveries.length;

    // Get adjustments
    const adjustments = await db('adjustments')
        .where({ entity_type: 'crusher', entity_id: crusherId })
        .select('amount');

    const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);
    
    // Total needed = what we owe the crusher (POSITIVE = WE OWE THEM)
    const totalNeeded = totalRequired + totalAdjustments;

    // Get payments made to crusher
    const [{ sum: paymentsSum }] = await db('crusher_payments')
        .where('crusher_id', crusherId)
        .sum({ sum: 'amount' });

    const totalPaid = toNumber(paymentsSum);
    
    // Net = what we still owe (POSITIVE = WE OWE THEM, NEGATIVE = THEY OWE US)
    const net = totalNeeded - totalPaid;

    return {
        totalVolume: Number(totalVolume.toFixed(3)),
        totalRequired: Number(totalRequired.toFixed(2)), // Base amount we owe
        deliveriesCount,
        totalAdjustments: Number(totalAdjustments.toFixed(2)),
        totalNeeded: Number(totalNeeded.toFixed(2)), // Total after adjustments
        totalPaid: Number(totalPaid.toFixed(2)),
        net: Number(net.toFixed(2)) // POSITIVE = payable to crusher
    };
}

// Get all crushers with totals
router.get('/', async (req, res, next) => {
    try {
        const crushers = await db('crushers')
            .select('id', 'name', 'sand_price', 'aggregate1_price', 'aggregate2_price', 'aggregate3_price', 'created_at')
            .orderBy('id', 'desc');

        const enriched = await Promise.all(
            crushers.map(async (crusher) => {
                const totals = await computeCrusherTotals(crusher.id);
                return { ...crusher, ...totals };
            })
        );

        res.json(enriched);
    } catch (err) {
        next(err);
    }
});

// Create crusher
router.post('/', async (req, res, next) => {
    try {
        const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }
        
        const crusherData = {
            name: name.trim(),
            sand_price: toNumber(sand_price),
            aggregate1_price: toNumber(aggregate1_price),
            aggregate2_price: toNumber(aggregate2_price),
            aggregate3_price: toNumber(aggregate3_price)
        };
        
        const [id] = await db('crushers').insert(crusherData);
        const crusher = await getCrusher(id);
        res.status(201).json(crusher);
    } catch (err) {
        next(err);
    }
});

// Update crusher basic information
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        // Check if crusher exists
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }
        
        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }
        
        // Update crusher data
        const updateData = {
            name: name.trim()
        };
        
        await db('crushers').where('id', id).update(updateData);
        
        // Return updated crusher
        const updatedCrusher = await getCrusher(id);
        res.json(updatedCrusher);
        
    } catch (err) {
        console.error('Error updating crusher:', err);
        next(err);
    }
});

// Crusher details with deliveries
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        const totals = await computeCrusherTotals(id);

        const deliveries = await db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'ct.name as contractor_name'
            )
            .where('d.crusher_id', id)
            .orderBy('d.created_at', 'desc');

        const adjustments = await db('adjustments')
            .where({ entity_type: 'crusher', entity_id: id })
            .orderBy('created_at', 'desc');

        const payments = await db('crusher_payments')
            .where('crusher_id', id)
            .orderBy('paid_at', 'desc');

        // Aggregate totals per material (using car_volume for crusher) with normalized names
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
            // Use car_volume - discount_volume for crusher calculations
            const carVolume = Number(d.car_volume || 0);
            const discount = Number(d.discount_volume || 0);
            const netQtyForCrusher = Math.max(carVolume - discount, 0);
            materialMap[normalizedMaterial].totalQty += netQtyForCrusher;
            materialMap[normalizedMaterial].totalValue += Number(d.crusher_total_cost || 0); // Use crusher cost, not client value
        });
        const materialTotals = Object.keys(materialMap).map(k => ({ material: k, ...materialMap[k] }));
        materialTotals.sort((a, b) => b.totalQty - a.totalQty);

        res.json({ crusher, totals, deliveries, adjustments, payments, materialTotals });
    } catch (err) {
        next(err);
    }
});

// Add crusher adjustment
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason, method, details } = req.body;
        if (!amount || isNaN(amount) || Number(amount) === 0) {
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }

        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        const [adjId] = await db('adjustments').insert({
            entity_type: 'crusher',
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

// Update crusher adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res) => {
    try {
        const { id: crusherId, adjustmentId } = req.params;
        const { amount, reason, method, details } = req.body;
        
        const adjustmentData = {
            amount: parseFloat(amount),
            reason: reason || null,
            method: method || null,
            details: details || null
        };
        
        const updated = await db('adjustments')
            .where({ id: adjustmentId, entity_type: 'crusher', entity_id: crusherId })
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

// Delete crusher adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res) => {
    try {
        const { id: crusherId, adjustmentId } = req.params;
        
        const deleted = await db('adjustments')
            .where({ id: adjustmentId, entity_type: 'crusher', entity_id: crusherId })
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

// Add crusher payment - SIMPLIFIED VERSION
router.post('/:id/payments', async (req, res) => {
    console.log('🔵 Payment route hit - ID:', req.params.id);
    console.log('🔵 Request body:', req.body);
    
    try {
        const crusherId = parseInt(req.params.id);
        const { amount, method, note, date, details } = req.body;
        
        console.log('🔵 Parsed data:', { crusherId, amount, method, note, date, details });
        
        // Basic validation
        if (!amount || amount <= 0) {
            console.log('❌ Invalid amount');
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }
        
        // Check crusher exists
        const crusher = await db('crushers').where('id', crusherId).first();
        if (!crusher) {
            console.log('❌ Crusher not found');
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }
        
        console.log('✅ Crusher found:', crusher.name);
        
        // Simple payment data - Note: crusher_payments uses 'payment_method' not 'method'
        const paymentData = {
            crusher_id: crusherId,
            amount: parseFloat(amount),
            payment_method: method || 'نقدي', // Use payment_method for crushers table
            details: details || null,
            note: note || null,
            paid_at: date || new Date().toISOString().split('T')[0],
            payment_image: req.body.payment_image || null
        };
        
        console.log('💾 Inserting payment:', paymentData);
        
        // Insert payment
        const [payId] = await db('crusher_payments').insert(paymentData);
        
        console.log('✅ Payment inserted with ID:', payId);
        
        // Return success
        const result = { id: payId, ...paymentData };
        console.log('✅ Returning result:', result);
        
        return res.status(201).json(result);
        
    } catch (error) {
        console.error('❌ Payment route error:', error);
        console.error('❌ Error stack:', error.stack);
        
        return res.status(500).json({
            message: 'خطأ في إضافة الدفعة',
            error: error.message
        });
    }
});

// Update crusher payment
router.put('/:id/payments/:paymentId', async (req, res) => {
    try {
        const { id: crusherId, paymentId } = req.params;
        const { amount, method, date, note, details, payment_image } = req.body;
        
        const paymentData = {
            amount: parseFloat(amount),
            payment_method: method || 'نقدي', // Use payment_method for crushers table
            paid_at: date || new Date().toISOString().split('T')[0],
            note: note || null,
            details: details || null,
            payment_image: payment_image || null
        };
        
        console.log('Updating payment with data:', paymentData);
        
        const updated = await db('crusher_payments')
            .where({ id: paymentId, crusher_id: crusherId })
            .update(paymentData);
            
        if (updated === 0) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }
        
        const payment = await db('crusher_payments').where('id', paymentId).first();
        res.json(payment);
        
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ message: 'خطأ في تحديث الدفعة: ' + error.message });
    }
});

// Delete crusher payment
router.delete('/:id/payments/:paymentId', async (req, res) => {
    try {
        const { id: crusherId, paymentId } = req.params;
        
        const deleted = await db('crusher_payments')
            .where({ id: paymentId, crusher_id: crusherId })
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

// Update crusher material prices
router.put('/:id/prices', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        // Validate prices
        const prices = { sand_price, aggregate1_price, aggregate2_price, aggregate3_price };
        for (const [key, value] of Object.entries(prices)) {
            if (value !== undefined && value !== null && (isNaN(value) || Number(value) < 0)) {
                return res.status(400).json({ message: `سعر ${key} غير صالح` });
            }
        }

        const updateData = {};
        if (sand_price !== undefined) updateData.sand_price = toNumber(sand_price);
        if (aggregate1_price !== undefined) updateData.aggregate1_price = toNumber(aggregate1_price);
        if (aggregate2_price !== undefined) updateData.aggregate2_price = toNumber(aggregate2_price);
        if (aggregate3_price !== undefined) updateData.aggregate3_price = toNumber(aggregate3_price);

        await db('crushers').where({ id }).update(updateData);
        const updatedCrusher = await getCrusher(id);
        res.json(updatedCrusher);
    } catch (err) {
        next(err);
    }
});

// Get material price for a specific crusher and material
router.get('/:id/price/:material', async (req, res, next) => {
    try {
        const { id, material } = req.params;
        
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        let priceField;
        switch (material) {
            case 'رمل':
                priceField = 'sand_price';
                break;
            case 'سن 1':
                priceField = 'aggregate1_price';
                break;
            case 'سن 2':
                priceField = 'aggregate2_price';
                break;
            case 'سن 3':
                priceField = 'aggregate3_price';
                break;
            default:
                return res.status(400).json({ message: 'نوع المادة غير صالح' });
        }

        const price = crusher[priceField] || 0;
        res.json({ material, price, crusher_id: id, crusher_name: crusher.name });
    } catch (err) {
        next(err);
    }
});

// Generate deliveries report PDF
router.get('/:id/reports/deliveries', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.query;
        
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        // Get deliveries for the specified period
        let deliveriesQuery = db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'ct.name as contractor_name'
            )
            .where('d.crusher_id', id)
            .orderBy('d.created_at', 'asc');

        if (from && to) {
            deliveriesQuery = deliveriesQuery.whereBetween('d.created_at', [from + ' 00:00:00', to + ' 23:59:59']);
        }

        const deliveries = await deliveriesQuery;

        // Calculate material totals with normalized names
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
            // Use car_volume - discount_volume for crusher calculations
            const carVolume = Number(d.car_volume || 0);
            const discount = Number(d.discount_volume || 0);
            const netQtyForCrusher = Math.max(carVolume - discount, 0);
            materialMap[normalizedMaterial].totalQty += netQtyForCrusher;
            materialMap[normalizedMaterial].totalValue += Number(d.crusher_total_cost || 0);
        });
        const materialTotals = Object.keys(materialMap).map(k => ({ material: k, ...materialMap[k] }));
        materialTotals.sort((a, b) => b.totalQty - a.totalQty);

        // Generate HTML for PDF
        const html = generateDeliveriesReportHTML(crusher, deliveries, materialTotals, from, to);
        
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
        
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        // Get data for the specified period
        let deliveriesQuery = db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'ct.name as contractor_name'
            )
            .where('d.crusher_id', id);

        let paymentsQuery = db('crusher_payments').where('crusher_id', id);
        let adjustmentsQuery = db('adjustments').where({ entity_type: 'crusher', entity_id: id });

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
        const totalRequired = deliveries.reduce((sum, d) => sum + Number(d.crusher_total_cost || 0), 0);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        
        const totalNeeded = totalRequired + totalAdjustments;
        const net = totalNeeded - totalPaid;
        
        const totals = {
            totalRequired,
            totalPaid,
            totalAdjustments,
            totalNeeded,
            net
        };

        // Create date range text
        const dateRangeText = from && to ? 
            `من ${new Date(from).toLocaleDateString('ar-EG')} إلى ${new Date(to).toLocaleDateString('ar-EG')}` : 
            'جميع الفترات';

        // Generate HTML for PDF
        const html = generateAccountStatementHTML(crusher, deliveries, payments, adjustments, totals, dateRangeText);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        next(err);
    }
});

function generateDeliveriesReportHTML(crusher, deliveries, materialTotals, fromDate, toDate) {
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
        <title>تقرير توريدات الكسارة - ${crusher.name}</title>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .header { text-align: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
            .crusher-name { font-size: 18px; color: #e74c3c; margin-bottom: 5px; }
            .date-range { font-size: 14px; color: #7f8c8d; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .summary-item { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary-value { font-size: 18px; font-weight: bold; color: #2c3e50; }
            .summary-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
            .materials-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
            .materials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .material-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db; }
            .material-name { font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
            .material-stat { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
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
            <div class="report-title">تقرير توريدات الكسارة</div>
            <div class="crusher-name">${crusher.name}</div>
            <div class="date-range">${dateRangeText}</div>
        </div>

        <button class="print-btn" onclick="window.print()" style="position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000;">🖨️ طباعة التقرير</button>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-value">${deliveries.length}</div>
                <div class="summary-label">عدد التوريدات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatQuantity(deliveries.reduce((sum, d) => sum + (Number(d.car_volume || 0) - Number(d.discount_volume || 0)), 0))}</div>
                <div class="summary-label">إجمالي الكمية</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(deliveries.reduce((sum, d) => sum + Number(d.crusher_total_cost || 0), 0))}</div>
                <div class="summary-label">إجمالي القيمة</div>
            </div>
        </div>

        ${materialTotals.length > 0 ? `
        <div class="materials-section">
            <div class="section-title">📊 ملخص المواد</div>
            <div class="materials-grid">
                ${materialTotals.map(material => `
                <div class="material-card">
                    <div class="material-name">${material.material}</div>
                    <div class="material-stat">
                        <span>الكمية:</span>
                        <strong>${formatQuantity(material.totalQty)}</strong>
                    </div>
                    <div class="material-stat">
                        <span>القيمة:</span>
                        <strong>${formatCurrency(material.totalValue)}</strong>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${deliveries.length > 0 ? `
        <div class="materials-section">
            <div class="section-title">📋 تفاصيل التوريدات</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>العميل</th>
                        <th>المقاول</th>
                        <th>المادة</th>
                        <th>رقم البون</th>
                        <th>تكعيب السيارة</th>
                        <th>الخصم</th>
                        <th>الكمية الصافية</th>
                        <th>سعر المتر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${deliveries.map(d => `
                    <tr>
                        <td>${formatDate(d.created_at)}</td>
                        <td>${d.client_name || '-'}</td>
                        <td>${d.contractor_name || '-'}</td>
                        <td>${d.material || '-'}</td>
                        <td>${d.voucher || '-'}</td>
                        <td>${formatQuantity(d.car_volume || 0)}</td>
                        <td>${formatQuantity(d.discount_volume || 0)}</td>
                        <td>${formatQuantity((Number(d.car_volume || 0) - Number(d.discount_volume || 0)))}</td>
                        <td>${formatCurrency(d.material_price_at_time || 0)}</td>
                        <td>${formatCurrency(d.crusher_total_cost || 0)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<div class="materials-section"><div class="section-title">لا توجد توريدات في هذه الفترة</div></div>'}

        <div class="footer">
            تم إنشاء هذا التقرير في ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
        </div>
    </body>
    </html>
    `;
}

function generateAccountStatementHTML(crusher, deliveries, payments, adjustments, totals, dateRangeText) {
    const formatCurrency = (amount) => Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>كشف حساب الكسارة - ${crusher.name}</title>
        <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
            .header { text-align: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
            .report-title { font-size: 20px; color: #34495e; margin-bottom: 5px; }
            .crusher-name { font-size: 18px; color: #e74c3c; margin-bottom: 5px; }
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
            <div class="report-title">كشف حساب الكسارة</div>
            <div class="crusher-name">${crusher.name}</div>
            <div class="date-range">${dateRangeText}</div>
        </div>

        <button class="print-btn" onclick="window.print()" style="position: fixed; top: 20px; left: 20px; background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; z-index: 1000;">🖨️ طباعة كشف الحساب</button>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-value balance-negative">${formatCurrency(totals.totalRequired || 0)}</div>
                <div class="summary-label">المطلوب الأساسي</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.totalAdjustments || 0) >= 0 ? 'balance-negative' : 'balance-positive'}">${formatCurrency(Math.abs(totals.totalAdjustments || 0))}</div>
                <div class="summary-label">التسويات ${(totals.totalAdjustments || 0) >= 0 ? '(للكسارة)' : '(على الكسارة)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-negative">${formatCurrency(totals.totalNeeded || 0)}</div>
                <div class="summary-label">المطلوب النهائي</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-positive">${formatCurrency(totals.totalPaid || 0)}</div>
                <div class="summary-label">المدفوع للكسارة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(totals.net || 0) > 0 ? 'balance-negative' : (totals.net || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(totals.net || 0))}</div>
                <div class="summary-label">الرصيد الصافي ${(totals.net || 0) > 0 ? '(مستحق للكسارة)' : (totals.net || 0) < 0 ? '(مستحق لنا)' : '(متوازن)'}</div>
            </div>
        </div>

        ${deliveries.length > 0 ? `
        <div class="section">
            <div class="section-title">🚚 التوريدات</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>المقاول</th>
                        <th>المادة</th>
                        <th>الكمية الصافية</th>
                        <th>سعر المتر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${deliveries.map(d => `
                    <tr>
                        <td>${formatDate(d.created_at)}</td>
                        <td>${d.contractor_name || '-'}</td>
                        <td>${d.material || '-'}</td>
                        <td>${Number((Number(d.car_volume || 0) - Number(d.discount_volume || 0))).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} م³</td>
                        <td>${formatCurrency(d.material_price_at_time || 0)}</td>
                        <td>${formatCurrency(d.crusher_total_cost || 0)}</td>
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

// Delete crusher (with conflict checking)
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const crusher = await getCrusher(id);
        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }
        
        // Check for conflicts - deliveries
        const deliveriesCount = await db('deliveries').where('crusher_id', id).count('id as count').first();
        if (deliveriesCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف الكسارة "${crusher.name}" لأنها مرتبطة بـ ${deliveriesCount.count} تسليمة. يجب حذف التسليمات أولاً.`,
                conflict: 'deliveries',
                count: deliveriesCount.count
            });
        }
        
        // Check for conflicts - payments
        const paymentsCount = await db('crusher_payments').where('crusher_id', id).count('id as count').first();
        if (paymentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف الكسارة "${crusher.name}" لأنها مرتبطة بـ ${paymentsCount.count} دفعة. يجب حذف المدفوعات أولاً.`,
                conflict: 'payments',
                count: paymentsCount.count
            });
        }
        
        // Check for conflicts - adjustments
        const adjustmentsCount = await db('adjustments').where({ entity_type: 'crusher', entity_id: id }).count('id as count').first();
        if (adjustmentsCount.count > 0) {
            return res.status(400).json({ 
                message: `لا يمكن حذف الكسارة "${crusher.name}" لأنها مرتبطة بـ ${adjustmentsCount.count} تسوية. يجب حذف التسويات أولاً.`,
                conflict: 'adjustments',
                count: adjustmentsCount.count
            });
        }
        
        // If no conflicts, delete the crusher
        await db('crushers').where('id', id).del();
        
        res.json({ 
            message: `تم حذف الكسارة "${crusher.name}" بنجاح`,
            deletedCrusher: crusher
        });
        
    } catch (err) {
        console.error('Delete crusher error:', err);
        res.status(500).json({ message: 'خطأ في حذف الكسارة: ' + err.message });
    }
});

module.exports = router;
