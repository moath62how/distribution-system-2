const express = require('express');
const { Contractor } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all contractors
router.get('/', async (req, res, next) => {
    try {
        const contractors = await Contractor.find().sort({ name: 1 });

        const result = contractors.map(contractor => ({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        }));

        res.json({ contractors: result });
    } catch (err) {
        next(err);
    }
});

// Get contractor by ID
router.get('/:id', async (req, res, next) => {
    try {
        const contractor = await Contractor.findById(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        res.json({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Create new contractor
router.post('/', async (req, res, next) => {
    try {
        const { name, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم المقاول مطلوب' });
        }

        const contractor = new Contractor({
            name: name.trim(),
            opening_balance: toNumber(opening_balance)
        });

        await contractor.save();

        res.status(201).json({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update contractor
router.put('/:id', async (req, res, next) => {
    try {
        const { name, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم المقاول مطلوب' });
        }

        const contractor = await Contractor.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                opening_balance: toNumber(opening_balance)
            },
            { new: true }
        );

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        res.json({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete contractor
router.delete('/:id', async (req, res, next) => {
    try {
        const contractor = await Contractor.findByIdAndDelete(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        res.json({ message: 'تم حذف المقاول بنجاح' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;