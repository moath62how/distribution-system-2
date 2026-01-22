const db = require('./backend/db');

async function addPaymentImageColumn() {
    try {
        console.log('Adding payment_image column to payments table...');
        
        // Check if column already exists
        const hasColumn = await db.schema.hasColumn('payments', 'payment_image');
        if (!hasColumn) {
            await db.schema.table('payments', table => {
                table.text('payment_image'); // Store base64 image or file path
            });
            console.log('✅ payment_image column added to payments table');
        } else {
            console.log('ℹ️ payment_image column already exists in payments table');
        }

        // Also add to crusher_payments table
        const hasCrusherColumn = await db.schema.hasColumn('crusher_payments', 'payment_image');
        if (!hasCrusherColumn) {
            await db.schema.table('crusher_payments', table => {
                table.text('payment_image');
            });
            console.log('✅ payment_image column added to crusher_payments table');
        } else {
            console.log('ℹ️ payment_image column already exists in crusher_payments table');
        }

        // Also add to contractor_payments table
        const hasContractorColumn = await db.schema.hasColumn('contractor_payments', 'payment_image');
        if (!hasContractorColumn) {
            await db.schema.table('contractor_payments', table => {
                table.text('payment_image');
            });
            console.log('✅ payment_image column added to contractor_payments table');
        } else {
            console.log('ℹ️ payment_image column already exists in contractor_payments table');
        }

        // Also add to adjustments table
        const hasAdjustmentColumn = await db.schema.hasColumn('adjustments', 'payment_image');
        if (!hasAdjustmentColumn) {
            await db.schema.table('adjustments', table => {
                table.text('payment_image');
            });
            console.log('✅ payment_image column added to adjustments table');
        } else {
            console.log('ℹ️ payment_image column already exists in adjustments table');
        }

        console.log('✅ All payment image columns added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding payment image columns:', error);
        process.exit(1);
    }
}

addPaymentImageColumn();