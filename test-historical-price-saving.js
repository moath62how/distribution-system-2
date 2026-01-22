const db = require('./backend/db');

async function testHistoricalPriceSaving() {
    console.log('🧪 اختبار حفظ الأسعار التاريخية...\n');
    
    try {
        // First, change a crusher price to test historical saving
        console.log('1️⃣ تغيير سعر الرمل في كسارة الجهامات من 28 إلى 35...');
        
        const oldPrice = await db('crushers')
            .where('id', 2)
            .select('sand_price')
            .first();
        
        console.log(`السعر القديم: ${oldPrice.sand_price} جنيه/م³`);
        
        // Update the price
        await db('crushers')
            .where('id', 2)
            .update({ sand_price: 35.00 });
        
        console.log('✅ تم تحديث السعر إلى 35 جنيه/م³');
        
        // Now check what happens to existing deliveries
        console.log('\n2️⃣ فحص التسليمات الموجودة...');
        
        const existingDeliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .select(
                'd.id', 'd.material', 'd.material_price_at_time', 'd.crusher_total_cost',
                'd.car_volume', 'd.discount_volume',
                'c.sand_price as current_sand_price'
            )
            .where('d.crusher_id', 2)
            .where('d.material', 'رمل');
        
        existingDeliveries.forEach(d => {
            const netQty = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
            const historicalPrice = Number(d.material_price_at_time || 0);
            const currentPrice = Number(d.current_sand_price || 0);
            const storedCost = Number(d.crusher_total_cost || 0);
            const expectedCostFromHistorical = netQty * historicalPrice;
            const expectedCostFromCurrent = netQty * currentPrice;
            
            console.log(`\nتسليمة ${d.id} (رمل):`);
            console.log(`  الكمية الصافية: ${netQty} م³`);
            console.log(`  السعر التاريخي المحفوظ: ${historicalPrice} جنيه/م³`);
            console.log(`  السعر الحالي في الجدول: ${currentPrice} جنيه/م³`);
            console.log(`  التكلفة المحفوظة: ${storedCost} جنيه`);
            console.log(`  المتوقع من السعر التاريخي: ${expectedCostFromHistorical} جنيه`);
            console.log(`  المتوقع من السعر الحالي: ${expectedCostFromCurrent} جنيه`);
            
            if (Math.abs(storedCost - expectedCostFromHistorical) < 0.01) {
                console.log(`  ✅ التكلفة تعتمد على السعر التاريخي (صحيح)`);
            } else if (Math.abs(storedCost - expectedCostFromCurrent) < 0.01) {
                console.log(`  ❌ التكلفة تعتمد على السعر الحالي (خطأ!)`);
            } else {
                console.log(`  ⚠️  التكلفة لا تتطابق مع أي من السعرين`);
            }
        });
        
        // Restore the original price
        console.log('\n3️⃣ إعادة السعر الأصلي...');
        await db('crushers')
            .where('id', 2)
            .update({ sand_price: oldPrice.sand_price });
        
        console.log(`✅ تم إعادة السعر إلى ${oldPrice.sand_price} جنيه/م³`);
        
    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        process.exit(0);
    }
}

testHistoricalPriceSaving();