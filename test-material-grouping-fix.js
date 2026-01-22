const db = require('./backend/db');

async function testMaterialGroupingFix() {
    console.log('🧪 اختبار إصلاح تجميع المواد...\n');
    
    try {
        // Test client material grouping
        console.log('📊 اختبار تجميع المواد للعملاء:');
        const clientId = 1;
        const deliveries = await db('deliveries')
            .where({ client_id: clientId })
            .select('material', 'quantity', 'total_value');
        
        console.log('التسليمات الخام:');
        deliveries.forEach(d => {
            console.log(`  - ${d.material}: ${d.quantity} م³`);
        });
        
        // Test the grouping logic
        const materialMap = {};
        deliveries.forEach(d => {
            // Normalize material names
            let normalizedMaterial = (d.material || 'غير محدد').toString().trim();
            switch (normalizedMaterial) {
                case 'سن1':
                    normalizedMaterial = 'سن 1';
                    break;
                case 'سن2':
                    normalizedMaterial = 'سن 2';
                    break;
                case 'سن3':
                    normalizedMaterial = 'سن 3';
                    break;
            }
            
            if (!materialMap[normalizedMaterial]) materialMap[normalizedMaterial] = { totalQty: 0, totalValue: 0 };
            materialMap[normalizedMaterial].totalQty += Number(d.quantity || 0);
            materialMap[normalizedMaterial].totalValue += Number(d.total_value || 0);
        });
        
        console.log('\nبعد التجميع:');
        Object.keys(materialMap).forEach(material => {
            console.log(`  - ${material}: ${materialMap[material].totalQty} م³ (${materialMap[material].totalValue} جنيه)`);
        });
        
        // Test API response
        console.log('\n🌐 اختبار API:');
        try {
            const response = await fetch(`http://localhost:5000/api/clients/${clientId}`);
            const data = await response.json();
            
            if (data.materialTotals) {
                console.log('نتيجة API:');
                data.materialTotals.forEach(m => {
                    console.log(`  - ${m.material}: ${m.totalQty} م³ (${m.totalValue} جنيه)`);
                });
            }
        } catch (error) {
            console.log('⚠️  لا يمكن الوصول إلى API');
        }
        
        // Test crusher material grouping
        console.log('\n📊 اختبار تجميع المواد للكسارات:');
        const crusherId = 1;
        const crusherDeliveries = await db('deliveries')
            .where({ crusher_id: crusherId })
            .select('material', 'car_volume', 'discount_volume', 'crusher_total_cost');
        
        console.log('التسليمات الخام:');
        crusherDeliveries.forEach(d => {
            console.log(`  - ${d.material}: ${Number(d.car_volume || 0) - Number(d.discount_volume || 0)} م³`);
        });
        
        const crusherMaterialMap = {};
        crusherDeliveries.forEach(d => {
            // Normalize material names
            let normalizedMaterial = (d.material || 'غير محدد').toString().trim();
            switch (normalizedMaterial) {
                case 'سن1':
                    normalizedMaterial = 'سن 1';
                    break;
                case 'سن2':
                    normalizedMaterial = 'سن 2';
                    break;
                case 'سن3':
                    normalizedMaterial = 'سن 3';
                    break;
            }
            
            if (!crusherMaterialMap[normalizedMaterial]) crusherMaterialMap[normalizedMaterial] = { totalQty: 0, totalValue: 0 };
            const carVolume = Number(d.car_volume || 0);
            const discount = Number(d.discount_volume || 0);
            const netQtyForCrusher = Math.max(carVolume - discount, 0);
            crusherMaterialMap[normalizedMaterial].totalQty += netQtyForCrusher;
            crusherMaterialMap[normalizedMaterial].totalValue += Number(d.crusher_total_cost || 0);
        });
        
        console.log('\nبعد التجميع:');
        Object.keys(crusherMaterialMap).forEach(material => {
            console.log(`  - ${material}: ${crusherMaterialMap[material].totalQty} م³ (${crusherMaterialMap[material].totalValue} جنيه)`);
        });
        
        console.log('\n✅ تم اختبار تجميع المواد بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error);
    } finally {
        process.exit(0);
    }
}

testMaterialGroupingFix();