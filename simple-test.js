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

async function testAPI() {
    console.log('🌐 اختبار API...\n');
    
    try {
        // Test client API
        console.log('📊 اختبار تفاصيل العميل:');
        const clientData = await makeRequest('/api/clients/1');
        
        if (clientData.materialTotals) {
            console.log('ملخص المواد:');
            clientData.materialTotals.forEach(m => {
                console.log(`  - ${m.material}: ${m.totalQty} م³ (${m.totalValue} جنيه)`);
            });
        }
        
        if (clientData.totals) {
            console.log('\nإجماليات العميل:');
            console.log(`  الرصيد الافتتاحي: ${clientData.totals.openingBalance} جنيه`);
            console.log(`  إجمالي التوريدات: ${clientData.totals.totalDeliveries} جنيه`);
            console.log(`  إجمالي المدفوعات: ${clientData.totals.totalPayments} جنيه`);
            console.log(`  الرصيد الصافي: ${clientData.totals.balance} جنيه`);
        }
        
        // Test crusher API
        console.log('\n📊 اختبار تفاصيل الكسارة:');
        const crusherData = await makeRequest('/api/crushers/1');
        
        if (crusherData.materialTotals) {
            console.log('ملخص المواد للكسارة:');
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
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        process.exit(0);
    }
}

testAPI();