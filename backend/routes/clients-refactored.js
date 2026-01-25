const express = require('express');
const clientsController = require('../controllers/clientsController');

const router = express.Router();

// Get all clients with balances, supporting search, filter, sort, pagination
router.get('/', clientsController.getAllClients);

// Get client by ID with balance details
router.get('/:id', clientsController.getClientById);

// Create new client
router.post('/', clientsController.createClient);

// Update client
router.put('/:id', clientsController.updateClient);

// Delete client
router.delete('/:id', clientsController.deleteClient);

// Get client payments
router.get('/:id/payments', clientsController.getClientPayments);

// Add client payment
router.post('/:id/payments', clientsController.addClientPayment);

// Update client payment
router.put('/:id/payments/:paymentId', clientsController.updateClientPayment);

// Delete client payment
router.delete('/:id/payments/:paymentId', clientsController.deleteClientPayment);

// Get client adjustments
router.get('/:id/adjustments', clientsController.getClientAdjustments);

// Add client adjustment
router.post('/:id/adjustments', clientsController.addClientAdjustment);

// Update client adjustment
router.put('/:id/adjustments/:adjustmentId', clientsController.updateClientAdjustment);

// Delete client adjustment
router.delete('/:id/adjustments/:adjustmentId', clientsController.deleteClientAdjustment);

// Get client deliveries report with date filtering
router.get('/:id/reports/deliveries', clientsController.getClientDeliveriesReport);

module.exports = router;