const db = require('./backend/db');

async function clearTransactions() {
  try {
    console.log('🧹 Starting to clear transaction data...');
    
    // Clear transactional data only (preserve clients, contractors, crushers)
    const deletedAdjustments = await db('adjustments').del();
    console.log(`✅ Deleted ${deletedAdjustments} adjustments`);
    
    const deletedPayments = await db('payments').del();
    console.log(`✅ Deleted ${deletedPayments} client payments`);
    
    const deletedContractorPayments = await db('contractor_payments').del();
    console.log(`✅ Deleted ${deletedContractorPayments} contractor payments`);
    
    const deletedCrusherPayments = await db('crusher_payments').del();
    console.log(`✅ Deleted ${deletedCrusherPayments} crusher payments`);
    
    const deletedExpenses = await db('expenses').del();
    console.log(`✅ Deleted ${deletedExpenses} expenses`);
    
    const deletedDeliveries = await db('deliveries').del();
    console.log(`✅ Deleted ${deletedDeliveries} deliveries`);
    
    // Reset auto-increment for transaction tables only
    await db('sqlite_sequence').whereIn('name', [
      'adjustments', 'payments', 'contractor_payments', 
      'crusher_payments', 'expenses', 'deliveries'
    ]).del();
    console.log('✅ Reset auto-increment counters for transaction tables');
    
    // Get counts of preserved data
    const clientsCount = await db('clients').count('id as count').first();
    const contractorsCount = await db('contractors').count('id as count').first();
    const crushersCount = await db('crushers').count('id as count').first();
    
    console.log('\n🎉 Transaction data cleared successfully!');
    console.log('📋 Summary:');
    console.log(`   • ${deletedDeliveries} deliveries removed`);
    console.log(`   • ${deletedPayments + deletedContractorPayments + deletedCrusherPayments} payments removed`);
    console.log(`   • ${deletedExpenses} expenses removed`);
    console.log(`   • ${deletedAdjustments} adjustments removed`);
    console.log(`   • ${clientsCount.count} clients preserved`);
    console.log(`   • ${contractorsCount.count} contractors preserved`);
    console.log(`   • ${crushersCount.count} crushers preserved`);
    console.log('\n💡 Note: Client and contractor balances will be recalculated automatically based on remaining data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing transactions:', error);
    process.exit(1);
  }
}

clearTransactions();