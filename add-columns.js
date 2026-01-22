const db = require('./backend/db');

async function addColumns() {
  try {
    console.log('🔧 Adding new columns to deliveries table...');
    
    // Add new columns
    await db.raw(`
      ALTER TABLE deliveries 
      ADD COLUMN contractor_charge_per_meter DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN contractor_total_charge DECIMAL(12,2) DEFAULT 0
    `);
    
    console.log('✅ Columns added successfully');
    
    // Now update existing data
    const deliveries = await db('deliveries').select('*');
    
    for (const delivery of deliveries) {
      const quantity = Number(delivery.quantity || 0);
      const contractorCharge = Number(delivery.contractor_charge || 0);
      
      const contractorChargePerMeter = quantity > 0 ? contractorCharge / quantity : 0;
      const contractorTotalCharge = contractorCharge; // Same as existing contractor_charge
      
      await db('deliveries')
        .where('id', delivery.id)
        .update({
          contractor_charge_per_meter: contractorChargePerMeter,
          contractor_total_charge: contractorTotalCharge
        });
      
      console.log(`✅ Updated delivery ${delivery.id}: ${contractorChargePerMeter} EGP/m³, total: ${contractorTotalCharge} EGP`);
    }
    
    console.log('🎉 All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addColumns();