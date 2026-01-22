const mysql = require('mysql2/promise');

async function checkContractorData() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'distribution_system'
        });

        console.log('🔍 فحص بيانات المقاولين...');

        // Get all contractors
        const [contractors] = await connection.execute('SELECT * FROM contractors');
        console.log(`📊 عدد المقاولين: ${contractors.length}`);

        for (const contractor of contractors) {
            console.log(`\n--- ${contractor.name} (ID: ${contractor.id}) ---`);
            console.log(`الرصيد الافتتاحي: ${contractor.opening_balance} جنيه`);

            // Get deliveries for this contractor
            const [deliveries] = await connection.execute(`
                SELECT * FROM deliveries 
                WHERE contractor_id = ?
            `, [contractor.id]);

            console.log(`عدد التسليمات: ${deliveries.length}`);

            let totalTrips = 0;
            deliveries.forEach(d => {
                const charge = Number(d.contractor_total_charge || 0);
                totalTrips += charge;
                console.log(`  - تسليم ${d.id}: ${d.quantity} م³ × ${d.contractor_charge_per_meter} = ${charge} جنيه`);
            });

            console.log(`إجمالي التسليمات: ${totalTrips} جنيه`);

            // Get payments for this contractor
            const [payments] = await connection.execute(`
                SELECT * FROM contractor_payments 
                WHERE contractor_id = ?
            `, [contractor.id]);

            let totalPayments = 0;
            payments.forEach(p => {
                totalPayments += Number(p.amount || 0);
            });

            console.log(`عدد المدفوعات: ${payments.length}`);
            console.log(`إجمالي المدفوعات: ${totalPayments} جنيه`);

            // Get adjustments
            const [adjustments] = await connection.execute(`
                SELECT * FROM adjustments 
                WHERE entity_type = 'contractor' AND entity_id = ?
            `, [contractor.id]);

            let totalAdjustments = 0;
            adjustments.forEach(a => {
                totalAdjustments += Number(a.amount || 0);
            });

            console.log(`عدد التسويات: ${adjustments.length}`);
            console.log(`إجمالي التسويات: ${totalAdjustments} جنيه`);

            const balance = Number(contractor.opening_balance || 0) + totalTrips + totalAdjustments - totalPayments;
            console.log(`الرصيد المحسوب: ${balance} جنيه`);
        }

        await connection.end();

    } catch (error) {
        console.error('❌ خطأ في الاتصال بـ MySQL:', error.message);
    }
}

checkContractorData();