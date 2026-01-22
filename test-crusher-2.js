const http = require('http');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

async function testCrusher2() {
    console.log('🌐 اختبار كسارة الجهامات...\n');
    
    try {
        const crusherData = await makeRequest('/api/crushers/2');
        
        console.log('📊 تفاصيل كسارة الجهامات:');
        
        if (crusherData.materialTotals) {
            console.log('ملخص المواد:');
            crusherData.materialTotals.forEach(m => {
                console.log(`  - ${m.material}: ${m.totalQty} م³ (${m.totalValue} جنيه)`);
            });
        }
        
        if (crusherData.totals) {
            console.log('\nإجماليات الكسارة:');
            console.log(`  إجمالي المطلوب: ${crusherData.totals.totalRequired} جنيه`);
            console.log(`  إجمالي المدفوع: ${crusherData.totals.totalPaid} جنيه`);
            console.log(`  الرصيد الصافي: ${crusherData.totals.net} جنيه`);
        }
        
        if (crusherData.deliveries) {
            console.log('\nالتسليمات:');
            crusherData.deliveries.forEach(d => {
                const netQty = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
                console.log(`  - ${d.material}: تكعيب ${d.car_volume} - خصم ${d.discount_volume} = ${netQty} م³`);
                console.log(`    سعر الكسارة: ${d.material_price_at_time} جنيه/م³`);
                console.log(`    تكلفة الكسارة: ${d.crusher_total_cost} جنيه`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        process.exit(0);
    }
}

testCrusher2();