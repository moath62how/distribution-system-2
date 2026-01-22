const fs = require('fs');

// Read the clients.js file
let content = fs.readFileSync('backend/routes/clients.js', 'utf8');

console.log('Original content length:', content.length);

// Replace all instances of contractor_payments with payment_method to use method instead
content = content.replace(
    /contractor_payments'\)\s*\.where\(\{\s*details,\s*payment_method:\s*method\s*\}\)/g,
    "contractor_payments').where({ details, method })"
);

// Also fix any remaining instances with different spacing
content = content.replace(
    /contractor_payments.*\.where\(\{\s*details,\s*payment_method:\s*method\s*\}\)/g,
    "contractor_payments').where({ details, method })"
);

// Write the fixed content back
fs.writeFileSync('backend/routes/clients.js', content);

console.log('Fixed content length:', content.length);
console.log('Fixed all contractor_payments validation queries');

// Verify the fix
const fixedContent = fs.readFileSync('backend/routes/clients.js', 'utf8');
const remainingIssues = (fixedContent.match(/contractor_payments.*payment_method/g) || []).length;
console.log('Remaining payment_method issues in contractor_payments:', remainingIssues);