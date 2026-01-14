const db = require('../db');
const { toNumber } = require('./utils');

module.exports = {
    async contractorsIndex(req, res, next) {
        try {
            const contractors = await db('contractors').select('*');

            const contractorsWithTotals = await Promise.all(
                contractors.map(async c => {
                    const totalTrips = await db('deliveries')
                        .where('contractor_id', c.id)
                        .sum('contractor_charge as total')
                        .first();
                    const totalPayments = await db('contractor_payments')
                        .where('contractor_id', c.id)
                        .sum('amount as total')
                        .first();
                    const totalAdjustments = await db('adjustments')
                        .where({ entity_type: 'contractor', entity_id: c.id })
                        .sum('amount as total')
                        .first();

                    const balance = Number(c.opening_balance || 0)
                        + Number(totalTrips.total || 0)
                        - Number(totalPayments.total || 0)
                        + Number(totalAdjustments.total || 0);

                    return {
                        ...c,
                        totalTrips: totalTrips.total || 0,
                        totalPayments: totalPayments.total || 0,
                        totalAdjustments: totalAdjustments.total || 0,
                        balance
                    };
                })
            );

            res.render('contractors/index', { contractors: contractorsWithTotals });
        } catch (err) {
            next(err);
        }
    },

    async createContractor(req, res, next) {
        try {
            const { name, opening_balance } = req.body;

            if (!name || !name.trim()) {
                req.flash('error', 'الاسم مطلوب');
                return res.redirect('/contractors');
            }

            await db('contractors').insert({
                name: name.trim(),
                opening_balance: toNumber(opening_balance)
            });

            req.flash('success', 'تم إضافة المقاول بنجاح');
            res.redirect('/contractors');
        } catch (err) {
            next(err);
        }
    },

    async contractorDetails(req, res, next) {
        const contractorId = req.params.id;
        try {
            const contractor = await db('contractors').where('id', contractorId).first();
            if (!contractor) return res.status(404).send('المقاول غير موجود');

            const deliveries = await db('deliveries')
                .where('contractor_id', contractorId)
                .leftJoin('clients', 'deliveries.client_id', 'clients.id')
                .leftJoin('crushers', 'deliveries.crusher_id', 'crushers.id')
                .select(
                    'deliveries.*',
                    'clients.name as client_name',
                    'crushers.name as crusher_name'
                )
                .orderBy('deliveries.created_at', 'desc');

            const payments = await db('contractor_payments')
                .where({ contractor_id: contractorId })
                .orderBy('paid_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'contractor', entity_id: contractorId })
                .orderBy('created_at', 'desc');

            const totalTrips = deliveries.reduce((sum, d) => sum + Number(d.contractor_charge || 0), 0);
            const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const balance = Number(contractor.opening_balance || 0) + totalTrips - totalPayments + totalAdjustments;

            const totals = {
                openingBalance: Number(contractor.opening_balance || 0),
                totalTrips,
                totalPayments,
                totalAdjustments,
                balance
            };

            res.render('contractors/details', { contractor, deliveries, payments, adjustments, totals });
        } catch (err) {
            next(err);
        }
    }
};
