const express = require('express');
const contractorsController = require('../controllers/contractorsController');

const router = express.Router();

// Get all contractors
router.get('/', contractorsController.getAllContractors);

// Get contractor by ID
router.get('/:id', contractorsController.getContractorById);

// Create new contractor
router.post('/', contractorsController.createContractor);

// Update contractor
router.put('/:id', contractorsController.updateContractor);

// Delete contractor
router.delete('/:id', contractorsController.deleteContractor);

// Get contractor payments
router.get('/:id/payments', contractorsController.getContractorPayments);

// Add contractor payment
router.post('/:id/payments', contractorsController.addContractorPayment);

// Update contractor payment
router.put('/:id/payments/:paymentId', contractorsController.updateContractorPayment);

// Delete contractor payment
router.delete('/:id/payments/:paymentId', contractorsController.deleteContractorPayment);

// Get contractor adjustments
router.get('/:id/adjustments', contractorsController.getContractorAdjustments);

// Add contractor adjustment
router.post('/:id/adjustments', contractorsController.addContractorAdjustment);

// Update contractor adjustment
router.put('/:id/adjustments/:adjustmentId', contractorsController.updateContractorAdjustment);

// Delete contractor adjustment
router.delete('/:id/adjustments/:adjustmentId', contractorsController.deleteContractorAdjustment);

module.exports = router;