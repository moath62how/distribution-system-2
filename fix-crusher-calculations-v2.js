const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 بدء إصلاح حسابات الكسارة...');

// Function to convert value to number
const toNumber = (v) => Number(v || 0);

async function fixCrusherCalculations() {
    return new Promise((resolve, reject) => {
        // Get all deliveries that need fixing
        db.all(`
            SELECT * FROM deliveries
            WHERE car_volume IS NOT NULL AND car_volume > 0
        `, [], async (err, deliveries) => {
            if (err) {
                console.error('❌ خطأ في قراءة البيانات:', err);
                reject(err);
                return;
            }

            console.log(`📊 تم العثور على ${deliveries.length} تسليم للإصلاح`);

            let fixedCount = 0;
            let errors = 0;

            for (const delivery of deliveries) {
                try {
                    // Use existing material_price_at_time if available, otherwise skip
                    const materialPriceAtTime = toNumber(delivery.material_price_at_time);
                    
                    if (materialPriceAtTime <= 0) {
                        console.log(`⚠️  تخطي التسليم ${delivery.id}: سعر المادة غير محدد`);
                        continue;
                    }

                    // Calculate correct values
                    const carVol = toNumber(delivery.car_volume);
                    const discount = Math.max(toNumber(delivery.discount_volume), 0);
                    const deliveredQuantity = toNumber(delivery.quantity);
                    
                    // CORRECTED CALCULATIONS
                    const netQuantityForClient = Math.max(deliveredQuantity - discount, 0);
                    const netQuantityForCrusher = Math.max(carVol - discount, 0); // Use car volume for crusher
                    
                    const clientUnitPrice = toNumber(delivery.price_per_meter);
                    const contractorRate = toNumber(delivery.contractor_charge_per_meter || delivery.contractor_charge);
                    
                    // Calculate totals
                    const totalValueToClient = netQuantityForClient * clientUnitPrice;
                    const crusherTotalCost = netQuantityForCrusher * materialPriceAtTime; // Use car volume
                    const contractorTotalCharge = netQuantityForClient * contractorRate;

                    // Update the delivery record
                    await new Promise((updateResolve, updateReject) => {
                        db.run(`
                            UPDATE deliveries 
                            SET 
                                net_quantity = ?,
                                total_value = ?,
                                crusher_total_cost = ?
                            WHERE id = ?
                        `, [
                            netQuantityForClient,
                            totalValueToClient,
                            crusherTotalCost,
                            delivery.id
                        ], function(updateErr) {
                            if (updateErr) {
                                updateReject(updateErr);
                            } else {
                                updateResolve();
                            }
                        });
                    });

                    console.log(`✅ تم إصلاح التسليم ${delivery.id}:`);
                    console.log(`   - تكعيب السيارة: ${carVol} م³`);
                    console.log(`   - الكمية المسلمة: ${deliveredQuantity} م³`);
                    console.log(`   - خصم الأمتار: ${discount} م³`);
                    console.log(`   - الكمية الصافية للعميل: ${netQuantityForClient} م³`);
                    console.log(`   - الكمية الصافية للكسارة: ${netQuantityForCrusher} م³`);
                    console.log(`   - تكلفة الكسارة الجديدة: ${crusherTotalCost} جنيه`);
                    console.log(`   - قيمة العميل الجديدة: ${totalValueToClient} جنيه`);
                    console.log('');

                    fixedCount++;

                } catch (error) {
                    console.error(`❌ خطأ في إصلاح التسليم ${delivery.id}:`, error.message);
                    errors++;
                }
            }

            console.log(`\n📈 تم الانتهاء من الإصلاح:`);
            console.log(`✅ تم إصلاح: ${fixedCount} تسليم`);
            console.log(`❌ أخطاء: ${errors} تسليم`);
            
            resolve({ fixed: fixedCount, errors });
        });
    });
}

// Run the fix
fixCrusherCalculations()
    .then(result => {
        console.log('\n🎉 تم إكمال إصلاح حسابات الكسارة بنجاح!');
        db.close();
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 فشل في إصلاح البيانات:', error);
        db.close();
        process.exit(1);
    });