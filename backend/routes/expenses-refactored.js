const express = require('express');
const expensesController = require('../controllers/expensesController');

const router = express.Router();

// Get expense statistics
router.get('/stats', expensesController.getExpenseStats);

// Get all expenses (simple)
router.get('/', expensesController.getAllExpenses);

// Get expenses with filters and pagination
router.get('/search', expensesController.getExpensesWithFilters);

// Get expense by ID
router.get('/:id', expensesController.getExpenseById);

// Create new expense
router.post('/', expensesController.createExpense);

// Update expense
router.put('/:id', expensesController.updateExpense);

// Delete expense
router.delete('/:id', expensesController.deleteExpense);

module.exports = router;