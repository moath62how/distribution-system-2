const db = require('./backend/db');

async function checkRealData() {
    console.log('🔍 فحص البيانات الحقيقية...\n');
    
    try {
        // Get all deliveries with full details
        const deliveries = await db('deliveries as d')
            .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .select(
                'd.*',
                'c.name as crusher_name',
                'c.sand_price', 'c.aggregate1_price', 'c.aggregate2_price', 'c.aggregate3_price',
                'cl.name as client_name'
            )
            .orderBy('d.id');
        
        console.log(`📦 جميع التسليمات (${deliveries.length} تسليمة):\n`);
        
        deliveries.forEach(d => {
            console.log(`تسليمة ${d.id} - ${d.client_name} → ${d.crusher_name}`);
            console.log(`  المادة: ${d.material}`);
            console.log(`  الكمية المسلمة: ${d.quantity} م³`);
            console.log(`  تكعيب السيارة: ${d.car_volume} م³`);
            console.log(`  الخصم: ${d.discount_volume} م³`);
            console.log(`  سعر العميل: ${d.price_per_meter} جنيه/م³`);
            console.log(`  السعر المحفوظ للكسارة: ${d.material_price_at_time} جنيه/م³`);
            
            // Get correct crusher price
            let correctCrusherPrice = 0;
            switch (d.material) {
                case 'رمل':
                    correctCrusherPrice = Number(d.sand_price || 0);
                    break;
                case 'سن 1':
                case 'سن1':
                    correctCrusherPrice = Number(d.aggregate1_price || 0);
                    break;
                case 'سن 2':
                case 'سن2':
                    correctCrusherPrice = Number(d.aggregate2_price || 0);
                    break;
                case 'سن 3':
                case 'سن3':
                    correctCrusherPrice = Number(d.aggregate3_price || 0);
                    break;
            }
            
            console.log(`  السعر الحالي في جدول الكسارة: ${correctCrusherPrice} جنيه/م³`);
            
            // Calculate what should be
            const netQuantityForCrusher = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
            const netQuantityForClient = Number(d.quantity || 0) - Number(d.discount_volume || 0);
            
            const correctCrusherCost = netQuantityForCrusher * correctCrusherPrice;
            const correctClientValue = netQuantityForClient * Number(d.price_per_meter || 0);
            
            console.log(`  تكلفة الكسارة المحفوظة: ${d.crusher_total_cost} جنيه`);
            console.log(`  تكلفة الكسارة الصحيحة: ${correctCrusherCost} جنيه`);
            console.log(`  قيمة العميل المحفوظة: ${d.total_value} جنيه`);
            console.log(`  قيمة العميل الصحيحة: ${correctClientValue} جنيه`);
            
            // Check for errors
            if (Math.abs(Number(d.crusher_total_cost || 0) - correctCrusherCost) > 0.01) {
                console.log(`  ❌ خطأ في تكلفة الكسارة!`);
            }
            if (Math.abs(Number(d.total_value || 0) - correctClientValue) > 0.01) {
                console.log(`  ❌ خطأ في قيمة العميل!`);
            }
            if (Math.abs(Number(d.material_price_at_time || 0) - correctCrusherPrice) > 0.01) {
                console.log(`  ❌ خطأ في السعر المحفوظ للكسارة!`);
            }
            
            console.log(`  التاريخ: ${new Date(d.created_at).toLocaleDateString('ar-EG')}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ خطأ:', error);
    } finally {
        process.exit(0);
    }
}

checkRealData();