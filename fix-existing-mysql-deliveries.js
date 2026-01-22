const mysql = require('mysql2/promise');

async function fixExistingDeliveries() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'distribution_system'
        });

        console.log('🔧 إصلاح التسليمات الموجودة في MySQL...');

        // Get all deliveries that need fixing
        const [deliveries] = await connection.execute(`
            SELECT d.*, c.name as client_name, cr.name as crusher_name
            FROM deliveries d
            LEFT JOIN clients c ON d.client_id = c.id
            LEFT JOIN crushers cr ON d.crusher_id = cr.id
        `);

        console.log(`📊 تم العثور على ${deliveries.length} تسليم للإصلاح`);

        let fixedCount = 0;

        for (const delivery of deliveries) {
            try {
                const deliveredQuantity = Number(delivery.quantity || 0);
                const discount = Number(delivery.discount_volume || 0);
                const contractorRate = Number(delivery.contractor_charge_per_meter || 0);
                
                // Calculate correct contractor total charge (full quantity before discount)
                const contractorTotalCharge = deliveredQuantity * contractorRate;

                // Update the delivery record
                await connection.execute(`
                    UPDATE deliveries 
                    SET contractor_total_charge = ?
                    WHERE id = ?
                `, [contractorTotalCharge, delivery.id]);

                console.log(`✅ تم إصلاح التسليم ${delivery.id}:`);
                console.log(`   - العميل: ${delivery.client_name}`);
                console.log(`   - الكسارة: ${delivery.crusher_name}`);
                console.log(`   - الكمية المسلمة: ${deliveredQuantity} م³`);
                console.log(`   - مستحق المقاول لكل متر: ${contractorRate} جنيه`);
                console.log(`   - إجمالي مستحق المقاول الجديد: ${contractorTotalCharge} جنيه`);
                console.log(`   - (الحساب: ${deliveredQuantity} × ${contractorRate} = ${contractorTotalCharge})`);
                console.log('');

                fixedCount++;

            } catch (error) {
                console.error(`❌ خطأ في إصلاح التسليم ${delivery.id}:`, error.message);
            }
        }

        console.log(`\n📈 تم الانتهاء من الإصلاح:`);
        console.log(`✅ تم إصلاح: ${fixedCount} تسليم`);

        // Show updated data
        console.log('\n📋 البيانات بعد الإصلاح:');
        const [updatedDeliveries] = await connection.execute(`
            SELECT d.*, c.name as client_name, cr.name as crusher_name
            FROM deliveries d
            LEFT JOIN clients c ON d.client_id = c.id
            LEFT JOIN crushers cr ON d.crusher_id = cr.id
            ORDER BY d.created_at DESC
        `);

        updatedDeliveries.forEach((delivery, index) => {
            console.log(`\n--- التسليم ${index + 1} ---`);
            console.log(`العميل: ${delivery.client_name}`);
            console.log(`الكمية: ${delivery.quantity} م³`);
            console.log(`مستحق المقاول لكل متر: ${delivery.contractor_charge_per_meter} جنيه`);
            console.log(`إجمالي مستحق المقاول: ${delivery.contractor_total_charge} جنيه`);
        });

        await connection.end();
        console.log('\n🎉 تم إكمال الإصلاح بنجاح!');

    } catch (error) {
        console.error('❌ خطأ في الاتصال بـ MySQL:', error.message);
    }
}

fixExistingDeliveries();