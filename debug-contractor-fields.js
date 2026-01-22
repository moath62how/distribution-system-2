const db = require('./backend/db');

async function debugContractorFields() {
    console.log('🔍 فحص حقول المقاولين في التسليمات...\n');
    
    try {
        // Get all deliveries with contractor data
        const deliveries = await db('deliveries')
            .select(
                'id', 'contractor_id', 'quantity', 
                'contractor_charge', 'contractor_charge_per_meter', 'contractor_total_charge',
                'contractor_rate_per_meter', 'material', 'created_at'
            )
            .whereNotNull('contractor_id')
            .orderBy('id');
        
        console.log(`📦 إجمالي التسليمات مع مقاولين: ${deliveries.length}\n`);
        
        deliveries.forEach(d => {
            console.log(`تسليمة ${d.id} - المقاول ${d.contractor_id}:`);
            console.log(`  المادة: ${d.material}`);
            console.log(`  الكمية: ${d.quantity} م³`);
            console.log(`  contractor_charge (القديم): ${d.contractor_charge}`);
            console.log(`  contractor_charge_per_meter: ${d.contractor_charge_per_meter}`);
            console.log(`  contractor_rate_per_meter: ${d.contractor_rate_per_meter}`);
            console.log(`  contractor_total_charge (المحفوظ): ${d.contractor_total_charge}`);
            
            // Calculate what it should be
            const shouldBe1 = Number(d.quantity || 0) * Number(d.contractor_charge_per_meter || 0);
            const shouldBe2 = Number(d.quantity || 0) * Number(d.contractor_rate_per_meter || 0);
            
            console.log(`  المحسوب من contractor_charge_per_meter: ${shouldBe1}`);
            console.log(`  المحسوب من contractor_rate_per_meter: ${shouldBe2}`);
            
            if (Math.abs(shouldBe1 - Number(d.contractor_total_charge || 0)) < 0.01) {
                console.log(`  ✅ contractor_charge_per_meter صحيح`);
            } else if (Math.abs(shouldBe2 - Number(d.contractor_total_charge || 0)) < 0.01) {
                console.log(`  ✅ contractor_rate_per_meter صحيح`);
            } else {
                console.log(`  ❌ لا يوجد تطابق في الحسابات!`);
            }
            
            console.log(`  التاريخ: ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ خطأ في فحص الحقول:', error);
    } finally {
        process.exit(0);
    }
}

debugContractorFields();