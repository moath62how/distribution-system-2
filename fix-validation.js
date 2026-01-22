const fs = require('fs');

// Read the clients.js file
let content = fs.readFileSync('backend/routes/clients.js', 'utf8');

// Fix the contractor_payments validation - replace payment_method with method
content = content.replace(
    /contractor_payments.*\.where\(\{ details, payment_method: method \}\)/g,
    "contractor_payments').where({ details, method })"
);

// Write the fixed content back
fs.writeFileSync('backend/routes/clients.js', content);

console.log('Fixed validation logic in clients.js');
console.log('Changed contractor_payments to use "method" column instead of "payment_method"');