const db = require('./backend/db');

async function debugClientFinancials(clientId = 6) {
    try {
        console.log(`=== تحليل البيانات المالية للعميل ${clientId} ===\n`);
        
        // Get client info
        const client = await db('clients').where({ id: clientId }).first();
        console.log('بيانات العميل:', client);
        console.log('الرصيد الافتتاحي:', client?.opening_balance || 0);
        
        // Get deliveries
        const deliveries = await db('deliveries').where({ client_id: clientId });
        console.log('\n=== التوريدات ===');
        console.log('عدد التوريدات:', deliveries.length);
        let totalDeliveries = 0;
        deliveries.forEach((d, i) => {
            console.log(`${i+1}. التاريخ: ${d.created_at}, المادة: ${d.material}, الكمية: ${d.quantity}, السعر: ${d.price_per_meter}, الإجمالي: ${d.total_value}`);
            totalDeliveries += Number(d.total_value || 0);
        });
        console.log('إجمالي التوريدات:', totalDeliveries);
        
        // Get payments
        const payments = await db('payments').where({ client_id: clientId });
        console.log('\n=== المدفوعات ===');
        console.log('عدد المدفوعات:', payments.length);
        let totalPayments = 0;
        payments.forEach((p, i) => {
            console.log(`${i+1}. التاريخ: ${p.paid_at}, المبلغ: ${p.amount}, الطريقة: ${p.method}, الملاحظة: ${p.note}`);
            totalPayments += Number(p.amount || 0);
        });
        console.log('إجمالي المدفوعات:', totalPayments);
        
        // Get adjustments
        const adjustments = await db('adjustments').where({ entity_type: 'client', entity_id: clientId });
        console.log('\n=== التسويات ===');
        console.log('عدد التسويات:', adjustments.length);
        let totalAdjustments = 0;
        adjustments.forEach((a, i) => {
            console.log(`${i+1}. التاريخ: ${a.created_at}, المبلغ: ${a.amount}, السبب: ${a.reason}, الطريقة: ${a.method}`);
            totalAdjustments += Number(a.amount || 0);
        });
        console.log('إجمالي التسويات:', totalAdjustments);
        
        // Calculate final balance
        const opening = Number(client?.opening_balance || 0);
        const finalBalance = opening + totalDeliveries + totalAdjustments - totalPayments;
        
        console.log('\n=== الحساب النهائي ===');
        console.log('الرصيد الافتتاحي:', opening);
        console.log('+ إجمالي التوريدات:', totalDeliveries);
        console.log('+ إجمالي التسويات:', totalAdjustments);
        console.log('- إجمالي المدفوعات:', totalPayments);
        console.log('= الرصيد الصافي:', finalBalance);
        
        // Check if positive balance means "له" or "عليه"
        console.log('\nالتفسير:');
        if (finalBalance > 0) {
            console.log(`${finalBalance} جنيه (عليه) - العميل مدين لنا`);
        } else if (finalBalance < 0) {
            console.log(`${Math.abs(finalBalance)} جنيه (له) - نحن مدينون للعميل`);
        } else {
            console.log('الحساب متوازن');
        }
        
    } catch (error) {
        console.error('خطأ في تحليل البيانات:', error);
    } finally {
        await db.destroy();
    }
}

debugClientFinancials();