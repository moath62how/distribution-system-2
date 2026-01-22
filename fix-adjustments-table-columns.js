const db = require('./backend/db');

async function addMissingAdjustmentColumns() {
    try {
        console.log('Checking adjustments table columns...');
        
        // Check if columns exist
        const hasMethod = await db.schema.hasColumn('adjustments', 'method');
        const hasDetails = await db.schema.hasColumn('adjustments', 'details');
        const hasImage = await db.schema.hasColumn('adjustments', 'payment_image');
        
        console.log('Current columns:', { method: hasMethod, details: hasDetails, payment_image: hasImage });
        
        if (!hasMethod || !hasDetails || !hasImage) {
            console.log('Adding missing columns to adjustments table...');
            
            await db.schema.alterTable('adjustments', table => {
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
            
            console.log('✅ Successfully added missing columns to adjustments table');
        } else {
            console.log('✅ All required columns already exist');
        }
        
        // Verify the final schema
        const finalSchema = await db('adjustments').columnInfo();
        console.log('Final adjustments table schema:', Object.keys(finalSchema));
        
    } catch (error) {
        console.error('❌ Error adding columns:', error);
    } finally {
        await db.destroy();
    }
}

addMissingAdjustmentColumns();