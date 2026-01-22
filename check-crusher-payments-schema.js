const mysql = require('mysql2/promise');

async function checkCrusherPaymentsSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'distribution_system'
        });

        console.log('🔍 فحص هيكل جدول crusher_payments...');

        // Check table structure
        const [columns] = await connection.execute('DESCRIBE crusher_payments');
        
        console.log('\n📋 أعمدة جدول crusher_payments:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''}`);
        });

        // Check sample data
        const [payments] = await connection.execute('SELECT * FROM crusher_payments LIMIT 3');
        
        console.log('\n📊 عينة من البيانات:');
        payments.forEach((payment, index) => {
            console.log(`\n--- الدفعة ${index + 1} ---`);
            Object.keys(payment).forEach(key => {
                console.log(`${key}: ${payment[key]}`);
            });
        });

        await connection.end();

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
}

checkCrusherPaymentsSchema();