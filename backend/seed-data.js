const db = require('./db');

async function seedData() {
  try {
    console.log('🌱 Seeding database with test data...');
    
    // Ensure tables exist
    await db.ensureTables();
    
    // Check if data already exists
    const existingClients = await db('clients').count('id as count').first();
    const existingContractors = await db('contractors').count('id as count').first();
    
    if (existingClients.count > 0 || existingContractors.count > 0) {
      console.log('📊 Database already has data. Skipping seed.');
      return;
    }
    
    // Add test clients
    const clientIds = await db('clients').insert([
      { name: 'أحمد محمد', phone: '01234567890', opening_balance: 5000 },
      { name: 'محمد علي', phone: '01098765432', opening_balance: -2000 },
      { name: 'فاطمة أحمد', phone: '01555123456', opening_balance: 0 },
      { name: 'عبد الله حسن', phone: '01777888999', opening_balance: 15000 },
      { name: 'مريم سالم', phone: '01666555444', opening_balance: -500 }
    ]);
    
    // Add test contractors
    const contractorIds = await db('contractors').insert([
      { name: 'مقاولة النقل السريع', opening_balance: 3000 },
      { name: 'شركة المدينة للنقل', opening_balance: -1000 },
      { name: 'مقاولة الأمانة', opening_balance: 0 },
      { name: 'النقل المتطور', opening_balance: 8000 }
    ]);
    
    // Add test crushers
    const crusherIds = await db('crushers').insert([
      { name: 'كسارة الهرم' },
      { name: 'كسارة النيل' },
      { name: 'كسارة الصحراء' }
    ]);
    
    console.log(`✅ Added ${clientIds.length} clients`);
    console.log(`✅ Added ${contractorIds.length} contractors`);
    console.log(`✅ Added ${crusherIds.length} crushers`);
    
    // Add some sample expenses
    const expenseCategories = ['وقود', 'صيانة', 'رواتب', 'إيجار', 'كهرباء', 'مياه', 'نقل', 'أخرى'];
    const expenseDescriptions = {
      'وقود': ['وقود الشاحنات', 'وقود المعدات', 'بنزين السيارات'],
      'صيانة': ['صيانة الشاحنات', 'صيانة المعدات', 'قطع غيار'],
      'رواتب': ['راتب السائقين', 'راتب العمال', 'مكافآت'],
      'إيجار': ['إيجار المكتب', 'إيجار المخزن', 'إيجار الأرض'],
      'كهرباء': ['فاتورة الكهرباء', 'مولد كهرباء'],
      'مياه': ['فاتورة المياه', 'مياه الشرب'],
      'نقل': ['نقل المواد', 'مصاريف سفر'],
      'أخرى': ['مصاريف إدارية', 'مصاريف متنوعة', 'طوارئ']
    };

    const sampleExpenses = [];
    for (let i = 0; i < 15; i++) {
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const descriptions = expenseDescriptions[category];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      // Random date within last 3 months
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));
      
      sampleExpenses.push({
        expense_date: date.toISOString().split('T')[0],
        category,
        description,
        amount: Math.floor(Math.random() * 5000) + 100, // 100-5100
        notes: Math.random() > 0.7 ? 'ملاحظة تجريبية' : null,
        created_at: new Date().toISOString()
      });
    }

    await db('expenses').insert(sampleExpenses);
    console.log(`✅ Added ${sampleExpenses.length} sample expenses`);
    
    console.log('🎉 Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;