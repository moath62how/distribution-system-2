// Debug script to test edit button functionality
console.log('=== Debug Edit Button ===');

// Test if DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Check if button exists
    const editBtn = document.getElementById('editClientBtn');
    console.log('Edit button:', editBtn);
    
    if (editBtn) {
        console.log('Button found, adding test listener');
        
        // Add a simple test listener
        editBtn.addEventListener('click', function() {
            console.log('BUTTON CLICKED!');
            alert('زر التعديل يعمل!');
        });
        
        console.log('Test listener added');
    } else {
        console.error('Button not found!');
    }
    
    // Check if modal exists
    const modal = document.getElementById('editClientModal');
    console.log('Edit modal:', modal);
    
    // Check if form fields exist
    const nameField = document.getElementById('editClientName');
    const phoneField = document.getElementById('editClientPhone');
    const balanceField = document.getElementById('editOpeningBalance');
    
    console.log('Form fields:', {
        name: nameField,
        phone: phoneField,
        balance: balanceField
    });
});

console.log('Debug script loaded');