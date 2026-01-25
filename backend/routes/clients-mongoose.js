const express = require('express');
const { Client, Delivery, Payment, Adjustment } = require('../models');
const ClientService = require('../services/clientService');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Helper function for date formatting
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

// Get all clients with balances, supporting search, filter, sort, pagination
router.get('/', async (req, res, next) => {
    try {
        const result = await ClientService.getAll(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// Get client by ID with balance details
router.get('/:id', async (req, res, next) => {
    try {
        const client = await ClientService.getById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        res.json(client);
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

        const client = await ClientService.create({
            name: name.trim(),
            phone: phone?.trim() || '',
            opening_balance: toNumber(opening_balance)
        });

        res.status(201).json(client);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
        }
        next(err);
    }
});

module.exports = router;