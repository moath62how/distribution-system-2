const db = require('./backend/db');

async function fixAllOldDeliveries() {
    console.log('🔧 إصلاح جميع التسليمات القديمة التي تستخدم سعر العميل...\n');
    
    try {
        // Get all deliveries with their crusher info
        const deliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .select(
                'd.*',
                'c.sand_price', 'c.aggregate1_price', 'c.aggregate2_price', 'c.aggregate3_price'
            );
        
        let fixedCount = 0;
        
        for (const delivery of deliveries) {
            // Get correct crusher price for this material
            let correctCrusherPrice = 0;
            switch (delivery.material) {
                case 'رمل':
                    correctCrusherPrice = Number(delivery.sand_price || 0);
                    break;
                case 'سن 1':
                case 'سن1':
                    correctCrusherPrice = Number(delivery.aggregate1_price || 0);
                    break;
                case 'سن 2':
                case 'سن2':
                    correctCrusherPrice = Number(delivery.aggregate2_price || 0);
                    break;
                case 'سن 3':
                case 'سن3':
                    correctCrusherPrice = Number(delivery.aggregate3_price || 0);
                    break;
            }
            
            const storedPrice = Number(delivery.material_price_at_time || 0);
            const clientPrice = Number(delivery.price_per_meter || 0);
            const netQuantity = Number(delivery.car_volume || 0) - Number(delivery.discount_volume || 0);
            
            // Check if this delivery is using client price instead of crusher price
            const calculatedFromClientPrice = netQuantity * clientPrice;
            const storedCost = Number(delivery.crusher_total_cost || 0);
            
            if (Math.abs(storedCost - calculatedFromClientPrice) < 0.01 && correctCrusherPrice > 0) {
                // This delivery is using client price, fix it
                const correctCost = netQuantity * correctCrusherPrice;
                
                console.log(`إصلاح التسليمة ${delivery.id}:`);
                console.log(`  المادة: ${delivery.material}`);
                console.log(`  الكمية الصافية: ${netQuantity} م³`);
                console.log(`  السعر الخطأ (العميل): ${clientPrice} جنيه/م³`);
                console.log(`  السعر الصحيح (الكسارة): ${correctCrusherPrice} جنيه/م³`);
                console.log(`  التكلفة القديمة: ${storedCost} جنيه`);
                console.log(`  التكلفة الصحيحة: ${correctCost} جنيه`);
                console.log(`  الفرق: ${correctCost - storedCost} جنيه`);
                
                // Update the delivery
                await db('deliveries')
                    .where('id', delivery.id)
                    .update({
                        material_price_at_time: correctCrusherPrice,
                        crusher_total_cost: correctCost
                    });
                
                fixedCount++;
                console.log('✅ تم الإصلاح\n');
            }
        }
        
        console.log(`🎯 تم إصلاح ${fixedCount} تسليمة`);
        
        if (fixedCount === 0) {
            console.log('✅ جميع التسليمات تستخدم أسعار الكسارة الصحيحة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في الإصلاح:', error);
    } finally {
        process.exit(0);
    }
}

fixAllOldDeliveries();