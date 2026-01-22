const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 فحص التسليمات الموجودة...');

// Check existing deliveries
db.all("SELECT * FROM deliveries ORDER BY created_at DESC LIMIT 5", [], (err, deliveries) => {
    if (err) {
        console.error('❌ خطأ في قراءة البيانات:', err);
        db.close();
        return;
    }
    
    console.log(`\n📊 عدد التسليمات: ${deliveries.length}`);
    
    if (deliveries.length > 0) {
        console.log('\n📋 التسليمات الموجودة:');
        deliveries.forEach((delivery, index) => {
            console.log(`\n--- التسليم ${index + 1} ---`);
            console.log(`ID: ${delivery.id}`);
            console.log(`العميل: ${delivery.client_id}`);
            console.log(`المادة: ${delivery.material}`);
            console.log(`الكمية المسلمة: ${delivery.quantity} م³`);
            console.log(`تكعيب السيارة: ${delivery.car_volume} م³`);
            console.log(`خصم الأمتار: ${delivery.discount_volume} م³`);
            console.log(`مستحق المقاول (القديم): ${delivery.contractor_charge} جنيه`);
            console.log(`مستحق المقاول لكل متر: ${delivery.contractor_charge_per_meter} جنيه`);
            console.log(`إجمالي مستحق المقاول: ${delivery.contractor_total_charge} جنيه`);
            console.log(`سعر المادة التاريخي: ${delivery.material_price_at_time} جنيه`);
            console.log(`تكلفة الكسارة: ${delivery.crusher_total_cost} جنيه`);
        });
    } else {
        console.log('لا توجد تسليمات');
    }
    
    db.close();
});