const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// List deliveries with optional filters
router.get('/', async (req, res, next) => {
    try {
        const { clientId, crusherId, contractorId } = req.query;

        let query = db('deliveries as d')
            .leftJoin('clients as cl', 'd.client_id', 'cl.id')
            .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
            .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
            .select(
                'd.*',
                'cl.name as client_name',
                'cr.name as crusher_name',
                'ct.name as contractor_name'
            )
            .orderBy('d.created_at', 'desc');

        if (clientId) query = query.where('d.client_id', clientId);
        if (crusherId) query = query.where('d.crusher_id', crusherId);
        if (contractorId) query = query.where('d.contractor_id', contractorId);

        const rows = await query;
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Create delivery with HISTORICAL PRICE INTEGRITY
router.post('/', async (req, res, next) => {
    try {
        const {
            client_id,
            crusher_id,
            contractor_id,
            material,
            voucher,
            quantity,
            discount_volume,
            price_per_meter,
            driver_name,
            car_head,
            car_tail,
            car_volume,
            contractor_charge_per_meter
        } = req.body;

        // Validation
        if (!client_id) {
            return res.status(400).json({ message: 'client_id مطلوب' });
        }
        if (!crusher_id) {
            return res.status(400).json({ message: 'crusher_id مطلوب' });
        }
        if (!material) {
            return res.status(400).json({ message: 'نوع المادة مطلوب' });
        }
        if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
            return res.status(400).json({ message: 'الكمية غير صالحة' });
        }
        if (price_per_meter === undefined || price_per_meter === null || isNaN(price_per_meter)) {
            return res.status(400).json({ message: 'السعر غير صالح' });
        }
        if (!car_volume || isNaN(car_volume) || Number(car_volume) <= 0) {
            return res.status(400).json({ message: 'تكعيب السيارة مطلوب' });
        }

        // Validate material type (only 4 allowed)
        const allowedMaterials = ['رمل', 'سن 1', 'سن 2', 'سن 3'];
        if (!allowedMaterials.includes(material)) {
            return res.status(400).json({ message: 'نوع المادة غير صالح. المواد المسموحة: رمل، سن 1، سن 2، سن 3' });
        }

        // Validate unique voucher number if provided
        if (voucher) {
            const existingDelivery = await db('deliveries').where({ voucher }).first();
            if (existingDelivery) {
                return res.status(400).json({ message: `رقم البون ${voucher} مستخدم من قبل` });
            }
        }

        // CRITICAL: Fetch current material price from crusher (this becomes historical price)
        const crusher = await db('crushers').where('id', crusher_id).first();
        if (!crusher) {
            return res.status(400).json({ message: 'الكسارة غير موجودة' });
        }

        let materialPriceAtTime = 0;
        switch (material) {
            case 'رمل':
                materialPriceAtTime = toNumber(crusher.sand_price);
                break;
            case 'سن 1':
                materialPriceAtTime = toNumber(crusher.aggregate1_price);
                break;
            case 'سن 2':
                materialPriceAtTime = toNumber(crusher.aggregate2_price);
                break;
            case 'سن 3':
                materialPriceAtTime = toNumber(crusher.aggregate3_price);
                break;
        }

        // Validate that material has a price set
        if (materialPriceAtTime <= 0) {
            return res.status(400).json({ message: `سعر ${material} غير محدد في الكسارة ${crusher.name}` });
        }

        // Calculate quantities and costs
        const carVol = toNumber(car_volume);
        const discount = Math.max(toNumber(discount_volume), 0);
        const deliveredQuantity = toNumber(quantity); // Delivered quantity for client/contractor
        const netQuantityForClient = Math.max(deliveredQuantity - discount, 0); // Net quantity after discount for client
        const netQuantityForCrusher = Math.max(carVol - discount, 0); // Net car volume after discount for crusher
        const clientUnitPrice = toNumber(price_per_meter);
        const contractorRate = toNumber(contractor_charge_per_meter);

        // Calculate totals - CORRECTED: Crusher uses car volume, client uses delivered quantity
        const totalValueToClient = netQuantityForClient * clientUnitPrice; // Client pays for delivered quantity after discount
        const crusherTotalCost = netQuantityForCrusher * materialPriceAtTime; // Crusher cost based on car volume after discount
        const contractorTotalCharge = deliveredQuantity * contractorRate; // Contractor paid for full delivered quantity (before discount)

        // CRITICAL: Store historical price and calculated costs
        const deliveryData = {
            client_id,
            crusher_id,
            contractor_id: contractor_id || null,
            material,
            voucher: voucher || null,
            quantity: deliveredQuantity, // Original delivered quantity
            discount_volume: discount,
            net_quantity: netQuantityForClient, // Net delivered quantity after discount (for client)
            price_per_meter: clientUnitPrice,
            total_value: totalValueToClient, // Based on delivered quantity after discount
            car_volume: carVol,
            material_price_at_time: materialPriceAtTime, // HISTORICAL PRICE - NEVER CHANGES
            crusher_total_cost: crusherTotalCost, // CALCULATED FROM CAR VOLUME AFTER DISCOUNT
            contractor_charge_per_meter: contractorRate,
            contractor_total_charge: contractorTotalCharge, // Based on delivered quantity
            driver_name: driver_name || null,
            car_head: car_head || null,
            car_tail: car_tail || null
        };

        const [id] = await db('deliveries').insert(deliveryData);
        const delivery = await db('deliveries').where({ id }).first();
        
        res.status(201).json(delivery);
    } catch (err) {
        next(err);
    }
});

// Validate delivery data integrity
router.get('/validate', async (req, res, next) => {
    try {
        // Check for deliveries without material_price_at_time
        const invalidDeliveries = await db('deliveries')
            .select('id', 'material', 'crusher_id', 'material_price_at_time', 'crusher_total_cost')
            .where(function() {
                this.whereNull('material_price_at_time')
                    .orWhere('material_price_at_time', 0)
                    .orWhereNull('crusher_total_cost')
                    .orWhere('crusher_total_cost', 0);
            });

        const validationResult = {
            totalDeliveries: await db('deliveries').count('id as count').first(),
            invalidDeliveries: invalidDeliveries.length,
            isValid: invalidDeliveries.length === 0,
            invalidRecords: invalidDeliveries
        };

        res.json(validationResult);
    } catch (err) {
        next(err);
    }
});

// Delete delivery (with accounting impact warning)
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Check if delivery exists
        const delivery = await db('deliveries').where('id', id).first();
        if (!delivery) {
            return res.status(404).json({ message: 'التسليمة غير موجودة' });
        }
        
        // Delete the delivery
        await db('deliveries').where('id', id).del();
        
        res.json({ 
            message: 'تم حذف التسليمة بنجاح',
            warning: 'تم حذف التسليمة - يرجى مراجعة الحسابات المحاسبية'
        });
    } catch (err) {
        console.error('Error deleting delivery:', err);
        next(err);
    }
});

module.exports = router;
