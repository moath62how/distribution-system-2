// Test the payment endpoint directly
const testPayment = async () => {
    const paymentData = {
        amount: 100,
        method: 'نقدي',
        note: 'اختبار',
        paid_at: new Date().toISOString()
    };
    
    try {
        console.log('Testing payment endpoint...');
        console.log('Payment data:', paymentData);
        
        const response = await fetch('http://localhost:5000/api/clients/6/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Success result:', result);
        
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testPayment();