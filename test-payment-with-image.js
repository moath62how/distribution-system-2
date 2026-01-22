// Test the payment endpoint with image
const testPaymentWithImage = async () => {
    // Create a small test image (1x1 pixel red PNG)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const paymentData = {
        amount: 200,
        method: 'انستاباي',
        details: '12345',
        note: 'اختبار مع صورة',
        payment_image: testImageBase64,
        paid_at: new Date().toISOString()
    };
    
    try {
        console.log('Testing payment endpoint with image...');
        console.log('Payment data (without image):', {
            ...paymentData,
            payment_image: paymentData.payment_image ? `[${paymentData.payment_image.length} chars]` : null
        });
        
        const response = await fetch('http://localhost:5000/api/clients/6/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Success result:', {
            ...result,
            payment_image: result.payment_image ? `[${result.payment_image.length} chars]` : null
        });
        
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testPaymentWithImage();