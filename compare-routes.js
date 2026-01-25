const fs = require('fs');
const path = require('path');

console.log('🔍 ROUTE REFACTORING COMPARISON\n');

const routeComparisons = [
    {
        name: 'Clients',
        old: 'backend/routes/clients.js',
        new: 'backend/routes/clients-refactored.js',
        controller: 'backend/controllers/clientsController.js',
        service: 'backend/services/clientService.js'
    },
    {
        name: 'Contractors',
        old: 'backend/routes/contractors.js',
        new: 'backend/routes/contractors-refactored.js',
        controller: 'backend/controllers/contractorsController.js',
        service: 'backend/services/contractorService.js'
    },
    {
        name: 'Crushers',
        old: 'backend/routes/crushers.js',
        new: 'backend/routes/crushers-refactored.js',
        controller: 'backend/controllers/crushersController.js',
        service: 'backend/services/crusherService.js'
    },
    {
        name: 'Deliveries',
        old: 'backend/routes/deliveries.js',
        new: 'backend/routes/deliveries-refactored.js',
        controller: 'backend/controllers/deliveriesController.js',
        service: 'backend/services/deliveryService.js'
    },
    {
        name: 'Expenses',
        old: 'backend/routes/expenses.js',
        new: 'backend/routes/expenses-refactored.js',
        controller: 'backend/controllers/expensesController.js',
        service: 'backend/services/expenseService.js'
    }
];

function getFileStats(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const size = fs.statSync(filePath).size;
        return { lines, size, exists: true };
    } catch (error) {
        return { lines: 0, size: 0, exists: false };
    }
}

function countRoutes(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const routeMatches = content.match(/router\.(get|post|put|delete|patch)/g);
        return routeMatches ? routeMatches.length : 0;
    } catch (error) {
        return 0;
    }
}

routeComparisons.forEach(route => {
    console.log(`📁 ${route.name.toUpperCase()}`);
    console.log('─'.repeat(50));

    const oldStats = getFileStats(route.old);
    const newStats = getFileStats(route.new);
    const controllerStats = getFileStats(route.controller);
    const serviceStats = getFileStats(route.service);

    const oldRoutes = countRoutes(route.old);
    const newRoutes = countRoutes(route.new);

    console.log(`📊 Old Route File:`);
    console.log(`   Lines: ${oldStats.lines} | Size: ${oldStats.size} bytes | Routes: ${oldRoutes}`);

    console.log(`🆕 New Architecture:`);
    console.log(`   Route File: ${newStats.lines} lines | ${newRoutes} routes`);
    console.log(`   Controller: ${controllerStats.lines} lines`);
    console.log(`   Service: ${serviceStats.lines} lines`);

    const totalNewLines = newStats.lines + controllerStats.lines + serviceStats.lines;
    const improvement = oldStats.lines > 0 ? ((totalNewLines - oldStats.lines) / oldStats.lines * 100).toFixed(1) : 'N/A';

    console.log(`📈 Total New Lines: ${totalNewLines} (${improvement}% change from old)`);
    console.log('');
});

console.log('🎯 BENEFITS OF NEW ARCHITECTURE:');
console.log('✅ Separation of Concerns - Routes, Controllers, Services');
console.log('✅ Better Error Handling - Consistent across all endpoints');
console.log('✅ Code Reusability - Services can be used by multiple controllers');
console.log('✅ Easier Testing - Each layer can be tested independently');
console.log('✅ Maintainability - Changes are isolated to specific layers');
console.log('✅ Fixed Missing Endpoints - Reports endpoint now works!');
console.log('');

console.log('🚀 USAGE:');
console.log('1. Main routes now use refactored MVC architecture');
console.log('2. Old routes available at /api/v1/* for backward compatibility');
console.log('3. Test both versions to ensure functionality');
console.log('4. Remove old routes once migration is complete');
console.log('');

console.log('📋 NEXT STEPS:');
console.log('1. Start your server: node backend/server.js');
console.log('2. Test the fixed endpoint: GET /api/clients/:id/reports/deliveries');
console.log('3. Compare old vs new endpoints for consistency');
console.log('4. Update frontend to use new API structure if needed');
console.log('5. Remove old route files once satisfied with new implementation');