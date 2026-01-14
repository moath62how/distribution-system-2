const db = require('../db');
const { toNumber } = require('./utils');
const ApiFeatures = require('./apiFeatures');

async function getClient(id) {
    return db('clients').where({ id }).first();
}

async function computeClientTotals(clientId) {
    const [{ sum: deliveriesSum }] = await db('deliveries')
        .where({ client_id: clientId })
        .sum({ sum: db.raw('price_per_meter * quantity') });

    const [{ sum: paymentsSum }] = await db('payments')
        .where({ client_id: clientId })
        .sum({ sum: 'amount' });

    const [{ sum: adjustmentsSum }] = await db('adjustments')
        .where({ entity_type: 'client', entity_id: clientId })
        .sum({ sum: 'amount' });

    const client = await getClient(clientId);
    const opening = client ? toNumber(client.opening_balance) : 0;

    const totalDeliveries = toNumber(deliveriesSum);
    const totalPayments = toNumber(paymentsSum);
    const totalAdjustments = toNumber(adjustmentsSum);

    return {
        openingBalance: opening,
        totalDeliveries,
        totalPayments,
        totalAdjustments,
        balance: opening + totalDeliveries + totalAdjustments - totalPayments
    };
}

module.exports = {
    async clientsIndex(req, res, next) {
        try {
            const baseQuery = db('clients').select('id', 'name', 'phone', 'opening_balance');
            const features = new ApiFeatures(baseQuery, req.query);
            // search: use `q` or `search` param; filter by id or other allowed fields; sort by `sort`; paginate with `page` & `limit`
            await features
                .search(['name', 'phone'])
                .filter(['id'])
                .sort('id')
                .paginate(25);

            const { data: clients, pagination } = await features.get();

            const enriched = await Promise.all(
                clients.map(async (client) => {
                    const totals = await computeClientTotals(client.id);
                    return { ...client, ...totals };
                })
            );

            res.render('clients/index', {
                title: 'العملاء',
                clients: enriched,
                pagination,
                activePage: 'clients'
            });
        } catch (err) {
            next(err);
        }
    },

    async clientDetails(req, res, next) {
        try {
            const { id } = req.params;
            const client = await getClient(id);

            if (!client) {
                return res.status(404).render('error', {
                    title: 'خطأ',
                    message: 'العميل غير موجود'
                });
            }

            const totals = await computeClientTotals(id);
            const deliveries = await db('deliveries as d')
                .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
                .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
                .select(
                    'd.*',
                    'c.name as crusher_name',
                    'ct.name as contractor_name'
                )
                .where('d.client_id', id)
                .orderBy('d.created_at', 'desc');

            deliveries.forEach(d => {
                const price = Number(d.price_per_meter || 0);
                const qty = Number(d.quantity || 0);
                d.total_value = price * qty;
            });

            const materialMap = {};
            deliveries.forEach(d => {
                const key = (d.material || 'غير محدد').toString();
                if (!materialMap[key]) materialMap[key] = { totalQty: 0, totalValue: 0 };
                materialMap[key].totalQty += Number(d.quantity || 0);
                materialMap[key].totalValue += Number(d.total_value || 0);
            });
            const materialTotals = Object.keys(materialMap).map(k => ({ material: k, ...materialMap[k] }));
            materialTotals.sort((a, b) => b.totalQty - a.totalQty);

            const payments = await db('payments')
                .where({ client_id: id })
                .orderBy('paid_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'client', entity_id: id })
                .orderBy('created_at', 'desc');

            console.log(totals);
            totals.totalDeliveries;
            res.render('clients/details', {
                title: `تفاصيل العميل - ${client.name}`,
                client,
                totals,
                materialTotals,
                deliveries,
                payments,
                adjustments,
                activePage: 'clients'
            });
        } catch (err) {
            next(err);
        }
    },

    async createClient(req, res, next) {
        try {
            const { name, phone, opening_balance } = req.body;

            if (!name || !name.trim()) {
                req.flash('error', 'الاسم مطلوب');
                return res.redirect('/clients');
            }

            await db('clients').insert({
                name: name.trim(),
                phone: phone || null,
                opening_balance: toNumber(opening_balance)
            });

            req.flash('success', 'تم إضافة العميل بنجاح');
            res.redirect('/clients');
        } catch (err) {
            next(err);
        }
    },

    async addClientPayment(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, note, paid_at } = req.body;

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                req.flash('error', 'المبلغ غير صالح');
                return res.redirect(`/clients/${id}`);
            }

            await db('payments').insert({
                client_id: id,
                amount: toNumber(amount),
                note: note || null,
                paid_at: paid_at || db.fn.now()
            });

            req.flash('success', 'تم إضافة الدفعة بنجاح');
            res.redirect(`/clients/${id}`);
        } catch (err) {
            next(err);
        }
    },

    async addClientAdjustment(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, reason } = req.body;

            if (!amount || isNaN(amount) || Number(amount) === 0) {
                req.flash('error', 'القيمة غير صالحة');
                return res.redirect(`/clients/${id}`);
            }

            await db('adjustments').insert({
                entity_type: 'client',
                entity_id: id,
                amount: toNumber(amount),
                reason: reason || null,
                created_at: db.fn.now()
            });

            req.flash('success', 'تم إضافة التسوية بنجاح');
            res.redirect(`/clients/${id}`);
        } catch (err) {
            next(err);
        }
    }
};
