const db = require('./backend/db');

async function testSQLiteQuery() {
    try {
        console.log('🔍 Testing SQLite raw query structure...');
        
        // Test the exact query from the expenses route
        const monthlyResult = await db.raw(`
            SELECT 
                strftime('%Y-%m', expense_date) as month,
                SUM(amount) as total,
                COUNT(*) as count
            FROM expenses 
            WHERE expense_date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', expense_date)
            ORDER BY month DESC
        `);
        
        console.log('📊 Raw result type:', typeof monthlyResult);
        console.log('📊 Raw result isArray:', Array.isArray(monthlyResult));
        console.log('📊 Raw result:', monthlyResult);
        
        if (Array.isArray(monthlyResult)) {
            console.log('✅ Result is array, length:', monthlyResult.length);
            if (monthlyResult.length > 0) {
                console.log('📋 First item:', monthlyResult[0]);
            }
        } else {
            console.log('❌ Result is not array');
            console.log('🔍 Result keys:', Object.keys(monthlyResult));
        }
        
        // Test what we should return
        const monthlyStats = monthlyResult || [];
        console.log('📊 Final monthlyStats type:', typeof monthlyStats);
        console.log('📊 Final monthlyStats isArray:', Array.isArray(monthlyStats));
        console.log('📊 Final monthlyStats:', monthlyStats);
        
        // Test a simple query to see the structure
        console.log('\n🔍 Testing simple query...');
        const simpleResult = await db.raw('SELECT COUNT(*) as count FROM expenses');
        console.log('📊 Simple result:', simpleResult);
        
        // Test with knex query builder
        console.log('\n🔍 Testing with query builder...');
        const builderResult = await db('expenses')
            .select(db.raw("strftime('%Y-%m', expense_date) as month"))
            .sum('amount as total')
            .count('* as count')
            .where('expense_date', '>=', db.raw("date('now', '-12 months')"))
            .groupBy(db.raw("strftime('%Y-%m', expense_date)"))
            .orderBy('month', 'desc');
            
        console.log('📊 Builder result type:', typeof builderResult);
        console.log('📊 Builder result isArray:', Array.isArray(builderResult));
        console.log('📊 Builder result:', builderResult);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testSQLiteQuery();