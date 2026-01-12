const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

async function getClient(id) {
    return db('clients').where({ id }).first();
}

async function computeClientTotals(clientId) {
    const [{ sum: deliveriesSum }] = await db('deliveries')
        .where({ client_id: clientId })
        .sum({ sum: 'total_value' });

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

// Get all clients with balances
router.get('/', async (req, res, next) => {
    try {
        const clients = await db('clients')
            .select('id', 'name', 'phone', 'opening_balance')
            .orderBy('id', 'desc');

        const enriched = await Promise.all(
            clients.map(async (client) => {
                const totals = await computeClientTotals(client.id);
                return { ...client, ...totals };
            })
        );

        res.json(enriched);
    } catch (err) {
        next(err);
    }
});

// Create a new client
router.post('/', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'الاسم مطلوب' });
        }

        const [id] = await db('clients').insert({
            name: name.trim(),
            phone: phone || null,
            opening_balance: toNumber(opening_balance)
        });

        const created = await getClient(id);
        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

// Client details with deliveries, payments, adjustments
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
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

        const payments = await db('payments')
            .where({ client_id: id })
            .orderBy('paid_at', 'desc');

        const adjustments = await db('adjustments')
            .where({ entity_type: 'client', entity_id: id })
            .orderBy('created_at', 'desc');

        res.json({ client, totals, deliveries, payments, adjustments });
    } catch (err) {
        next(err);
    }
});

// Add client payment
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, note, paid_at } = req.body;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'المبلغ غير صالح' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        const [paymentId] = await db('payments').insert({
            client_id: id,
            amount: toNumber(amount),
            note: note || null,
            paid_at: paid_at || db.fn.now()
        });

        const payment = await db('payments').where({ id: paymentId }).first();
        res.status(201).json(payment);
    } catch (err) {
        next(err);
    }
});

// Add client adjustment (positive or negative)
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;
        if (!amount || isNaN(amount) || Number(amount) === 0) {
            return res.status(400).json({ message: 'القيمة غير صالحة' });
        }

        const client = await getClient(id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        const [adjId] = await db('adjustments').insert({
            entity_type: 'client',
            entity_id: id,
            amount: toNumber(amount),
            reason: reason || null,
            created_at: db.fn.now()
        });

        const adjustment = await db('adjustments').where({ id: adjId }).first();
        res.status(201).json(adjustment);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
