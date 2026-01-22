const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 فحص جداول قاعدة البيانات...');

// Check all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('❌ خطأ في قراءة الجداول:', err);
        db.close();
        return;
    }
    
    console.log('\n📋 الجداول الموجودة:');
    tables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    // Check deliveries count
    db.get("SELECT COUNT(*) as count FROM deliveries", [], (err, result) => {
        if (err) {
            console.error('❌ خطأ في عد التسليمات:', err);
        } else {
            console.log(`\n📊 عدد التسليمات: ${result.count}`);
        }
        
        // Check if there are any records with contractor_charge_per_meter
        db.all("SELECT id, contractor_charge, contractor_charge_per_meter, contractor_total_charge FROM deliveries LIMIT 5", [], (err, deliveries) => {
            if (err) {
                console.error('❌ خطأ في قراءة التسليمات:', err);
            } else {
                console.log('\n📋 عينة من بيانات المقاولين:');
                deliveries.forEach(d => {
                    console.log(`ID ${d.id}: contractor_charge=${d.contractor_charge}, contractor_charge_per_meter=${d.contractor_charge_per_meter}, contractor_total_charge=${d.contractor_total_charge}`);
                });
            }
            
            db.close();
        });
    });
});