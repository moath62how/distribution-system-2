const db = require('./db');

async function seedMoreData() {
  try {
    console.log('🌱 Adding more test data...');
    
    // Ensure tables exist
    await db.ensureTables();
    
    // Check if we already have deliveries
    const existingDeliveries = await db('deliveries').count('id as count').first();
    
    if (existingDeliveries.count > 0) {
      console.log('📊 Deliveries already exist. Skipping seed.');
      return;
    }
    
    // Get existing IDs
    const clients = await db('clients').select('id');
    const contractors = await db('contractors').select('id');
    const crushers = await db('crushers').select('id');
    
    if (clients.length === 0 || contractors.length === 0 || crushers.length === 0) {
      console.log('❌ Need clients, contractors, and crushers first. Run seed-data.js first.');
      return;
    }
    
    // Add some test deliveries
    const deliveries = [];
    const materials = ['رمل', 'زلط', 'حصى', 'دقشوم'];
    
    for (let i = 0; i < 15; i++) {
      const clientId = clients[Math.floor(Math.random() * clients.length)].id;
      const contractorId = contractors[Math.floor(Math.random() * contractors.length)].id;
      const crusherId = crushers[Math.floor(Math.random() * crushers.length)].id;
      const material = materials[Math.floor(Math.random() * materials.length)];
      
      const quantity = Math.floor(Math.random() * 20) + 5; // 5-25 cubic meters
      const discount = Math.floor(Math.random() * 3); // 0-3 discount
      const netQuantity = quantity - discount;
      const pricePerMeter = Math.floor(Math.random() * 50) + 100; // 100-150 EGP per meter
      const totalValue = netQuantity * pricePerMeter;
      const contractorCharge = Math.floor(totalValue * 0.1); // 10% for contractor
      
      deliveries.push({
        client_id: clientId,
        crusher_id: crusherId,
        contractor_id: contractorId,
        material: material,
        voucher: `V${1000 + i}`,
        quantity: quantity,
        discount_volume: discount,
        net_quantity: netQuantity,
        price_per_meter: pricePerMeter,
        total_value: totalValue,
        driver_name: `سائق ${i + 1}`,
        car_head: `${Math.floor(Math.random() * 900) + 100}`,
        car_tail: `${Math.floor(Math.random() * 9000) + 1000}`,
        car_volume: quantity,
        contractor_charge: contractorCharge,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
      });
    }
    
    await db('deliveries').insert(deliveries);
    
    // Add some test payments for clients
    const clientPayments = [];
    for (let i = 0; i < 8; i++) {
      const clientId = clients[Math.floor(Math.random() * clients.length)].id;
      const amount = Math.floor(Math.random() * 5000) + 1000; // 1000-6000 EGP
      
      clientPayments.push({
        client_id: clientId,
        amount: amount,
        note: `دفعة ${i + 1}`,
        paid_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) // Random date in last 20 days
      });
    }
    
    await db('payments').insert(clientPayments);
    
    // Add some contractor payments
    const contractorPayments = [];
    for (let i = 0; i < 6; i++) {
      const contractorId = contractors[Math.floor(Math.random() * contractors.length)].id;
      const amount = Math.floor(Math.random() * 3000) + 500; // 500-3500 EGP
      
      contractorPayments.push({
        contractor_id: contractorId,
        amount: amount,
        note: `عهدة ${i + 1}`,
        paid_at: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) // Random date in last 15 days
      });
    }
    
    await db('contractor_payments').insert(contractorPayments);
    
    // Add some crusher payments
    const crusherPayments = [];
    for (let i = 0; i < 4; i++) {
      const crusherId = crushers[Math.floor(Math.random() * crushers.length)].id;
      const amount = Math.floor(Math.random() * 8000) + 2000; // 2000-10000 EGP
      const methods = ['نقدي', 'شيك', 'تحويل'];
      
      crusherPayments.push({
        crusher_id: crusherId,
        amount: amount,
        payment_method: methods[Math.floor(Math.random() * methods.length)],
        note: `دفعة للكسارة ${i + 1}`,
        paid_at: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) // Random date in last 25 days
      });
    }
    
    await db('crusher_payments').insert(crusherPayments);
    
    // Add some adjustments
    const adjustments = [];
    const entities = [
      ...clients.map(c => ({ type: 'client', id: c.id })),
      ...contractors.map(c => ({ type: 'contractor', id: c.id })),
      ...crushers.map(c => ({ type: 'crusher', id: c.id }))
    ];
    
    for (let i = 0; i < 10; i++) {
      const entity = entities[Math.floor(Math.random() * entities.length)];
      const amount = (Math.random() - 0.5) * 2000; // Random between -1000 and +1000
      const reasons = ['تسوية حساب', 'خصم متفق عليه', 'مكافأة', 'تعديل خطأ', 'خصم تأخير'];
      
      adjustments.push({
        entity_type: entity.type,
        entity_id: entity.id,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        created_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) // Random date in last 20 days
      });
    }
    
    await db('adjustments').insert(adjustments);
    
    console.log(`✅ Added ${deliveries.length} deliveries`);
    console.log(`✅ Added ${clientPayments.length} client payments`);
    console.log(`✅ Added ${contractorPayments.length} contractor payments`);
    console.log(`✅ Added ${crusherPayments.length} crusher payments`);
    console.log(`✅ Added ${adjustments.length} adjustments`);
    console.log('🎉 More test data added successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding more data:', error);
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  seedMoreData();
}

module.exports = seedMoreData;