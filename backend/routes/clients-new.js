const express = require('express');
const { Client, Delivery, Payment, Adjustment } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Helper function for date formatting
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

async function getClient(id) {
    return await Client.findById(id);
}

async function computeClientTotals(clientId) {
    const deliveries = await Delivery.find({ client_id: clientId });
    const payments = await Payment.find({ client_id: clientId });
    const adjustments = await Adjustment.find({ entity_type: 'client', entity_id: clientId });

    const client = await getClient(clientId);
    const opening = client ? toNumber(client.opening_balance) : 0;

    const totalDeliveries = deliveries.reduce((sum, d) => sum + toNumber(d.total_value), 0);
    const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
    const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

    return {
        openingBalance: opening,
        totalDeliveries,
        totalPayments,
        totalAdjustments,
        balance: opening + totalDeliveries + totalAdjustments - totalPayments
    };
}

// Get all clients with balances, supporting search, filter, sort, pagination
router.get('/', async (req, res, next) => {
    try {
        const {
            search,
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 25
        } = req.query;

        let filter = {};

        if (search) {
            filter = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const clients = await Client.find(filter)
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Client.countDocuments(filter);

        // Calculate balances for each client
        const enriched = await Promise.all(
            clients.map(async (client) => {
                const totals = await computeClientTotals(client._id);
                return {
                    id: client._id,
                    name: client.name,
                    phone: client.phone,
                    opening_balance: client.opening_balance,
                    created_at: client.created_at,
                    ...totals
                };
            })
        );

        res.json({
            clients: enriched,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get client by ID with balance details
router.get('/:id', async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        const totals = await computeClientTotals(client._id);

        res.json({
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at,
            ...totals
        });
    } catch (err) {
        next(err);
    }
});

// Create new client
router.post('/', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم العميل مطلوب' });
        }

        const client = new Client({
            name: name.trim(),
            phone: phone?.trim() || '',
            opening_balance: toNumber(opening_balance)
        });

        await client.save();

        res.status(201).json({
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
        }
        next(err);
    }
});

// Update client
router.put('/:id', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم العميل مطلوب' });
        }

        const client = await Client.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                phone: phone?.trim() || '',
                opening_balance: toNumber(opening_balance)
            },
            { new: true }
        );

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        res.json({
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
        }
        next(err);
    }
});

// Delete client
router.delete('/:id', async (req, res, next) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        res.json({ message: 'تم حذف العميل بنجاح' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;