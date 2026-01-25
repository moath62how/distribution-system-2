const express = require('express');
const deliveriesController = require('../controllers/deliveriesController');

const router = express.Router();

// Get all deliveries (simple)
router.get('/', deliveriesController.getAllDeliveries);

// Get deliveries with filters and pagination
router.get('/search', deliveriesController.getDeliveriesWithFilters);

// Get delivery by ID
router.get('/:id', deliveriesController.getDeliveryById);

// Create new delivery
router.post('/', deliveriesController.createDelivery);

// Update delivery
router.put('/:id', deliveriesController.updateDelivery);

// Delete delivery
router.delete('/:id', deliveriesController.deleteDelivery);

module.exports = router;