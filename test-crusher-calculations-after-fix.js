const db = require('./backend/db');

async function testCrusherCalculationsAfterFix() {
    console.log('🧮 اختبار حسابات الكسارات بعد الإصلاح...\n');
    
    try {
        // Get all crushers
        const crushers = await db('crushers').select('*');
        
        for (const crusher of crushers) {
            console.log(`\n📊 اختبار حسابات الكسارة: ${crusher.name} (ID: ${crusher.id})`);
            console.log('=' .repeat(50));
            
            // Get deliveries for this crusher
            const deliveries = await db('deliveries')
                .where({ crusher_id: crusher.id })
                .select('*');
            
            console.log(`📦 التسليمات (${deliveries.length} تسليمة):`);
            
            let totalRequired = 0;
            deliveries.forEach((d, index) => {
                const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
                const storedCost = Number(d.crusher_total_cost || 0);
                const storedPrice = Number(d.material_price_at_time || 0);
                
                totalRequired += storedCost;
                
                console.log(`  ${index + 1}. ${d.material} - ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
                console.log(`     تكعيب السيارة: ${d.car_volume} م³`);
                console.log(`     الخصم: ${d.discount_volume} م³`);
                console.log(`     الكمية الصافية: ${netQuantity} م³`);
                console.log(`     السعر التاريخي: ${storedPrice} جنيه/م³`);
                console.log(`     التكلفة: ${storedCost} جنيه`);
                console.log('');
            });
            
            // Get payments to crusher
            const payments = await db('crusher_payments')
                .where({ crusher_id: crusher.id })
                .select('*');
            
            console.log(`💰 المدفوعات (${payments.length} دفعة):`);
            let totalPaid = 0;
            payments.forEach((p, index) => {
                totalPaid += Number(p.amount || 0);
                console.log(`  ${index + 1}. ${p.amount} جنيه - ${new Date(p.paid_at).toLocaleDateString('ar-EG')}`);
                console.log(`     الطريقة: ${p.method || 'غير محدد'}`);
                console.log(`     ملاحظة: ${p.note || 'لا توجد'}`);
                console.log('');
            });
            
            // Get adjustments
            const adjustments = await db('adjustments')
                .where({ entity_type: 'crusher', entity_id: crusher.id })
                .select('*');
            
            console.log(`⚖️  التسويات (${adjustments.length} تسوية):`);
            let totalAdjustments = 0;
            adjustments.forEach((a, index) => {
                totalAdjustments += Number(a.amount || 0);
                console.log(`  ${index + 1}. ${a.amount} جنيه - ${new Date(a.created_at).toLocaleDateString('ar-EG')}`);
                console.log(`     السبب: ${a.reason || 'غير محدد'}`);
                console.log('');
            });
            
            // Calculate totals
            const totalNeeded = totalRequired + totalAdjustments;
            const net = totalNeeded - totalPaid;
            
            console.log('📊 ملخص الحسابات:');
            console.log(`إجمالي المطلوب من التسليمات: ${totalRequired} جنيه`);
            console.log(`إجمالي التسويات: ${totalAdjustments} جنيه`);
            console.log(`إجمالي المطلوب النهائي: ${totalNeeded} جنيه`);
            console.log(`إجمالي المدفوع: ${totalPaid} جنيه`);
            console.log(`الرصيد الصافي: ${net} جنيه`);
            
            if (net > 0) {
                console.log(`✅ مستحق للكسارة: ${net} جنيه`);
            } else if (net < 0) {
                console.log(`✅ مستحق لنا: ${Math.abs(net)} جنيه`);
            } else {
                console.log(`✅ الحساب متوازن`);
            }
            
            console.log('\n' + '='.repeat(50));
        }
        
        // Test API consistency
        console.log('\n🌐 اختبار تطابق API...');
        for (const crusher of crushers) {
            try {
                const response = await fetch(`http://localhost:5000/api/crushers/${crusher.id}`);
                const data = await response.json();
                
                if (data.totals) {
                    console.log(`\n${crusher.name} - API:`);
                    console.log(`  المطلوب: ${data.totals.totalRequired} جنيه`);
                    console.log(`  المدفوع: ${data.totals.totalPaid} جنيه`);
                    console.log(`  التسويات: ${data.totals.totalAdjustments} جنيه`);
                    console.log(`  الرصيد: ${data.totals.net} جنيه`);
                }
            } catch (error) {
                console.log(`⚠️  لا يمكن الوصول إلى API للكسارة ${crusher.name}`);
            }
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error);
    } finally {
        process.exit(0);
    }
}

testCrusherCalculationsAfterFix();