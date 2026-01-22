const db = require('./backend/db');

async function fixCrusherPrices() {
    console.log('🔧 إصلاح أسعار الكسارات...\n');
    
    try {
        // Fix crusher prices - set correct prices for all materials
        console.log('📝 تحديث أسعار الكسارات...');
        
        // Update الغرابلي crusher prices
        await db('crushers')
            .where('id', 1)
            .update({
                sand_price: 30.00,
                aggregate1_price: 40.00,  // This was 0, now set to 40
                aggregate2_price: 48.00,
                aggregate3_price: 46.00
            });
        
        console.log('✅ تم تحديث أسعار كسارة الغرابلي');
        
        // Update الجهامات crusher prices (already correct but let's ensure)
        await db('crushers')
            .where('id', 2)
            .update({
                sand_price: 28.00,
                aggregate1_price: 40.00,
                aggregate2_price: 42.00,
                aggregate3_price: 45.00
            });
        
        console.log('✅ تم تأكيد أسعار كسارة الجهامات');
        
        // Now fix the historical delivery that used client price instead of crusher price
        console.log('\n🔧 إصلاح التسليمة القديمة التي تستخدم سعر العميل...');
        
        // Get the problematic delivery
        const delivery = await db('deliveries').where('id', 1).first();
        if (delivery) {
            // Calculate correct crusher cost using crusher price
            const netQuantity = Number(delivery.car_volume || 0) - Number(delivery.discount_volume || 0);
            const correctCrusherPrice = 40.00; // سن1 price for الغرابلي
            const correctCrusherCost = netQuantity * correctCrusherPrice;
            
            console.log(`التسليمة ${delivery.id}:`);
            console.log(`  الكمية الصافية: ${netQuantity} م³`);
            console.log(`  السعر الصحيح للكسارة: ${correctCrusherPrice} جنيه/م³`);
            console.log(`  التكلفة الصحيحة: ${correctCrusherCost} جنيه`);
            console.log(`  التكلفة القديمة: ${delivery.crusher_total_cost} جنيه`);
            
            // Update the delivery with correct crusher pricing
            await db('deliveries')
                .where('id', 1)
                .update({
                    material_price_at_time: correctCrusherPrice,
                    crusher_total_cost: correctCrusherCost
                });
            
            console.log('✅ تم إصلاح التسليمة بالسعر الصحيح للكسارة');
        }
        
        console.log('\n🎯 تم إكمال الإصلاح بنجاح!');
        
        // Verify the fix
        console.log('\n🔍 التحقق من الإصلاح...');
        const updatedDelivery = await db('deliveries')
            .leftJoin('crushers as c', 'deliveries.crusher_id', 'c.id')
            .select('deliveries.*', 'c.name as crusher_name', 'c.aggregate1_price')
            .where('deliveries.id', 1)
            .first();
        
        if (updatedDelivery) {
            console.log(`التسليمة ${updatedDelivery.id} - ${updatedDelivery.crusher_name}:`);
            console.log(`  السعر في جدول الكسارة: ${updatedDelivery.aggregate1_price} جنيه/م³`);
            console.log(`  السعر المحفوظ في التسليمة: ${updatedDelivery.material_price_at_time} جنيه/م³`);
            console.log(`  التكلفة المحفوظة: ${updatedDelivery.crusher_total_cost} جنيه`);
            
            if (Math.abs(updatedDelivery.material_price_at_time - updatedDelivery.aggregate1_price) < 0.01) {
                console.log('✅ الأسعار متطابقة الآن!');
            } else {
                console.log('❌ لا تزال هناك مشكلة في الأسعار');
            }
        }
        
    } catch (error) {
        console.error('❌ خطأ في إصلاح الأسعار:', error);
    } finally {
        process.exit(0);
    }
}

fixCrusherPrices();