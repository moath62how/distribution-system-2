const db = require('./backend/db');

async function debugCrusherPricing() {
    console.log('🔍 فحص أسعار الكسارات والحسابات...\n');
    
    try {
        // Get all crushers with their prices
        const crushers = await db('crushers').select('*');
        console.log('🏭 الكسارات وأسعارها:');
        crushers.forEach(c => {
            console.log(`\n- ${c.name} (ID: ${c.id}):`);
            console.log(`  رمل: ${c.sand_price} جنيه/م³`);
            console.log(`  سن 1: ${c.aggregate1_price} جنيه/م³`);
            console.log(`  سن 2: ${c.aggregate2_price} جنيه/م³`);
            console.log(`  سن 3: ${c.aggregate3_price} جنيه/م³`);
        });
        
        console.log('\n' + '='.repeat(60));
        
        // Get all deliveries and check pricing
        const deliveries = await db('deliveries')
            .leftJoin('crushers as c', 'deliveries.crusher_id', 'c.id')
            .select(
                'deliveries.*',
                'c.name as crusher_name',
                'c.sand_price', 'c.aggregate1_price', 'c.aggregate2_price', 'c.aggregate3_price'
            )
            .orderBy('deliveries.id');
        
        console.log(`\n📦 فحص التسليمات (${deliveries.length} تسليمة):\n`);
        
        deliveries.forEach(d => {
            console.log(`تسليمة ${d.id} - الكسارة: ${d.crusher_name}`);
            console.log(`  المادة: ${d.material}`);
            console.log(`  تكعيب السيارة: ${d.car_volume} م³`);
            console.log(`  الخصم: ${d.discount_volume} م³`);
            console.log(`  الكمية الصافية للكسارة: ${Number(d.car_volume || 0) - Number(d.discount_volume || 0)} م³`);
            
            // Get the correct price from crusher table
            let correctPrice = 0;
            switch (d.material) {
                case 'رمل':
                    correctPrice = Number(d.sand_price || 0);
                    break;
                case 'سن 1':
                case 'سن1':
                    correctPrice = Number(d.aggregate1_price || 0);
                    break;
                case 'سن 2':
                case 'سن2':
                    correctPrice = Number(d.aggregate2_price || 0);
                    break;
                case 'سن 3':
                case 'سن3':
                    correctPrice = Number(d.aggregate3_price || 0);
                    break;
            }
            
            const storedPrice = Number(d.material_price_at_time || 0);
            const storedCost = Number(d.crusher_total_cost || 0);
            const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
            const calculatedCost = netQuantity * correctPrice;
            const calculatedFromStored = netQuantity * storedPrice;
            
            console.log(`  السعر الحالي في جدول الكسارة: ${correctPrice} جنيه/م³`);
            console.log(`  السعر المحفوظ في التسليمة: ${storedPrice} جنيه/م³`);
            console.log(`  التكلفة المحفوظة: ${storedCost} جنيه`);
            console.log(`  التكلفة المحسوبة من السعر الحالي: ${calculatedCost} جنيه`);
            console.log(`  التكلفة المحسوبة من السعر المحفوظ: ${calculatedFromStored} جنيه`);
            
            // Check if there's a mismatch
            if (Math.abs(storedPrice - correctPrice) > 0.01) {
                console.log(`  ⚠️  السعر المحفوظ مختلف عن السعر الحالي!`);
            }
            
            if (Math.abs(storedCost - calculatedFromStored) > 0.01) {
                console.log(`  ❌ التكلفة المحفوظة لا تتطابق مع الحساب!`);
            } else {
                console.log(`  ✅ التكلفة المحفوظة صحيحة`);
            }
            
            // Check if using client price instead of crusher price
            const clientPrice = Number(d.price_per_meter || 0);
            const calculatedFromClientPrice = netQuantity * clientPrice;
            if (Math.abs(storedCost - calculatedFromClientPrice) < 0.01) {
                console.log(`  🚨 المشكلة: يستخدم سعر العميل (${clientPrice}) بدلاً من سعر الكسارة!`);
            }
            
            console.log(`  التاريخ: ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ خطأ في فحص الأسعار:', error);
    } finally {
        process.exit(0);
    }
}

debugCrusherPricing();