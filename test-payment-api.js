async function testPaymentAPI() {
    const paymentData = {
        amount: 50,
        method: 'انستاباي',
        details: '2000',
        note: 'بيد محمد',
        paid_at: new Date().toISOString().split('T')[0]
    };
    
    console.log('Testing payment API with Arabic text...');
    console.log('Payment data:', paymentData);
    
    try {
        const response = await fetch('http://localhost:5000/api/clients/2/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Success! Payment created:', result);
        
    } catch (error) {
        console.error('Payment API test failed:', error.message);
        console.error('Full error:', error);
    }
}

testPaymentAPI();