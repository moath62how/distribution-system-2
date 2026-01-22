const db = require('./backend/db');

async function checkAllPaymentTables() {
    try {
        console.log('Checking all payment-related tables...\n');
        
        // Check payments table
        const paymentsColumns = await db.raw(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'payments' 
            ORDER BY ORDINAL_POSITION
        `);
        console.log('PAYMENTS table columns:', paymentsColumns[0].map(row => row.COLUMN_NAME));
        
        // Check crusher_payments table
        const crusherPaymentsColumns = await db.raw(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'crusher_payments' 
            ORDER BY ORDINAL_POSITION
        `);
        console.log('CRUSHER_PAYMENTS table columns:', crusherPaymentsColumns[0].map(row => row.COLUMN_NAME));
        
        // Check contractor_payments table
        const contractorPaymentsColumns = await db.raw(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'contractor_payments' 
            ORDER BY ORDINAL_POSITION
        `);
        console.log('CONTRACTOR_PAYMENTS table columns:', contractorPaymentsColumns[0].map(row => row.COLUMN_NAME));
        
        // Check adjustments table
        const adjustmentsColumns = await db.raw(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'adjustments' 
            ORDER BY ORDINAL_POSITION
        `);
        console.log('ADJUSTMENTS table columns:', adjustmentsColumns[0].map(row => row.COLUMN_NAME));
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking tables:', error);
        process.exit(1);
    }
}

checkAllPaymentTables();