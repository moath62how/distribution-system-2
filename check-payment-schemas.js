const db = require('./backend/db');

async function checkPaymentSchemas() {
    console.log('🔍 Checking payment table schemas...');
    
    try {
        // Check crusher_payments table
        console.log('\n📋 Crusher Payments Table Schema:');
        const crusherPaymentsSchema = await db.raw("DESCRIBE crusher_payments");
        console.table(crusherPaymentsSchema[0]);
        
        // Check contractor_payments table
        console.log('\n📋 Contractor Payments Table Schema:');
        const contractorPaymentsSchema = await db.raw("DESCRIBE contractor_payments");
        console.table(contractorPaymentsSchema[0]);
        
        // Check if tables exist and have data
        console.log('\n📊 Data counts:');
        const crusherPaymentsCount = await db('crusher_payments').count('id as count').first();
        const contractorPaymentsCount = await db('contractor_payments').count('id as count').first();
        
        console.log(`Crusher payments: ${crusherPaymentsCount.count}`);
        console.log(`Contractor payments: ${contractorPaymentsCount.count}`);
        
        // Sample data
        if (crusherPaymentsCount.count > 0) {
            console.log('\n💰 Sample crusher payment:');
            const sampleCrusherPayment = await db('crusher_payments').first();
            console.log(sampleCrusherPayment);
        }
        
        if (contractorPaymentsCount.count > 0) {
            console.log('\n💰 Sample contractor payment:');
            const sampleContractorPayment = await db('contractor_payments').first();
            console.log(sampleContractorPayment);
        }
        
    } catch (error) {
        console.error('❌ Error checking schemas:', error);
    } finally {
        await db.destroy();
    }
}

checkPaymentSchemas();