const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Expense categories
const EXPENSE_CATEGORIES = [
    'وقود',
    'صيانة',
    'رواتب',
    'إيجار',
    'كهرباء',
    'مياه',
    'اتصالات',
    'مواد خام',
    'نقل',
    'تأمين',
    'ضرائب',
    'أخرى'
];

// Get all expenses with filtering and sorting
router.get('/', async (req, res, next) => {
    try {
        const { 
            category, 
            start_date, 
            end_date, 
            sort = 'date-desc',
            page = 1,
            limit = 50 
        } = req.query;

        let query = db('expenses').select('*');

        // Apply filters
        if (category && category !== 'all') {
            query = query.where('category', category);
        }

        if (start_date) {
            query = query.where('expense_date', '>=', start_date);
        }

        if (end_date) {
            query = query.where('expense_date', '<=', end_date);
        }

        // Apply sorting
        switch (sort) {
            case 'date-asc':
                query = query.orderBy('expense_date', 'asc');
                break;
            case 'date-desc':
                query = query.orderBy('expense_date', 'desc');
                break;
            case 'amount-asc':
                query = query.orderBy('amount', 'asc');
                break;
            case 'amount-desc':
                query = query.orderBy('amount', 'desc');
                break;
            default:
                query = query.orderBy('expense_date', 'desc');
        }

        // Apply pagination
        const offset = (page - 1) * limit;
        const expenses = await query.limit(limit).offset(offset);

        // Get total count for pagination
        let countQuery = db('expenses').count('* as count');
        if (category && category !== 'all') {
            countQuery = countQuery.where('category', category);
        }
        if (start_date) {
            countQuery = countQuery.where('expense_date', '>=', start_date);
        }
        if (end_date) {
            countQuery = countQuery.where('expense_date', '<=', end_date);
        }

        const [{ count }] = await countQuery;
        const totalPages = Math.ceil(count / limit);

        res.json({
            data: expenses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(count),
                pages: totalPages
            },
            categories: EXPENSE_CATEGORIES
        });
    } catch (err) {
        next(err);
    }
});

// Get expense statistics
router.get('/stats', async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;

        let query = db('expenses');
        
        if (start_date) {
            query = query.where('expense_date', '>=', start_date);
        }
        
        if (end_date) {
            query = query.where('expense_date', '<=', end_date);
        }

        // Total expenses
        const [{ total }] = await query.clone().sum('amount as total');

        // Expenses by category
        const categoryStats = await query.clone()
            .select('category')
            .sum('amount as total')
            .groupBy('category')
            .orderBy('total', 'desc');

        // Monthly expenses (last 12 months) - Using Knex query builder for better compatibility
        const monthlyStats = await db('expenses')
            .select(db.raw("strftime('%Y-%m', expense_date) as month"))
            .sum('amount as total')
            .count('* as count')
            .where('expense_date', '>=', db.raw("date('now', '-12 months')"))
            .groupBy(db.raw("strftime('%Y-%m', expense_date)"))
            .orderBy('month', 'desc');

        res.json({
            totalExpenses: toNumber(total),
            categoryBreakdown: categoryStats,
            monthlyTrend: monthlyStats,
            categories: EXPENSE_CATEGORIES
        });
    } catch (err) {
        next(err);
    }
});

// Create new expense
router.post('/', async (req, res, next) => {
    try {
        const { expense_date, category, description, amount, notes } = req.body;

        // Validation
        if (!expense_date || !category || !description || !amount) {
            return res.status(400).json({ 
                message: 'التاريخ والفئة والوصف والمبلغ مطلوبة' 
            });
        }

        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ 
                message: 'المبلغ يجب أن يكون رقم موجب' 
            });
        }

        if (!EXPENSE_CATEGORIES.includes(category)) {
            return res.status(400).json({ 
                message: 'فئة المصروف غير صالحة' 
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(expense_date)) {
            return res.status(400).json({ 
                message: 'تنسيق التاريخ غير صالح' 
            });
        }

        const [id] = await db('expenses').insert({
            expense_date,
            category,
            description: description.trim(),
            amount: toNumber(amount),
            notes: notes ? notes.trim() : null,
            created_at: db.fn.now()
        });

        const expense = await db('expenses').where({ id }).first();
        res.status(201).json(expense);
    } catch (err) {
        next(err);
    }
});

// Get single expense
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const expense = await db('expenses').where({ id }).first();
        
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.json(expense);
    } catch (err) {
        next(err);
    }
});

// Update expense
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { expense_date, category, description, amount, notes } = req.body;

        const expense = await db('expenses').where({ id }).first();
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        // Validation
        if (!expense_date || !category || !description || !amount) {
            return res.status(400).json({ 
                message: 'التاريخ والفئة والوصف والمبلغ مطلوبة' 
            });
        }

        if (isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ 
                message: 'المبلغ يجب أن يكون رقم موجب' 
            });
        }

        if (!EXPENSE_CATEGORIES.includes(category)) {
            return res.status(400).json({ 
                message: 'فئة المصروف غير صالحة' 
            });
        }

        await db('expenses').where({ id }).update({
            expense_date,
            category,
            description: description.trim(),
            amount: toNumber(amount),
            notes: notes ? notes.trim() : null,
            updated_at: db.fn.now()
        });

        const updatedExpense = await db('expenses').where({ id }).first();
        res.json(updatedExpense);
    } catch (err) {
        next(err);
    }
});

// Delete expense
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const expense = await db('expenses').where({ id }).first();
        if (!expense) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        await db('expenses').where({ id }).del();
        res.json({ message: 'تم حذف المصروف بنجاح' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;