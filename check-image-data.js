const db = require('./backend/db');

async function checkImageData() {
    try {
        console.log('Checking image data in payments table...\n');
        
        const payments = await db('payments')
            .where('client_id', 1)
            .whereNotNull('payment_image')
            .select('id', 'amount', 'method', 'payment_image');
        
        console.log(`Found ${payments.length} payments with images:\n`);
        
        payments.forEach((payment, index) => {
            const imageData = payment.payment_image;
            console.log(`Payment ${payment.id}:`);
            console.log(`  Amount: ${payment.amount}`);
            console.log(`  Method: ${payment.method}`);
            console.log(`  Image data length: ${imageData ? imageData.length : 0}`);
            
            if (imageData) {
                console.log(`  Starts with data:image/: ${imageData.startsWith('data:image/')}`);
                console.log(`  First 100 chars: ${imageData.substring(0, 100)}`);
                
                if (imageData.startsWith('data:image/')) {
                    const parts = imageData.split(',');
                    console.log(`  MIME type: ${parts[0]}`);
                    console.log(`  Base64 length: ${parts[1] ? parts[1].length : 0}`);
                    
                    // Check if base64 is valid
                    try {
                        if (parts[1]) {
                            Buffer.from(parts[1].substring(0, 100), 'base64');
                            console.log(`  Base64 valid: Yes`);
                        }
                    } catch (e) {
                        console.log(`  Base64 valid: No - ${e.message}`);
                    }
                }
                
                // Check for common issues
                if (imageData.length > 1000000) {
                    console.log(`  ⚠️  WARNING: Image is very large (${Math.round(imageData.length / 1024)}KB)`);
                }
                
                if (imageData.includes('AdUnit')) {
                    console.log(`  ⚠️  WARNING: Image contains 'AdUnit' text - may be corrupted`);
                }
            }
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error checking image data:', error);
        process.exit(1);
    }
}

checkImageData();