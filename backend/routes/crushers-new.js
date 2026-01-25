const express = require('express');
const { Crusher } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all crushers
router.get('/', async (req, res, next) => {
    try {
        const crushers = await Crusher.find().sort({ name: 1 });

        const result = crushers.map(crusher => ({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        }));

        res.json({ crushers: result });
    } catch (err) {
        next(err);
    }
});

// Get crusher by ID
router.get('/:id', async (req, res, next) => {
    try {
        const crusher = await Crusher.findById(req.params.id);

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        res.json({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Create new crusher
router.post('/', async (req, res, next) => {
    try {
        const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
        }

        const crusher = new Crusher({
            name: name.trim(),
            sand_price: toNumber(sand_price),
            aggregate1_price: toNumber(aggregate1_price),
            aggregate2_price: toNumber(aggregate2_price),
            aggregate3_price: toNumber(aggregate3_price)
        });

        await crusher.save();

        res.status(201).json({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update crusher
router.put('/:id', async (req, res, next) => {
    try {
        const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
        }

        const crusher = await Crusher.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                sand_price: toNumber(sand_price),
                aggregate1_price: toNumber(aggregate1_price),
                aggregate2_price: toNumber(aggregate2_price),
                aggregate3_price: toNumber(aggregate3_price)
            },
            { new: true }
        );

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        res.json({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete crusher
router.delete('/:id', async (req, res, next) => {
    try {
        const crusher = await Crusher.findByIdAndDelete(req.params.id);

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        res.json({ message: 'تم حذف الكسارة بنجاح' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;