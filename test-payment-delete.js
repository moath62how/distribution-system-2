const { default: fetch } = require('node-fetch');

async function testPaymentDelete() {
    console.log('🧪 Testing payment delete functionality...');
    
    try {
        // First, let's create a test payment to delete
        console.log('Creating test payment...');
        const createResponse = await fetch('http://localhost:5000/api/crushers/1/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 100,
                method: 'نقدي',
                date: '2026-01-20',
                note: 'دفعة تجريبية للحذف'
            })
        });
        
        if (!createResponse.ok) {
            throw new Error('Failed to create test payment');
        }
        
        const createdPayment = await createResponse.json();
        console.log('✅ Test payment created:', createdPayment.id);
        
        // Now delete it
        console.log('Deleting test payment...');
        const deleteResponse = await fetch(`http://localhost:5000/api/crushers/1/payments/${createdPayment.id}`, {
            method: 'DELETE'
        });
        
        console.log('Delete response status:', deleteResponse.status);
        
        if (deleteResponse.ok) {
            const result = await deleteResponse.json();
            console.log('✅ Delete successful!');
            console.log('Result:', result);
        } else {
            const error = await deleteResponse.text();
            console.log('❌ Delete failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testPaymentDelete();