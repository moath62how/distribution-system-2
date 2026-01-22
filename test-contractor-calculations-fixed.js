const db = require('./backend/db');

async function testContractorCalculationsFixed() {
    console.log('🧮 اختبار حسابات المقاولين بعد الإصلاح...\n');
    
    try {
        // Test the contractor totals function
        const contractors = await db('contractors').select('*');
        
        for (const contractor of contractors) {
            console.log(`\n📊 اختبار حسابات المقاول: ${contractor.name} (ID: ${contractor.id})`);
            console.log('=' .repeat(50));
            
            // Manual calculation
            const deliveries = await db('deliveries')
                .where({ contractor_id: contractor.id })
                .select('quantity', 'contractor_charge_per_meter', 'contractor_total_charge');
            
            const payments = await db('contractor_payments')
                .where({ contractor_id: contractor.id })
                .select('amount');
            
            const adjustments = await db('adjustments')
                .where({ entity_type: 'contractor', entity_id: contractor.id })
                .select('amount');
            
            // Calculate manually
            const manualTotalTrips = deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0);
            const manualTotalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const manualTotalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const manualOpeningBalance = Number(contractor.opening_balance || 0);
            const manualBalance = manualOpeningBalance + manualTotalTrips + manualTotalAdjustments - manualTotalPayments;
            
            console.log('🔢 الحساب اليدوي:');
            console.log(`الرصيد الافتتاحي: ${manualOpeningBalance} جنيه`);
            console.log(`إجمالي مستحقات التسليمات: ${manualTotalTrips} جنيه`);
            console.log(`إجمالي التسويات: ${manualTotalAdjustments} جنيه`);
            console.log(`إجمالي المدفوعات: ${manualTotalPayments} جنيه`);
            console.log(`الرصيد الصافي: ${manualBalance} جنيه`);
            
            // Test the API function
            const apiResult = await fetch(`http://localhost:5000/api/contractors/${contractor.id}`)
                .then(res => res.json())
                .catch(() => null);
            
            if (apiResult && apiResult.totals) {
                console.log('\n🌐 نتيجة API:');
                console.log(`الرصيد الافتتاحي: ${apiResult.totals.openingBalance} جنيه`);
                console.log(`إجمالي مستحقات التسليمات: ${apiResult.totals.totalTrips} جنيه`);
                console.log(`إجمالي التسويات: ${apiResult.totals.totalAdjustments} جنيه`);
                console.log(`إجمالي المدفوعات: ${apiResult.totals.totalPayments} جنيه`);
                console.log(`الرصيد الصافي: ${apiResult.totals.balance} جنيه`);
                
                // Compare results
                const isMatching = (
                    Math.abs(manualBalance - apiResult.totals.balance) < 0.01 &&
                    Math.abs(manualTotalTrips - apiResult.totals.totalTrips) < 0.01 &&
                    Math.abs(manualTotalPayments - apiResult.totals.totalPayments) < 0.01 &&
                    Math.abs(manualTotalAdjustments - apiResult.totals.totalAdjustments) < 0.01
                );
                
                if (isMatching) {
                    console.log('\n✅ الحسابات متطابقة بين الحساب اليدوي و API');
                } else {
                    console.log('\n❌ هناك اختلاف بين الحسابات!');
                }
            } else {
                console.log('\n⚠️  لا يمكن الوصول إلى API (تأكد من تشغيل الخادم)');
            }
            
            // Show delivery details
            console.log('\n📦 تفاصيل التسليمات:');
            deliveries.forEach((d, index) => {
                const calculated = Number(d.quantity || 0) * Number(d.contractor_charge_per_meter || 0);
                const stored = Number(d.contractor_total_charge || 0);
                console.log(`  ${index + 1}. ${d.quantity} م³ × ${d.contractor_charge_per_meter} = ${calculated} (محفوظ: ${stored})`);
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error);
    } finally {
        process.exit(0);
    }
}

testContractorCalculationsFixed();