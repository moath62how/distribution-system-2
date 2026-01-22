const fetch = require('node-fetch');

async function testAPIResponse() {
    console.log('🌐 اختبار استجابة API...\n');
    
    try {
        // Test client details API
        console.log('📊 اختبار تفاصيل العميل:');
        const clientResponse = await fetch('http://localhost:5000/api/clients/1');
        const clientData = await clientResponse.json();
        
        console.log('ملخص المواد من API:');
        if (clientData.materialTotals) {
            clientData.materialTotals.forEach(m => {
                console.log(`  - ${m.material}: ${m.totalQty} م³ (${m.totalValue} جنيه)`);
            });
        }
        
        console.log('\nالتسليمات من API:');
        if (clientData.deliveries) {
            clientData.deliveries.slice(0, 3).forEach(d => {
                console.log(`  - ${d.material}: ${d.quantity} م³ × ${d.price_per_meter} = ${d.total_value} جنيه`);
            });
        }
        
        // Test crusher details API
        console.log('\n📊 اختبار تفاصيل الكسارة:');
        const crusherResponse = await fetch('http://localhost:5000/api/crushers/1');
        const crusherData = await crusherResponse.json();
        
        console.log('ملخص المواد للكسارة من API:');
        if (crusherData.materialTotals) {
            crusherData.materialTotals.forEach(m => {
                console.log(`  - ${m.material}: ${m.totalQty} م³ (${m.totalValue} جنيه)`);
            });
        }
        
        console.log('\nالتسليمات للكسارة من API:');
        if (crusherData.deliveries) {
            crusherData.deliveries.forEach(d => {
                const netQty = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
                console.log(`  - ${d.material}: ${netQty} م³ × ${d.material_price_at_time} = ${d.crusher_total_cost} جنيه`);
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ في API:', error.message);
    } finally {
        process.exit(0);
    }
}

testAPIResponse();