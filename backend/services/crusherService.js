const { Crusher, Delivery, CrusherPayment, Adjustment } = require('../models');

const toNumber = (v) => Number(v || 0);

class CrusherService {
    static async getAllCrushers() {
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

        return { crushers: result };
    }

    static async getCrusherById(id) {
        const crusher = await Crusher.findById(id);

        if (!crusher) {
            return null;
        }

        // Get related data
        const deliveries = await Delivery.find({ crusher_id: id })
            .populate('client_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const payments = await CrusherPayment.find({ crusher_id: id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'crusher',
            entity_id: id
        }).sort({ created_at: -1 });

        // Calculate totals
        const totals = await this.computeCrusherTotals(id);

        return {
            crusher: {
                id: crusher._id,
                name: crusher.name,
                sand_price: crusher.sand_price,
                aggregate1_price: crusher.aggregate1_price,
                aggregate2_price: crusher.aggregate2_price,
                aggregate3_price: crusher.aggregate3_price,
                created_at: crusher.created_at
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                client_name: d.client_id?.name || '',
                contractor_name: d.contractor_id?.name || '',
                material: d.material,
                voucher: d.voucher,
                quantity: d.quantity,
                discount_volume: d.discount_volume,
                net_quantity: d.net_quantity,
                material_price_at_time: d.material_price_at_time,
                crusher_total_cost: d.crusher_total_cost,
                driver_name: d.driver_name,
                car_head: d.car_head,
                car_tail: d.car_tail,
                car_volume: d.car_volume,
                created_at: d.created_at
            })),
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                method: p.method,
                details: p.details,
                note: p.note,
                paid_at: p.paid_at
            })),
            adjustments: adjustments.map(a => ({
                id: a._id,
                amount: a.amount,
                method: a.method,
                details: a.details,
                reason: a.reason,
                created_at: a.created_at
            })),
            totals
        };
    }

    static async createCrusher(data) {
        const crusher = new Crusher({
            name: data.name,
            sand_price: toNumber(data.sand_price),
            aggregate1_price: toNumber(data.aggregate1_price),
            aggregate2_price: toNumber(data.aggregate2_price),
            aggregate3_price: toNumber(data.aggregate3_price)
        });

        await crusher.save();

        return {
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        };
    }

    static async updateCrusher(id, data) {
        const crusher = await Crusher.findByIdAndUpdate(
            id,
            {
                name: data.name,
                sand_price: toNumber(data.sand_price),
                aggregate1_price: toNumber(data.aggregate1_price),
                aggregate2_price: toNumber(data.aggregate2_price),
                aggregate3_price: toNumber(data.aggregate3_price)
            },
            { new: true }
        );

        if (!crusher) {
            return null;
        }

        return {
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        };
    }

    static async deleteCrusher(id) {
        return await Crusher.findByIdAndDelete(id);
    }

    static async computeCrusherTotals(crusherId) {
        const deliveries = await Delivery.find({ crusher_id: crusherId });
        const payments = await CrusherPayment.find({ crusher_id: crusherId });
        const adjustments = await Adjustment.find({ entity_type: 'crusher', entity_id: crusherId });

        const totalCosts = deliveries.reduce((sum, d) => sum + toNumber(d.crusher_total_cost), 0);
        const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

        return {
            totalCosts,
            totalPayments,
            totalAdjustments,
            balance: totalCosts + totalAdjustments - totalPayments
        };
    }

    // Payment methods
    static async getCrusherPayments(crusherId) {
        return await CrusherPayment.find({ crusher_id: crusherId }).sort({ paid_at: -1 });
    }

    static async addCrusherPayment(crusherId, data) {
        const payment = new CrusherPayment({
            crusher_id: crusherId,
            amount: toNumber(data.amount),
            method: data.method,
            details: data.details,
            note: data.note,
            paid_at: data.paid_at
        });

        await payment.save();

        return {
            id: payment._id,
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        };
    }

    static async updateCrusherPayment(crusherId, paymentId, data) {
        const payment = await CrusherPayment.findOneAndUpdate(
            { _id: paymentId, crusher_id: crusherId },
            {
                amount: toNumber(data.amount),
                method: data.method,
                details: data.details,
                note: data.note,
                paid_at: data.paid_at
            },
            { new: true }
        );

        if (!payment) {
            return null;
        }

        return {
            id: payment._id,
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        };
    }

    static async deleteCrusherPayment(crusherId, paymentId) {
        return await CrusherPayment.findOneAndDelete({
            _id: paymentId,
            crusher_id: crusherId
        });
    }

    // Adjustment methods
    static async getCrusherAdjustments(crusherId) {
        return await Adjustment.find({
            entity_type: 'crusher',
            entity_id: crusherId
        }).sort({ created_at: -1 });
    }

    static async addCrusherAdjustment(crusherId, data) {
        const adjustment = new Adjustment({
            entity_type: 'crusher',
            entity_id: crusherId,
            amount: toNumber(data.amount),
            method: data.method,
            details: data.details,
            reason: data.reason
        });

        await adjustment.save();

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async updateCrusherAdjustment(crusherId, adjustmentId, data) {
        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: adjustmentId,
                entity_type: 'crusher',
                entity_id: crusherId
            },
            {
                amount: toNumber(data.amount),
                method: data.method,
                details: data.details,
                reason: data.reason
            },
            { new: true }
        );

        if (!adjustment) {
            return null;
        }

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async deleteCrusherAdjustment(crusherId, adjustmentId) {
        return await Adjustment.findOneAndDelete({
            _id: adjustmentId,
            entity_type: 'crusher',
            entity_id: crusherId
        });
    }
}

module.exports = CrusherService;