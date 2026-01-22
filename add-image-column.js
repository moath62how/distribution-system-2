const db = require('./backend/db');

async function addImageColumns() {
    try {
        console.log('Adding image columns to payment tables...');
        
        // Add image_path column to payments table (clients)
        if (!(await db.schema.hasColumn('payments', 'image_path'))) {
            await db.schema.table('payments', table => {
                table.string('image_path', 500); // Path to uploaded image
            });
            console.log('✅ Added image_path column to payments table');
        }
        
        // Add image_path column to crusher_payments table
        if (!(await db.schema.hasColumn('crusher_payments', 'image_path'))) {
            await db.schema.table('crusher_payments', table => {
                table.string('image_path', 500); // Path to uploaded image
            });
            console.log('✅ Added image_path column to crusher_payments table');
        }
        
        // Add image_path column to contractor_payments table
        if (!(await db.schema.hasColumn('contractor_payments', 'image_path'))) {
            await db.schema.table('contractor_payments', table => {
                table.string('image_path', 500); // Path to uploaded image
            });
            console.log('✅ Added image_path column to contractor_payments table');
        }
        
        // Add image_path column to adjustments table
        if (!(await db.schema.hasColumn('adjustments', 'image_path'))) {
            await db.schema.table('adjustments', table => {
                table.string('image_path', 500); // Path to uploaded image
            });
            console.log('✅ Added image_path column to adjustments table');
        }
        
        console.log('🎉 All image columns added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding image columns:', error);
    } finally {
        await db.destroy();
    }
}

addImageColumns();