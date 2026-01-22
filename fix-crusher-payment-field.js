const db = require('./backend/db');

async function fixCrusherPaymentField() {
    console.log('🔧 Fixing crusher_payments table field name...');
    
    try {
        // Check if payment_method column exists
        const schema = await db.raw("DESCRIBE crusher_payments");
        const hasPaymentMethod = schema[0].some(col => col.Field === 'payment_method');
        const hasMethod = schema[0].some(col => col.Field === 'method');
        
        console.log('Has payment_method:', hasPaymentMethod);
        console.log('Has method:', hasMethod);
        
        if (hasPaymentMethod && !hasMethod) {
            console.log('🔄 Renaming payment_method to method...');
            await db.raw('ALTER TABLE crusher_payments CHANGE payment_method method VARCHAR(50)');
            console.log('✅ Field renamed successfully!');
        } else if (hasMethod) {
            console.log('✅ Field already named correctly!');
        } else {
            console.log('❌ Neither field found - something is wrong');
        }
        
        // Verify the change
        console.log('\n📋 Updated schema:');
        const newSchema = await db.raw("DESCRIBE crusher_payments");
        console.table(newSchema[0]);
        
    } catch (error) {
        console.error('❌ Error fixing field:', error);
    } finally {
        await db.destroy();
    }
}

fixCrusherPaymentField();