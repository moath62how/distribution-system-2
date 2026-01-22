const mysql = require('mysql2/promise');

async function checkMySQLDeliveries() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'distribution_system'
        });

        console.log('🔍 فحص تسليمات MySQL...');

        // Check deliveries count
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM deliveries');
        console.log(`📊 عدد التسليمات: ${countResult[0].count}`);

        if (countResult[0].count > 0) {
            // Get recent deliveries
            const [deliveries] = await connection.execute(`
                SELECT d.*, c.name as client_name, cr.name as crusher_name, ct.name as contractor_name
                FROM deliveries d
                LEFT JOIN clients c ON d.client_id = c.id
                LEFT JOIN crushers cr ON d.crusher_id = cr.id
                LEFT JOIN contractors ct ON d.contractor_id = ct.id
                ORDER BY d.created_at DESC
                LIMIT 5
            `);

            console.log('\n📋 التسليمات الأخيرة:');
            deliveries.forEach((delivery, index) => {
                console.log(`\n--- التسليم ${index + 1} ---`);
                console.log(`ID: ${delivery.id}`);
                console.log(`العميل: ${delivery.client_name}`);
                console.log(`الكسارة: ${delivery.crusher_name}`);
                console.log(`المقاول: ${delivery.contractor_name}`);
                console.log(`المادة: ${delivery.material}`);
                console.log(`الكمية المسلمة: ${delivery.quantity} م³`);
                console.log(`تكعيب السيارة: ${delivery.car_volume} م³`);
                console.log(`خصم الأمتار: ${delivery.discount_volume} م³`);
                console.log(`مستحق المقاول (القديم): ${delivery.contractor_charge} جنيه`);
                console.log(`مستحق المقاول لكل متر: ${delivery.contractor_charge_per_meter} جنيه`);
                console.log(`إجمالي مستحق المقاول: ${delivery.contractor_total_charge} جنيه`);
            });
        }

        await connection.end();
    } catch (error) {
        console.error('❌ خطأ في الاتصال بـ MySQL:', error.message);
    }
}

checkMySQLDeliveries();