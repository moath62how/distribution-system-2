const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    phone: {
        type: String,
        maxlength: 100
    },
    opening_balance: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Virtual for calculating current balance
clientSchema.virtual('balance').get(async function () {
    const Delivery = mongoose.model('Delivery');
    const Payment = mongoose.model('Payment');
    const Adjustment = mongoose.model('Adjustment');

    const deliveries = await Delivery.find({ client_id: this._id });
    const payments = await Payment.find({ client_id: this._id });
    const adjustments = await Adjustment.find({ entity_type: 'client', entity_id: this._id });

    const totalDeliveries = deliveries.reduce((sum, d) => sum + (d.total_value || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, a) => sum + (a.amount || 0), 0);

    return this.opening_balance + totalDeliveries + totalAdjustments - totalPayments;
});

module.exports = mongoose.model('Client', clientSchema);