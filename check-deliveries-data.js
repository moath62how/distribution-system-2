const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 فحص بيانات التسليمات...');

// Check deliveries data
db.all("SELECT * FROM deliveries LIMIT 5", [], (err, deliveries) => {
    if (err) {
        console.error('❌ خطأ في قراءة البيانات:', err);
        db.close();
        return;
    }
    
    console.log(`\n📊 عدد التسليمات: ${deliveries.length}`);
    
    if (deliveries.length > 0) {
        console.log('\n📋 عينة من البيانات:');
        deliveries.forEach((delivery, index) => {
            console.log(`\n--- التسليم ${index + 1} ---`);
            console.log(`ID: ${delivery.id}`);
            console.log(`المادة: ${delivery.material}`);
            console.log(`الكمية: ${delivery.quantity}`);
            console.log(`تكعيب السيارة: ${delivery.car_volume}`);
            console.log(`خصم الأمتار: ${delivery.discount_volume}`);
            console.log(`الكمية الصافية: ${delivery.net_quantity}`);
            console.log(`سعر المادة التاريخي: ${delivery.material_price_at_time}`);
            console.log(`تكلفة الكسارة: ${delivery.crusher_total_cost}`);
        });
    } else {
        console.log('لا توجد تسليمات');
    }
    
    // Check count with car_volume
    db.get("SELECT COUNT(*) as count FROM deliveries WHERE car_volume IS NOT NULL AND car_volume > 0", [], (err, result) => {
        if (err) {
            console.error('❌ خطأ في العد:', err);
        } else {
            console.log(`\n📈 عدد التسليمات التي بها تكعيب سيارة: ${result.count}`);
        }
        
        db.close();
    });
});