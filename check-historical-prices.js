const db = require('./backend/db');

async function checkHistoricalPrices() {
    console.log('🔍 فحص الأسعار التاريخية...\n');
    
    try {
        // Get current crusher prices
        const crushers = await db('crushers').select('*');
        console.log('🏭 الأسعار الحالية في جدول الكسارات:');
        crushers.forEach(c => {
            console.log(`\n${c.name} (ID: ${c.id}):`);
            console.log(`  رمل: ${c.sand_price} جنيه/م³`);
            console.log(`  سن 1: ${c.aggregate1_price} جنيه/م³`);
            console.log(`  سن 2: ${c.aggregate2_price} جنيه/م³`);
            console.log(`  سن 3: ${c.aggregate3_price} جنيه/م³`);
        });
        
        console.log('\n' + '='.repeat(60));
        
        // Get deliveries with their stored historical prices
        const deliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .select(
                'd.*',
                'c.name as crusher_name',
                'c.sand_price as current_sand_price',
                'c.aggregate1_price as current_agg1_price',
                'c.aggregate2_price as current_agg2_price',
                'c.aggregate3_price as current_agg3_price'
            )
            .orderBy('d.id');
        
        console.log('\n📦 مقارنة الأسعار التاريخية مع الحالية:\n');
        
        deliveries.forEach(d => {
            console.log(`تسليمة ${d.id} - ${d.crusher_name} - ${d.material}`);
            console.log(`  التاريخ: ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
            
            // Get current price for this material
            let currentPrice = 0;
            switch (d.material) {
                case 'رمل':
                    currentPrice = Number(d.current_sand_price || 0);
                    break;
                case 'سن 1':
                case 'سن1':
                    currentPrice = Number(d.current_agg1_price || 0);
                    break;
                case 'سن 2':
                case 'سن2':
                    currentPrice = Number(d.current_agg2_price || 0);
                    break;
                case 'سن 3':
                case 'سن3':
                    currentPrice = Number(d.current_agg3_price || 0);
                    break;
            }
            
            const historicalPrice = Number(d.material_price_at_time || 0);
            const storedCost = Number(d.crusher_total_cost || 0);
            const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
            
            console.log(`  السعر التاريخي المحفوظ: ${historicalPrice} جنيه/م³`);
            console.log(`  السعر الحالي في الجدول: ${currentPrice} جنيه/م³`);
            console.log(`  الكمية الصافية: ${netQuantity} م³`);
            console.log(`  التكلفة المحفوظة: ${storedCost} جنيه`);
            
            // Check if historical price matches current price (problem!)
            if (Math.abs(historicalPrice - currentPrice) < 0.01) {
                console.log(`  ⚠️  السعر التاريخي يطابق السعر الحالي - قد يكون هناك مشكلة!`);
            } else {
                console.log(`  ✅ السعر التاريخي محفوظ بشكل صحيح`);
            }
            
            // Check if cost calculation is correct based on historical price
            const expectedCost = netQuantity * historicalPrice;
            if (Math.abs(storedCost - expectedCost) > 0.01) {
                console.log(`  ❌ التكلفة المحفوظة (${storedCost}) لا تتطابق مع المتوقع (${expectedCost})`);
            } else {
                console.log(`  ✅ التكلفة محسوبة بشكل صحيح من السعر التاريخي`);
            }
            
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        process.exit(0);
    }
}

checkHistoricalPrices();