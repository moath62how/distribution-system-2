const express = require('express');
const crushersController = require('../controllers/crushersController');

const router = express.Router();

// Get all crushers
router.get('/', crushersController.getAllCrushers);

// Get crusher by ID
router.get('/:id', crushersController.getCrusherById);

// Create new crusher
router.post('/', crushersController.createCrusher);

// Update crusher
router.put('/:id', crushersController.updateCrusher);

// Delete crusher
router.delete('/:id', crushersController.deleteCrusher);

// Get crusher payments
router.get('/:id/payments', crushersController.getCrusherPayments);

// Add crusher payment
router.post('/:id/payments', crushersController.addCrusherPayment);

// Update crusher payment
router.put('/:id/payments/:paymentId', crushersController.updateCrusherPayment);

// Delete crusher payment
router.delete('/:id/payments/:paymentId', crushersController.deleteCrusherPayment);

// Get crusher adjustments
router.get('/:id/adjustments', crushersController.getCrusherAdjustments);

// Add crusher adjustment
router.post('/:id/adjustments', crushersController.addCrusherAdjustment);

// Update crusher adjustment
router.put('/:id/adjustments/:adjustmentId', crushersController.updateCrusherAdjustment);

// Delete crusher adjustment
router.delete('/:id/adjustments/:adjustmentId', crushersController.deleteCrusherAdjustment);

module.exports = router;