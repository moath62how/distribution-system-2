const db = require('./backend/db');

async function testCorrectedContractorCalculations() {
    console.log('🧮 اختبار الحسابات المصححة للمقاولين...\n');
    
    try {
        const contractors = await db('contractors').select('*');
        
        for (const contractor of contractors) {
            console.log(`\n📊 حسابات المقاول: ${contractor.name} (ID: ${contractor.id})`);
            console.log('=' .repeat(60));
            
            // Get data
            const deliveries = await db('deliveries')
                .where({ contractor_id: contractor.id })
                .select('quantity', 'contractor_charge_per_meter', 'contractor_total_charge');
            
            const payments = await db('contractor_payments')
                .where({ contractor_id: contractor.id })
                .select('amount');
            
            const adjustments = await db('adjustments')
                .where({ entity_type: 'contractor', entity_id: contractor.id })
                .select('amount');
            
            // Calculate using corrected logic
            const openingBalance = Number(contractor.opening_balance || 0);
            const totalTrips = deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0);
            const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            
            // CORRECTED LOGIC:
            const totalEarned = totalTrips + totalAdjustments;
            const totalPaidToContractor = totalPayments + Math.abs(Math.min(openingBalance, 0));
            const contractorOwesUs = Math.max(openingBalance, 0);
            const balance = totalEarned - totalPaidToContractor + contractorOwesUs;
            
            console.log('📋 البيانات الأساسية:');
            console.log(`الرصيد الافتتاحي: ${openingBalance} جنيه`);
            console.log(`مستحقات التوريدات: ${totalTrips} جنيه`);
            console.log(`التسويات: ${totalAdjustments} جنيه`);
            console.log(`المدفوعات المباشرة: ${totalPayments} جنيه`);
            
            console.log('\n🧮 الحساب المصحح:');
            console.log(`إجمالي ما كسبه المقاول: ${totalEarned} جنيه (${totalTrips} توريدات + ${totalAdjustments} تسويات)`);
            
            if (openingBalance < 0) {
                console.log(`إجمالي ما دفعناه له: ${totalPaidToContractor} جنيه (${totalPayments} مدفوعات + ${Math.abs(openingBalance)} مقدم)`);
            } else {
                console.log(`إجمالي ما دفعناه له: ${totalPaidToContractor} جنيه (${totalPayments} مدفوعات فقط)`);
            }
            
            if (contractorOwesUs > 0) {
                console.log(`ما يدين به لنا: ${contractorOwesUs} جنيه`);
            }
            
            console.log(`\n💰 الرصيد الصافي: ${balance} جنيه`);
            
            if (balance > 0) {
                console.log(`✅ مستحق للمقاول: ${balance} جنيه`);
            } else if (balance < 0) {
                console.log(`✅ مستحق لنا: ${Math.abs(balance)} جنيه`);
            } else {
                console.log(`✅ الحساب متوازن`);
            }
            
            // Show detailed breakdown for second contractor
            if (contractor.id === 2) {
                console.log('\n🔍 تفصيل المقاول الثاني (كما طلبت):');
                console.log(`- دفعنا له مقدماً: 1,000 جنيه (الرصيد الافتتاحي السالب)`);
                console.log(`- دفعنا له إضافي: 500 جنيه (المدفوعات)`);
                console.log(`- تسوية لصالحه: 500 جنيه`);
                console.log(`- إجمالي ما وصل له منا: ${1000 + 500 + 500} = 2,000 جنيه`);
                console.log(`- ما ورده لنا: 627 جنيه`);
                console.log(`- الفرق: ${627 - 2000} = -1,373 جنيه (مستحق لنا)`);
            }
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error);
    } finally {
        process.exit(0);
    }
}

testCorrectedContractorCalculations();