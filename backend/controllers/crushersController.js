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

            const payments = await db('crusher_payments')
                .where('crusher_id', crusherId)
                .orderBy('paid_at', 'desc');

            // Calculate total volume using car_volume - discount_volume (for crusher)
            const totalVolume = deliveries.reduce((sum, d) => {
                const carVolume = Number(d.car_volume || 0);
                const discount = Number(d.discount_volume || 0);
                return sum + Math.max(carVolume - discount, 0);
            }, 0);
            const totalValue = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);

            // Calculate total needed and total paid for commerce
            const totalNeeded = totalValue + totalAdjustments;
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const net = totalNeeded - totalPaid;

            // Aggregate totals per material for the cards in the view (using car_volume for crusher)
            const materialMap = {};
            deliveries.forEach(d => {
                const price = Number(d.material_price_at_time || 0);
                const carVolume = Number(d.car_volume || 0);
                const discount = Number(d.discount_volume || 0);
                const qty = Math.max(carVolume - discount, 0); // Use car volume for crusher calculations
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
                payments,
                totals: { totalVolume, totalValue: totalValue, totalAdjustments, deliveriesCount: deliveries.length, totalDeliveries: totalValue, totalNeeded, totalPaid, net },
                materialTotals
            });
        } catch (err) {
            next(err);
        }
    }
};
