const { default: fetch } = require('node-fetch');

async function testContractorPaymentUpdate() {
    console.log('🧪 Testing contractor payment update...');
    
    try {
        // Test updating payment ID 1 for contractor ID 2
        const response = await fetch('http://localhost:5000/api/contractors/2/payments/1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 500,
                method: 'نقدي',
                paid_at: '2026-01-20',
                note: 'تحديث تجريبي للمقاول',
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

testContractorPaymentUpdate();