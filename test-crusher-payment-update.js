const { default: fetch } = require('node-fetch');

async function testCrusherPaymentUpdate() {
    console.log('🧪 Testing crusher payment update...');
    
    try {
        // Test updating payment ID 5 for crusher ID 1
        const response = await fetch('http://localhost:5000/api/crushers/1/payments/5', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 1000,
                method: 'نقدي',
                date: '2026-01-20',
                note: 'تحديث تجريبي',
                details: 'تفاصيل تجريبية'
            })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Update successful!');
            console.log('Result:', result);
        } else {
            const error = await response.text();
            console.log('❌ Update failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testCrusherPaymentUpdate();