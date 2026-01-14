const db = require('../db');

module.exports = {
    async crushersIndex(req, res, next) {
        try {
            const crushers = await db('crushers')
                .leftJoin('deliveries', 'crushers.id', 'deliveries.crusher_id')
                .select('crushers.id', 'crushers.name')
                .sum('deliveries.quantity as totalVolume')
                .sum('deliveries.total_value as totalValue')
                .groupBy('crushers.id');

            res.render('crushers/index', { crushers });
        } catch (err) {
            next(err);
        }
    },

    async crusherDetails(req, res, next) {
        const crusherId = req.params.id;
        try {
            const crusher = await db('crushers').where('id', crusherId).first();
            if (!crusher) return res.status(404).send('الكسارة غير موجودة');

            const deliveries = await db('deliveries')
                .where('crusher_id', crusherId)
                .orderBy('created_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'crusher', entity_id: crusherId })
                .orderBy('created_at', 'desc');

            const totalVolume = deliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
            const totalValue = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);

            // Aggregate totals per material for the cards in the view
            const materialMap = {};
            deliveries.forEach(d => {
                const price = Number(d.price_per_meter || 0);
                const qty = Number(d.quantity || 0);
                // ensure total_value is consistent
                d.total_value = price * qty;

                const key = (d.material || 'غير محدد').toString();
                if (!materialMap[key]) materialMap[key] = { totalQty: 0, totalValue: 0 };
                materialMap[key].totalQty += qty;
                materialMap[key].totalValue += Number(d.total_value || 0);
            });
            const materialTotals = Object.keys(materialMap).map(k => ({ material: k, ...materialMap[k] }));
            materialTotals.sort((a, b) => b.totalQty - a.totalQty);

            res.render('crushers/details', {
                title: `تفاصيل الكسارة: ${crusher.name}`,
                crusher,
                deliveries,
                adjustments,
                totals: { totalVolume, totalValue, totalAdjustments, deliveriesCount: deliveries.length },
                materialTotals
            });
        } catch (err) {
            next(err);
        }
    }
};
