const db = require('../db');
const { formatCurrency } = require('./utils');

module.exports = {
    async dashboard(req, res, next) {
        try {
            const [{ count: clientsCount }] = await db('clients').count({ count: 'id' });
            const [{ count: crushersCount }] = await db('crushers').count({ count: 'id' });
            const [{ count: contractorsCount }] = await db('contractors').count({ count: 'id' });
            const [{ count: deliveriesCount }] = await db('deliveries').count({ count: 'id' });
            const [{ sum: totalSales }] = await db('deliveries').sum({ sum: 'total_value' });
            const [{ sum: totalPayments }] = await db('payments').sum({ sum: 'amount' });

            const sales = Number(totalSales || 0);
            const paid = Number(totalPayments || 0);
            const netProfit = sales - paid;

            res.render('dashboard', {
                title: 'لوحة التحكم',
                activePage: 'dashboard',
                metrics: {
                    totalClients: Number(clientsCount || 0),
                    totalCrushers: Number(crushersCount || 0),
                    totalContractors: Number(contractorsCount || 0),
                    totalDeliveries: Number(deliveriesCount || 0),
                    totalSales: formatCurrency(sales),
                    netProfit: formatCurrency(netProfit)
                }
            });
        } catch (err) {
            next(err);
        }
    }
};
