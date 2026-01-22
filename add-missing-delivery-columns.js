const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 إضافة الأعمدة المفقودة لجدول deliveries...');

const columnsToAdd = [
    'contractor_charge_per_meter FLOAT DEFAULT 0',
    'contractor_total_charge FLOAT DEFAULT 0',
    'material_price_at_time FLOAT DEFAULT 0',
    'crusher_total_cost FLOAT DEFAULT 0'
];

async function addColumns() {
    for (const column of columnsToAdd) {
        try {
            await new Promise((resolve, reject) => {
                db.run(`ALTER TABLE deliveries ADD COLUMN ${column}`, function(err) {
                    if (err) {
                        if (err.message.includes('duplicate column name')) {
                            console.log(`✓ العمود ${column.split(' ')[0]} موجود بالفعل`);
                        } else {
                            console.error(`❌ خطأ في إضافة العمود ${column}:`, err.message);
                            reject(err);
                            return;
                        }
                    } else {
                        console.log(`✅ تم إضافة العمود ${column.split(' ')[0]} بنجاح`);
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error(`💥 فشل في إضافة العمود ${column}:`, error);
        }
    }
    
    console.log('\n🎉 تم الانتهاء من إضافة الأعمدة!');
    
    // Check the updated schema
    db.all("PRAGMA table_info(deliveries)", [], (err, columns) => {
        if (err) {
            console.error('❌ خطأ في قراءة الهيكل المحدث:', err);
        } else {
            console.log('\n📋 هيكل الجدول المحدث:');
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type})`);
            });
        }
        
        db.close();
    });
}

addColumns();