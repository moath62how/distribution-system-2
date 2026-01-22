const mysql = require('mysql2/promise');

async function checkContractorPaymentsSchema() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'distribution_system'
        });

        console.log('🔍 فحص هيكل جدول contractor_payments...');

        // Check table structure
        const [columns] = await connection.execute('DESCRIBE contractor_payments');
        
        console.log('\n📋 أعمدة جدول contractor_payments:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? col.Key : ''}`);
        });

        await connection.end();

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
}

checkContractorPaymentsSchema();