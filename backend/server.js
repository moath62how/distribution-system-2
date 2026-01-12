require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./db');

// Import API routes (keep for backward compatibility if needed)
const clientsApiRouter = require('./routes/clients');
const crushersApiRouter = require('./routes/crushers');
const contractorsApiRouter = require('./routes/contractors');
const deliveriesApiRouter = require('./routes/deliveries');

// Import Web routes (SSR)
const webRouter = require('./routes/web');

async function bootstrap() {
  await db.ensureTables();

  const app = express();

  // View engine setup
  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
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
  app.use('/', webRouter);

  // API routes (keep for backward compatibility or mobile apps)
  app.use('/api/clients', clientsApiRouter);
  app.use('/api/crushers', crushersApiRouter);
  app.use('/api/contractors', contractorsApiRouter);
  app.use('/api/deliveries', deliveriesApiRouter);

  // API metrics endpoint
  app.get('/api/metrics', async (req, res, next) => {
    try {
      const [{ count: clientsCount }] = await db('clients').count({ count: 'id' });
      const [{ count: crushersCount }] = await db('crushers').count({ count: 'id' });
      const [{ count: contractorsCount }] = await db('contractors').count({ count: 'id' });
      const [{ count: deliveriesCount }] = await db('deliveries').count({ count: 'id' });
      const [{ sum: totalSales }] = await db('deliveries').sum({ sum: 'total_value' });
      const [{ sum: totalPayments }] = await db('payments').sum({ sum: 'amount' });

      const sales = Number(totalSales || 0);
      const paid = Number(totalPayments || 0);

      res.json({
        totalClients: Number(clientsCount || 0),
        totalCrushers: Number(crushersCount || 0),
        totalContractors: Number(contractorsCount || 0),
        totalDeliveries: Number(deliveriesCount || 0),
        totalSales: sales,
        totalPayments: paid,
        netProfit: sales - paid
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
    res.status(500).render('error', {
      title: 'خطأ',
      message: 'حدث خطأ في السيرفر'
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});