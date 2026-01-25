// Export all models for easy importing
const Client = require('./Client');
const Crusher = require('./Crusher');
const Contractor = require('./Contractor');
const Delivery = require('./Delivery');
const Payment = require('./Payment');
const ContractorPayment = require('./ContractorPayment');
const CrusherPayment = require('./CrusherPayment');
const Adjustment = require('./Adjustment');
const Expense = require('./Expense');

module.exports = {
    Client,
    Crusher,
    Contractor,
    Delivery,
    Payment,
    ContractorPayment,
    CrusherPayment,
    Adjustment,
    Expense
};