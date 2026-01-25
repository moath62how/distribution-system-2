require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ensureTables } = require('./backend/db');

async function testRefactoredRoutes() {
    try {
        // Initialize database connection
        await ensureTables();

        const app = express();
        app.use(cors());
        app.use(express.json());

        // Import refactored routes
        const clientsApiRouter = require('./backend/routes/clients-refactored');
        const crushersApiRouter = require('./backend/routes/crushers-refactored');
        const contractorsApiRouter = require('./backend/routes/contractors-refactored');
        const deliveriesApiRouter = require('./backend/routes/deliveries-refactored');
        const expensesApiRouter = require('./backend/routes/expenses-refactored');

        // Import old routes for comparison
        const clientsApiRouterV1 = require('./backend/routes/clients');
        const crushersApiRouterV1 = require('./backend/routes/crushers');
        const contractorsApiRouterV1 = require('./backend/routes/contractors');
        const deliveriesApiRouterV1 = require('./backend/routes/deliveries');
        const expensesApiRouterV1 = require('./backend/routes/expenses');

        // Setup refactored routes (new)
        app.use('/api/clients', clientsApiRouter);
        app.use('/api/crushers', crushersApiRouter);
        app.use('/api/contractors', contractorsApiRouter);
        app.use('/api/deliveries', deliveriesApiRouter);
        app.use('/api/expenses', expensesApiRouter);

        // Setup old routes (v1 for comparison)
        app.use('/api/v1/clients', clientsApiRouterV1);
        app.use('/api/v1/crushers', crushersApiRouterV1);
        app.use('/api/v1/contractors', contractorsApiRouterV1);
        app.use('/api/v1/deliveries', deliveriesApiRouterV1);
        app.use('/api/v1/expenses', expensesApiRouterV1);

        const PORT = 3002; // Use different port to avoid conflicts
        const server = app.listen(PORT, () => {
            console.log(`🧪 Test server running on http://localhost:${PORT}`);
            console.log('');
            console.log('📋 Test the refactored endpoints:');
            console.log('');
            console.log('🆕 NEW REFACTORED ROUTES (MVC Architecture):');
            console.log(`   GET http://localhost:${PORT}/api/clients`);
            console.log(`   GET http://localhost:${PORT}/api/clients/6972b6f6694fd7b4434113e3`);
            console.log(`   GET http://localhost:${PORT}/api/clients/6972b6f6694fd7b4434113e3/reports/deliveries?from=2025-12-31&to=2026-01-25`);
            console.log(`   GET http://localhost:${PORT}/api/crushers`);
            console.log(`   GET http://localhost:${PORT}/api/contractors`);
            console.log(`   GET http://localhost:${PORT}/api/deliveries`);
            console.log(`   GET http://localhost:${PORT}/api/expenses`);
            console.log(`   GET http://localhost:${PORT}/api/expenses/stats`);
            console.log('');
            console.log('🔄 OLD ROUTES (for comparison):');
            console.log(`   GET http://localhost:${PORT}/api/v1/clients`);
            console.log(`   GET http://localhost:${PORT}/api/v1/clients/6972b6f6694fd7b4434113e3`);
            console.log(`   GET http://localhost:${PORT}/api/v1/crushers`);
            console.log(`   GET http://localhost:${PORT}/api/v1/contractors`);
            console.log(`   GET http://localhost:${PORT}/api/v1/deliveries`);
            console.log(`   GET http://localhost:${PORT}/api/v1/expenses`);
            console.log('');
            console.log('✨ Key Differences:');
            console.log('   - NEW: /api/clients/:id/reports/deliveries (FIXED!)');
            console.log('   - NEW: Better error handling and validation');
            console.log('   - NEW: Enhanced filtering and pagination');
            console.log('   - NEW: Consistent response formats');
            console.log('');
            console.log('🛑 Press Ctrl+C to stop the test server');
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down test server...');
            server.close(() => {
                console.log('✅ Test server stopped');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Error starting test server:', error);
        process.exit(1);
    }
}

testRefactoredRoutes();