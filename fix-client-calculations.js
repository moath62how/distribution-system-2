const db = require('./backend/db');

async function fixClientCalculations() {
    console.log('🔧 إصلاح حسابات العملاء...\n');
    
    try {
        // Get all deliveries and recalculate total_value
        const deliveries = await db('deliveries').select('*');
        
        let fixedCount = 0;
        
        for (const delivery of deliveries) {
            const quantity = Number(delivery.quantity || 0);
            const discount = Number(delivery.discount_volume || 0);
            const pricePerMeter = Number(delivery.price_per_meter || 0);
            
            // Client pays for delivered quantity AFTER discount
            const netQuantityForClient = Math.max(quantity - discount, 0);
            const correctTotalValue = netQuantityForClient * pricePerMeter;
            const currentTotalValue = Number(delivery.total_value || 0);
            
            if (Math.abs(correctTotalValue - currentTotalValue) > 0.01) {
                console.log(`إصلاح التسليمة ${delivery.id}:`);
                console.log(`  المادة: ${delivery.material}`);
                console.log(`  الكمية المسلمة: ${quantity} م³`);
                console.log(`  الخصم: ${discount} م³`);
                console.log(`  الكمية الصافية للعميل: ${netQuantityForClient} م³`);
                console.log(`  سعر المتر: ${pricePerMeter} جنيه`);
                console.log(`  القيمة القديمة: ${currentTotalValue} جنيه`);
                console.log(`  القيمة الصحيحة: ${correctTotalValue} جنيه`);
                console.log(`  الفرق: ${correctTotalValue - currentTotalValue} جنيه`);
                
                // Update the delivery
                await db('deliveries')
                    .where('id', delivery.id)
                    .update({
                        net_quantity: netQuantityForClient,
                        total_value: correctTotalValue
                    });
                
                fixedCount++;
                console.log('✅ تم الإصلاح\n');
            }
        }
        
        console.log(`🎯 تم إصلاح ${fixedCount} تسليمة`);
        
        if (fixedCount === 0) {
            console.log('✅ جميع حسابات العملاء صحيحة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في الإصلاح:', error);
    } finally {
        process.exit(0);
    }
}

fixClientCalculations();