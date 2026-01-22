const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 فحص هيكل جدول الكسارات...');

// Check crushers table schema
db.all("PRAGMA table_info(crushers)", [], (err, columns) => {
    if (err) {
        console.error('❌ خطأ في قراءة هيكل الجدول:', err);
        db.close();
        return;
    }
    
    console.log('\n📋 أعمدة جدول crushers:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Check deliveries table schema
    db.all("PRAGMA table_info(deliveries)", [], (err, deliveryColumns) => {
        if (err) {
            console.error('❌ خطأ في قراءة هيكل جدول deliveries:', err);
            db.close();
            return;
        }
        
        console.log('\n📋 أعمدة جدول deliveries:');
        deliveryColumns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Get sample data
        db.all("SELECT * FROM crushers LIMIT 1", [], (err, crushers) => {
            if (err) {
                console.error('❌ خطأ في قراءة بيانات الكسارات:', err);
                db.close();
                return;
            }
            
            console.log('\n📊 عينة من بيانات الكسارات:');
            if (crushers.length > 0) {
                console.log(JSON.stringify(crushers[0], null, 2));
            } else {
                console.log('لا توجد بيانات');
            }
            
            db.close();
        });
    });
});