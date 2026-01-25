const express = require('express');
const { Expense } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all expenses
router.get('/', async (req, res, next) => {
    try {
        const expenses = await Expense.find().sort({ expense_date: -1 });

        const result = expenses.map(expense => ({
            id: expense._id,
            expense_date: expense.expense_date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        }));

        res.json({ expenses: result });
    } catch (err) {
        next(err);
    }
});

// Get expense by ID
router.get('/:id', async (req, res, next) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.json({
            id: expense._id,
            expense_date: expense.expense_date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        });
    } catch (err) {
        next(err);
    }
});

// Create new expense
router.post('/', async (req, res, next) => {
    try {
        const { expense_date, category, description, amount, notes, method, details } = req.body;

        if (!expense_date || !category || !description || !amount) {
            return res.status(400).json({ message: 'التاريخ والفئة والوصف والمبلغ مطلوبة' });
        }

        const expense = new Expense({
            expense_date: new Date(expense_date),
            category: category.trim(),
            description: description.trim(),
            amount: toNumber(amount),
            notes: notes?.trim() || '',
            method: method?.trim() || '',
            details: details?.trim() || ''
        });

        await expense.save();

        res.status(201).json({
            id: expense._id,
            expense_date: expense.expense_date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        });
    } catch (err) {
        next(err);
    }
});

// Update expense
router.put('/:id', async (req, res, next) => {
    try {
        const { expense_date, category, description, amount, notes, method, details } = req.body;

        if (!expense_date || !category || !description || !amount) {
            return res.status(400).json({ message: 'التاريخ والفئة والوصف والمبلغ مطلوبة' });
        }

        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            {
                expense_date: new Date(expense_date),
                category: category.trim(),
                description: description.trim(),
                amount: toNumber(amount),
                notes: notes?.trim() || '',
                method: method?.trim() || '',
                details: details?.trim() || ''
            },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.json({
            id: expense._id,
            expense_date: expense.expense_date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete expense
router.delete('/:id', async (req, res, next) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.json({ message: 'تم حذف المصروف بنجاح' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;