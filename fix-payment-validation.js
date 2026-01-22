const fs = require('fs');

// Read the clients.js file
let content = fs.readFileSync('backend/routes/clients.js', 'utf8');

// Replace the problematic validation queries
content = content.replace(
    /const existingCrusherPayment = await db\('crusher_payments'\)\s*\.where\(\{ details, payment_method: method \}\)\s*\.first\(\);/g,
    `const existingCrusherPayment = await db('crusher_payments')
                .where({ payment_method: method })
                .whereRaw('note LIKE ?', [\`%\${details}%\`])
                .first();`
);

content = content.replace(
    /const existingContractorPayment = await db\('contractor_payments'\)\.where\(\{ details, method \}\)\s*\.first\(\);/g,
    `const existingContractorPayment = await db('contractor_payments')
                .whereRaw('note LIKE ?', [\`%\${details}%\`])
                .first();`
);

// Write the fixed content back
fs.writeFileSync('backend/routes/clients.js', content);

console.log('✅ Fixed payment validation queries in clients.js');
console.log('- Updated crusher_payments query to use payment_method and search in note');
console.log('- Updated contractor_payments query to search in note only');