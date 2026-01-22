require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./db');

// Import API routes (keep for backward compatibility if needed)
const clientsApiRouter = require('./routes/clients');
const crushersApiRouter = require('./routes/crushers');
const contractorsApiRouter = require('./routes/contractors');
const deliveriesApiRouter = require('./routes/deliveries');
const expensesApiRouter = require('./routes/expenses');

// Import Web routes (SSR)
const webRouter = require('./routes/web');

async function bootstrap() {
  await db.ensureTables();

  const app = express();
  app.use(morgan('dev'));
  
  // Enable CORS for all routes
  app.use(cors());
  
  // View engine setup
  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Session & Flash messages
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));
  app.use(flash());

  // Make flash messages available to all views
  app.use((req, res, next) => {
    const successArr = req.flash('success');
    const errorArr = req.flash('error');

    res.locals.messages = {
      success: successArr.length ? successArr.join(' | ') : null,
      error: errorArr.length ? errorArr.join(' | ') : null
    };
    res.locals.activePage = ''; // Will be set in routes
    next();
  });

  // Web routes (SSR with Pug)
  //// app.use('/', webRouter);

  // API routes (keep for backward compatibility or mobile apps)
  app.use('/api/clients', clientsApiRouter);
  app.use('/api/crushers', crushersApiRouter);
  app.use('/api/contractors', contractorsApiRouter);
  app.use('/api/deliveries', deliveriesApiRouter);
  app.use('/api/expenses', expensesApiRouter);

  // API metrics endpoint
  app.get('/api/metrics', async (req, res, next) => {
    try {
      const [{ count: clientsCount }] = await db('clients').count({ count: 'id' });
      const [{ count: crushersCount }] = await db('crushers').count({ count: 'id' });
      const [{ count: contractorsCount }] = await db('contractors').count({ count: 'id' });
      const [{ count: deliveriesCount }] = await db('deliveries').count({ count: 'id' });
      
      // Get all deliveries for proper calculations
      const deliveries = await db('deliveries').select('*');
      
      // CORRECT FINANCIAL LOGIC:
      
      // 1. Total Sales (Revenue from clients - what clients owe us)
      const totalSales = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
      
      // 2. Total Crusher Costs (what we owe crushers - using historical prices)
      const totalCrusherCosts = deliveries.reduce((sum, d) => {
        const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
        const materialPrice = Number(d.material_price_at_time || 0); // Use historical price stored in delivery
        return sum + (netQuantity * materialPrice);
      }, 0);
      
      // 3. Total Contractor Costs (what we owe contractors)
      const totalContractorCosts = deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0);
      
      // 4. Operating expenses
      const [{ sum: operatingExpenses }] = await db('expenses').sum({ sum: 'amount' });
      
      // 5. Total Expenses (all costs)
      const totalExpenses = totalCrusherCosts + totalContractorCosts + Number(operatingExpenses || 0);
      
      // 6. Net Profit (sales - all expenses)
      const netProfit = totalSales - totalExpenses;
      
      // 7. Cash flow tracking (actual payments made/received)
      const [{ sum: clientPayments }] = await db('payments').sum({ sum: 'amount' });
      const [{ sum: contractorPayments }] = await db('contractor_payments').sum({ sum: 'amount' });
      const [{ sum: crusherPayments }] = await db('crusher_payments').sum({ sum: 'amount' });
      
      const totalCashPayments = Number(clientPayments || 0) + Number(contractorPayments || 0) + Number(crusherPayments || 0);

      res.json({
        totalClients: Number(clientsCount || 0),
        totalCrushers: Number(crushersCount || 0),
        totalContractors: Number(contractorsCount || 0),
        totalDeliveries: Number(deliveriesCount || 0),
        
        // Revenue & Costs
        totalSales: Number(totalSales || 0),
        totalCrusherCosts: Number(totalCrusherCosts || 0),
        totalContractorCosts: Number(totalContractorCosts || 0),
        operatingExpenses: Number(operatingExpenses || 0),
        totalExpenses: Number(totalExpenses || 0),
        netProfit: Number(netProfit || 0),
        
        // Cash Flow
        totalClientPayments: Number(clientPayments || 0),
        totalContractorPayments: Number(contractorPayments || 0),
        totalCrusherPayments: Number(crusherPayments || 0),
        totalCashPayments: Number(totalCashPayments || 0)
      });
    } catch (err) {
      next(err);
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'خطأ 404',
      message: 'الصفحة غير موجودة'
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Check if this is an API request
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        message: 'حدث خطأ في السيرفر',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    }
    
    // For web requests, render error page
    res.status(500).render('error', {
      title: 'خطأ',
      message: 'حدث خطأ في السيرفر'
    });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});