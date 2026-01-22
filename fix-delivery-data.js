const db = require('./backend/db');

async function fixDeliveryData() {
  try {
    console.log('🔧 Starting to fix existing delivery data with correct logic...');
    
    // Get all deliveries that need fixing
    const deliveries = await db('deliveries').select('*');
    
    console.log(`📦 Found ${deliveries.length} deliveries to fix`);
    
    if (deliveries.length === 0) {
      console.log('✅ No deliveries need fixing');
      process.exit(0);
    }
    
    // Get all crushers with their current prices
    const crushers = await db('crushers').select('*');
    const crusherPrices = {};
    
    crushers.forEach(crusher => {
      crusherPrices[crusher.id] = {
        'رمل': crusher.sand_price || 45,
        'سن 1': crusher.aggregate1_price || 50,
        'سن 2': crusher.aggregate2_price || 48,
        'سن 3': crusher.aggregate3_price || 46
      };
    });
    
    console.log('💰 Crusher prices loaded:', crusherPrices);
    
    // Fix each delivery
    for (const delivery of deliveries) {
      const crusherId = delivery.crusher_id;
      const material = delivery.material;
      const quantity = Number(delivery.quantity || 0);
      const carVolume = Number(delivery.car_volume || 0);
      const discountVolume = Number(delivery.discount_volume || 0);
      
      // Get the appropriate price for this material from this crusher
      let materialPrice = 0;
      if (crusherPrices[crusherId] && crusherPrices[crusherId][material]) {
        materialPrice = Number(crusherPrices[crusherId][material]);
      } else {
        // Set a default price based on material type if crusher price not found
        switch (material) {
          case 'رمل':
            materialPrice = 45;
            break;
          case 'سن 1':
            materialPrice = 50;
            break;
          case 'سن 2':
            materialPrice = 48;
            break;
          case 'سن 3':
            materialPrice = 46;
            break;
          default:
            materialPrice = 47;
        }
        console.log(`⚠️  Using default price ${materialPrice} for material "${material}" from crusher ${crusherId}`);
      }
      
      // Calculate crusher total cost: (car_volume - discount_volume) × material_price
      const netQuantity = carVolume - discountVolume;
      const crusherTotalCost = netQuantity * materialPrice;
      
      // Calculate contractor charges
      const contractorChargePerMeter = delivery.contractor_charge ? Number(delivery.contractor_charge) / quantity : 0;
      const contractorTotalCharge = quantity * contractorChargePerMeter;
      
      // Update the delivery
      await db('deliveries')
        .where('id', delivery.id)
        .update({
          material_price_at_time: materialPrice,
          crusher_total_cost: crusherTotalCost,
          contractor_charge_per_meter: contractorChargePerMeter,
          contractor_total_charge: contractorTotalCharge
        });
      
      console.log(`✅ Fixed delivery ${delivery.id}:`);
      console.log(`   Material: ${material}, Price: ${materialPrice} EGP/m³`);
      console.log(`   Crusher: ${netQuantity} m³ × ${materialPrice} = ${crusherTotalCost} EGP`);
      console.log(`   Contractor: ${quantity} m³ × ${contractorChargePerMeter} = ${contractorTotalCharge} EGP`);
    }
    
    console.log('\n🎉 All deliveries fixed successfully!');
    console.log('📋 Summary:');
    console.log(`   • ${deliveries.length} deliveries updated`);
    console.log('   • Historical prices set based on current crusher prices');
    console.log('   • Crusher total costs calculated correctly');
    console.log('   • Contractor charges converted to per-meter rates');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing delivery data:', error);
    process.exit(1);
  }
}

fixDeliveryData();