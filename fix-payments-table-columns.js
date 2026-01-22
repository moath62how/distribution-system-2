const db = require('./backend/db');

async function addMissingPaymentColumns() {
    try {
        console.log('Checking payments table columns...');
        
        // Check if columns exist
        const hasMethod = await db.schema.hasColumn('payments', 'method');
        const hasDetails = await db.schema.hasColumn('payments', 'details');
        const hasImage = await db.schema.hasColumn('payments', 'payment_image');
        
        console.log('Current columns:', { method: hasMethod, details: hasDetails, payment_image: hasImage });
        
        if (!hasMethod || !hasDetails || !hasImage) {
            console.log('Adding missing columns to payments table...');
            
            await db.schema.alterTable('payments', table => {
                if (!hasMethod) {
                    table.string('method', 50).nullable();
                    console.log('Added method column');
                }
                if (!hasDetails) {
                    table.string('details', 255).nullable();
                    console.log('Added details column');
                }
                if (!hasImage) {
                    table.text('payment_image', 'longtext').nullable();
                    console.log('Added payment_image column');
                }
            });
            
            console.log('✅ Successfully added missing columns to payments table');
        } else {
            console.log('✅ All required columns already exist');
        }
        
        // Verify the final schema
        const finalSchema = await db('payments').columnInfo();
        console.log('Final payments table schema:', Object.keys(finalSchema));
        
    } catch (error) {
        console.error('❌ Error adding columns:', error);
    } finally {
        await db.destroy();
    }
}

addMissingPaymentColumns();