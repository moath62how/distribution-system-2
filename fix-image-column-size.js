const db = require('./backend/db');

async function fixImageColumnSize() {
    try {
        console.log('Checking and fixing image column sizes...\n');
        
        // Check current column info
        const paymentsColumns = await db.raw(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_image'
        `);
        
        console.log('Current payments.payment_image column info:', paymentsColumns[0]);
        
        // Fix payments table
        console.log('Altering payments table payment_image column to LONGTEXT...');
        await db.raw('ALTER TABLE payments MODIFY COLUMN payment_image LONGTEXT');
        console.log('✅ payments.payment_image column updated');
        
        // Fix crusher_payments table
        console.log('Altering crusher_payments table payment_image column to LONGTEXT...');
        await db.raw('ALTER TABLE crusher_payments MODIFY COLUMN payment_image LONGTEXT');
        console.log('✅ crusher_payments.payment_image column updated');
        
        // Fix contractor_payments table
        console.log('Altering contractor_payments table payment_image column to LONGTEXT...');
        await db.raw('ALTER TABLE contractor_payments MODIFY COLUMN payment_image LONGTEXT');
        console.log('✅ contractor_payments.payment_image column updated');
        
        // Fix adjustments table
        console.log('Altering adjustments table payment_image column to LONGTEXT...');
        await db.raw('ALTER TABLE adjustments MODIFY COLUMN payment_image LONGTEXT');
        console.log('✅ adjustments.payment_image column updated');
        
        // Check updated column info
        const updatedColumns = await db.raw(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_image'
        `);
        
        console.log('\nUpdated payments.payment_image column info:', updatedColumns[0]);
        console.log('\n✅ All image columns have been updated to LONGTEXT');
        console.log('⚠️  Note: Existing truncated images will need to be re-uploaded');
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing column sizes:', error);
        process.exit(1);
    }
}

fixImageColumnSize();