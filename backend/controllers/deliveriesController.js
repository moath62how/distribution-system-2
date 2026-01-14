const db = require('../db');
const { toNumber } = require('./utils');

module.exports = {
    async newDeliveryForm(req, res, next) {
        try {
            const clients = await db('clients').select('id', 'name').orderBy('name');
            const crushers = await db('crushers').select('id', 'name').orderBy('name');
            const contractors = await db('contractors').select('id', 'name').orderBy('name');

            res.render('deliveries/new', {
                title: 'إدخال تسليم جديد',
                clients,
                crushers,
                contractors,
                activePage: 'deliveries'
            });
        } catch (err) {
            next(err);
        }
    },

    async createDelivery(req, res, next) {
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
                contractor_charge
            } = req.body;

            if (!client_id) {
                req.flash('error', 'العميل مطلوب');
                return res.redirect('/deliveries/new');
            }

            if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
                req.flash('error', 'الكمية غير صالحة');
                return res.redirect('/deliveries/new');
            }

            if (price_per_meter === undefined || price_per_meter === null || isNaN(price_per_meter)) {
                req.flash('error', 'السعر غير صالح');
                return res.redirect('/deliveries/new');
            }

            const grossQty = toNumber(quantity);
            const discount = Math.max(toNumber(discount_volume), 0);
            const netQty = Math.max(grossQty - discount, 0);
            const unitPrice = toNumber(price_per_meter);
            const totalValue = netQty * unitPrice;

            const [id] = await db('deliveries').insert({
                client_id,
                crusher_id: crusher_id || null,
                contractor_id: contractor_id || null,
                material: material || null,
                voucher: voucher || null,
                quantity: grossQty,
                discount_volume: discount,
                net_quantity: netQty,
                price_per_meter: unitPrice,
                total_value: totalValue,
                driver_name: driver_name || null,
                car_head: car_head || null,
                car_tail: car_tail || null,
                car_volume: car_volume ? toNumber(car_volume) : null,
                contractor_charge: contractor_charge ? toNumber(contractor_charge) : 0,
                created_at: db.fn.now()
            });

            req.flash('success', 'تم إضافة التسليم بنجاح');
            return res.redirect(`/clients/${client_id}`);
        } catch (err) {
            next(err);
        }
    }
};
