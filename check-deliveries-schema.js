const db = require('./backend/db');

async function checkDeliveriesSchema() {
    console.log('🔍 فحص بنية جدول التسليمات...\n');
    
    try {
        // Check table structure
        const columns = await db.raw('DESCRIBE deliveries');
        console.log('📋 أعمدة جدول deliveries:');
        columns[0].forEach(col => {
            console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        console.log('\n🔍 فحص بيانات عينة من التسليمات...');
        const sampleDeliveries = await db('deliveries')
            .select('*')
            .limit(3);
        
        console.log('\n📦 عينة من التسليمات:');
        sampleDeliveries.forEach((d, index) => {
            console.log(`\nتسليمة ${index + 1}:`);
            Object.keys(d).forEach(key => {
                console.log(`  ${key}: ${d[key]}`);
            });
        });
        
    } catch (error) {
        console.error('❌ خطأ في فحص البنية:', error);
    } finally {
        process.exit(0);
    }
}

checkDeliveriesSchema();