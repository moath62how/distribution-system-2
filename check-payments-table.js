const db = require('./backend/db');

async function checkPaymentsTable() {
  try {
    const columns = await db.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'payments' 
      AND TABLE_SCHEMA = 'distribution_system'
    `);
    console.log('Payments table columns:', columns[0].map(row => row.COLUMN_NAME));
    
    // Check if payment_image column exists
    const hasPaymentImage = columns[0].some(row => row.COLUMN_NAME === 'payment_image');
    console.log('Has payment_image column:', hasPaymentImage);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPaymentsTable();