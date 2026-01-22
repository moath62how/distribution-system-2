const db = require('./backend/db');

async function debugContractorCalculations() {
    console.log('🔍 فحص حسابات المقاولين...\n');
    
    try {
        // Get all contractors
        const contractors = await db('contractors').select('*');
        console.log('📋 المقاولين الموجودين:');
        contractors.forEach(c => {
            console.log(`- ID: ${c.id}, الاسم: ${c.name}, الرصيد الافتتاحي: ${c.opening_balance || 0}`);
        });
        console.log('');
        
        // For each contractor, show detailed calculations
        for (const contractor of contractors) {
            console.log(`\n🧮 تفاصيل حسابات المقاول: ${contractor.name} (ID: ${contractor.id})`);
            console.log('=' .repeat(60));
            
            // Get deliveries
            const deliveries = await db('deliveries')
                .where({ contractor_id: contractor.id })
                .select('id', 'quantity', 'contractor_rate_per_meter', 'contractor_total_charge', 'created_at', 'material');
            
            console.log(`📦 التسليمات (${deliveries.length} تسليمة):`);
            let totalFromDeliveries = 0;
            deliveries.forEach(d => {
                const calculatedCharge = (Number(d.quantity || 0) * Number(d.contractor_rate_per_meter || 0));
                const storedCharge = Number(d.contractor_total_charge || 0);
                totalFromDeliveries += storedCharge;
                
                console.log(`  - التاريخ: ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
                console.log(`    المادة: ${d.material || 'غير محدد'}`);
                console.log(`    الكمية: ${d.quantity} م³`);
                console.log(`    سعر المتر: ${d.contractor_rate_per_meter} جنيه`);
                console.log(`    المحسوب: ${calculatedCharge} جنيه`);
                console.log(`    المحفوظ: ${storedCharge} جنيه`);
                if (calculatedCharge !== storedCharge) {
                    console.log(`    ⚠️  فرق في الحساب: ${calculatedCharge - storedCharge}`);
                }
                console.log('');
            });
            
            // Get payments
            const payments = await db('contractor_payments')
                .where({ contractor_id: contractor.id })
                .select('amount', 'paid_at', 'method', 'note');
            
            console.log(`💰 المدفوعات (${payments.length} دفعة):`);
            let totalPayments = 0;
            payments.forEach(p => {
                totalPayments += Number(p.amount || 0);
                console.log(`  - التاريخ: ${new Date(p.paid_at).toLocaleDateString('ar-EG')}`);
                console.log(`    المبلغ: ${p.amount} جنيه`);
                console.log(`    الطريقة: ${p.method || 'غير محدد'}`);
                console.log(`    ملاحظة: ${p.note || 'لا توجد'}`);
                console.log('');
            });
            
            // Get adjustments
            const adjustments = await db('adjustments')
                .where({ entity_type: 'contractor', entity_id: contractor.id })
                .select('amount', 'reason', 'created_at');
            
            console.log(`⚖️  التسويات (${adjustments.length} تسوية):`);
            let totalAdjustments = 0;
            adjustments.forEach(a => {
                totalAdjustments += Number(a.amount || 0);
                console.log(`  - التاريخ: ${new Date(a.created_at).toLocaleDateString('ar-EG')}`);
                console.log(`    المبلغ: ${a.amount} جنيه`);
                console.log(`    السبب: ${a.reason || 'غير محدد'}`);
                console.log('');
            });
            
            // Calculate totals
            const openingBalance = Number(contractor.opening_balance || 0);
            const balance = openingBalance + totalFromDeliveries + totalAdjustments - totalPayments;
            
            console.log('📊 ملخص الحسابات:');
            console.log(`الرصيد الافتتاحي: ${openingBalance} جنيه`);
            console.log(`إجمالي مستحقات التسليمات: ${totalFromDeliveries} جنيه`);
            console.log(`إجمالي التسويات: ${totalAdjustments} جنيه`);
            console.log(`إجمالي المدفوعات: ${totalPayments} جنيه`);
            console.log(`الرصيد الصافي: ${balance} جنيه`);
            
            if (balance > 0) {
                console.log(`✅ مستحق للمقاول: ${balance} جنيه`);
            } else if (balance < 0) {
                console.log(`✅ مستحق لنا: ${Math.abs(balance)} جنيه`);
            } else {
                console.log(`✅ الحساب متوازن`);
            }
            
            console.log('\n' + '='.repeat(60));
        }
        
    } catch (error) {
        console.error('❌ خطأ في فحص الحسابات:', error);
    } finally {
        process.exit(0);
    }
}

debugContractorCalculations();