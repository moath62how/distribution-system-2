const db = require('../db');

const toNumber = (v) => Number(v || 0);

// Helper functions
async function getClient(id) {
    return db('clients').where({ id }).first();
}

function formatCurrency(n) {
    if (n == null) return null;
    return n.toLocaleString('ar-EG') + ' ج.م';
}

async function computeClientTotals(clientId) {
    const [{ sum: deliveriesSum }] = await db('deliveries')
        .where({ client_id: clientId })
        .sum({ sum: 'total_value' });

    const [{ sum: paymentsSum }] = await db('payments')
        .where({ client_id: clientId })
        .sum({ sum: 'amount' });

    const [{ sum: adjustmentsSum }] = await db('adjustments')
        .where({ entity_type: 'client', entity_id: clientId })
        .sum({ sum: 'amount' });

    const client = await getClient(clientId);
    const opening = client ? toNumber(client.opening_balance) : 0;

    const totalDeliveries = toNumber(deliveriesSum);
    const totalPayments = toNumber(paymentsSum);
    const totalAdjustments = toNumber(adjustmentsSum);

    return {
        openingBalance: opening,
        totalDeliveries,
        totalPayments,
        totalAdjustments,
        balance: opening + totalDeliveries + totalAdjustments - totalPayments
    };
}

module.exports = {
    // Dashboard
    async dashboard(req, res, next) {
        try {
            const [{ count: clientsCount }] = await db('clients').count({ count: 'id' });
            const [{ count: crushersCount }] = await db('crushers').count({ count: 'id' });
            const [{ count: contractorsCount }] = await db('contractors').count({ count: 'id' });
            const [{ count: deliveriesCount }] = await db('deliveries').count({ count: 'id' });
            const [{ sum: totalSales }] = await db('deliveries').sum({ sum: 'total_value' });
            const [{ sum: totalPayments }] = await db('payments').sum({ sum: 'amount' });

            const sales = Number(totalSales || 0);
            const paid = Number(totalPayments || 0);
            const netProfit = sales - paid;

            res.render('dashboard', {
                title: 'لوحة التحكم',
                activePage: 'dashboard',
                metrics: {
                    totalClients: Number(clientsCount || 0),
                    totalCrushers: Number(crushersCount || 0),
                    totalContractors: Number(contractorsCount || 0),
                    totalDeliveries: Number(deliveriesCount || 0),
                    totalSales: formatCurrency(sales),
                    netProfit: formatCurrency(netProfit)
                }
            });
        } catch (err) {
            next(err);
        }
    },

    // Clients list
    async clientsIndex(req, res, next) {
        try {
            const clients = await db('clients')
                .select('id', 'name', 'phone', 'opening_balance')
                .orderBy('id', 'desc');

            const enriched = await Promise.all(
                clients.map(async (client) => {
                    const totals = await computeClientTotals(client.id);
                    return { ...client, ...totals };
                })
            );

            res.render('clients/index', {
                title: 'العملاء',
                clients: enriched,
                activePage: 'clients'
            });
        } catch (err) {
            next(err);
        }
    },

    // Client details
    async clientDetails(req, res, next) {
        try {
            const { id } = req.params;
            const client = await getClient(id);

            if (!client) {
                return res.status(404).render('error', {
                    title: 'خطأ',
                    message: 'العميل غير موجود'
                });
            }

            const totals = await computeClientTotals(id);
            const deliveries = await db('deliveries as d')
                .leftJoin('crushers as c', 'd.crusher_id', 'c.id')
                .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
                .select(
                    'd.*',
                    'c.name as crusher_name',
                    'ct.name as contractor_name'
                )
                .where('d.client_id', id)
                .orderBy('d.created_at', 'desc');
            // Ensure total_value is computed from price_per_meter * quantity (ignore discount)
            deliveries.forEach(d => {
                const price = Number(d.price_per_meter || 0);
                const qty = Number(d.quantity || 0);
                d.total_value = price * qty;
            });
            const payments = await db('payments')
                .where({ client_id: id })
                .orderBy('paid_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'client', entity_id: id })
                .orderBy('created_at', 'desc');
            console.log(totals);

            res.render('clients/details', {
                title: `تفاصيل العميل - ${client.name}`,
                client,
                totals,
                deliveries,
                payments,
                adjustments,
                activePage: 'clients'
            });
        } catch (err) {
            next(err);
        }
    },

    // Create client
    async createClient(req, res, next) {
        try {
            const { name, phone, opening_balance } = req.body;

            if (!name || !name.trim()) {
                req.flash('error', 'الاسم مطلوب');
                return res.redirect('/clients');
            }

            await db('clients').insert({
                name: name.trim(),
                phone: phone || null,
                opening_balance: toNumber(opening_balance)
            });

            req.flash('success', 'تم إضافة العميل بنجاح');
            res.redirect('/clients');
        } catch (err) {
            next(err);
        }
    },

    // Add client payment
    async addClientPayment(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, note, paid_at } = req.body;

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                req.flash('error', 'المبلغ غير صالح');
                return res.redirect(`/clients/${id}`);
            }

            await db('payments').insert({
                client_id: id,
                amount: toNumber(amount),
                note: note || null,
                paid_at: paid_at || db.fn.now()
            });

            req.flash('success', 'تم إضافة الدفعة بنجاح');
            res.redirect(`/clients/${id}`);
        } catch (err) {
            next(err);
        }
    },

    // Add client adjustment
    async addClientAdjustment(req, res, next) {
        try {
            const { id } = req.params;
            const { amount, reason } = req.body;

            if (!amount || isNaN(amount) || Number(amount) === 0) {
                req.flash('error', 'القيمة غير صالحة');
                return res.redirect(`/clients/${id}`);
            }

            await db('adjustments').insert({
                entity_type: 'client',
                entity_id: id,
                amount: toNumber(amount),
                reason: reason || null,
                created_at: db.fn.now()
            });

            req.flash('success', 'تم إضافة التسوية بنجاح');
            res.redirect(`/clients/${id}`);
        } catch (err) {
            next(err);
        }
    },

    // New delivery form
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

    // Create delivery
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
    },

    // Crushers list
    async crushersIndex(req, res, next) {
        try {
            const crushers = await db('crushers')
                .leftJoin('deliveries', 'crushers.id', 'deliveries.crusher_id')
                .select('crushers.id', 'crushers.name')
                .sum('deliveries.quantity as totalVolume')
                .sum('deliveries.total_value as totalValue')
                .groupBy('crushers.id');

            res.render('crushers/index', { crushers });
        } catch (err) {
            next(err);
        }
    },

    // Crusher details
    async crusherDetails(req, res, next) {
        const crusherId = req.params.id;
        try {
            const crusher = await db('crushers').where('id', crusherId).first();
            if (!crusher) return res.status(404).send('الكسارة غير موجودة');

            const deliveries = await db('deliveries')
                .where('crusher_id', crusherId)
                .orderBy('created_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'crusher', entity_id: crusherId })
                .orderBy('created_at', 'desc');

            const totalVolume = deliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
            const totalValue = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);

            res.render('crushers/details', {
                title: `تفاصيل الكسارة: ${crusher.name}`,
                crusher,
                deliveries,
                adjustments,
                totals: { totalVolume, totalValue, totalAdjustments, deliveriesCount: deliveries.length }
            });
        } catch (err) {
            next(err);
        }
    },

    // Contractors list
    async contractorsIndex(req, res, next) {
        try {
            const contractors = await db('contractors').select('*');

            const contractorsWithTotals = await Promise.all(
                contractors.map(async c => {
                    const totalTrips = await db('deliveries')
                        .where('contractor_id', c.id)
                        .sum('contractor_charge as total')
                        .first();
                    const totalPayments = await db('contractor_payments')
                        .where('contractor_id', c.id)
                        .sum('amount as total')
                        .first();
                    const totalAdjustments = await db('adjustments')
                        .where({ entity_type: 'contractor', entity_id: c.id })
                        .sum('amount as total')
                        .first();

                    const balance = Number(c.opening_balance || 0)
                        + Number(totalTrips.total || 0)
                        - Number(totalPayments.total || 0)
                        + Number(totalAdjustments.total || 0);

                    return {
                        ...c,
                        totalTrips: totalTrips.total || 0,
                        totalPayments: totalPayments.total || 0,
                        totalAdjustments: totalAdjustments.total || 0,
                        balance
                    };
                })
            );

            res.render('contractors/index', { contractors: contractorsWithTotals });
        } catch (err) {
            next(err);
        }
    },

    // Contractor details
    async contractorDetails(req, res, next) {
        const contractorId = req.params.id;
        try {
            const contractor = await db('contractors').where('id', contractorId).first();
            if (!contractor) return res.status(404).send('المقاول غير موجود');

            const deliveries = await db('deliveries')
                .where('contractor_id', contractorId)
                .leftJoin('clients', 'deliveries.client_id', 'clients.id')
                .leftJoin('crushers', 'deliveries.crusher_id', 'crushers.id')
                .select(
                    'deliveries.*',
                    'clients.name as client_name',
                    'crushers.name as crusher_name'
                )
                .orderBy('deliveries.created_at', 'desc');

            const payments = await db('contractor_payments')
                .where({ contractor_id: contractorId })
                .orderBy('paid_at', 'desc');

            const adjustments = await db('adjustments')
                .where({ entity_type: 'contractor', entity_id: contractorId })
                .orderBy('created_at', 'desc');

            const totalTrips = deliveries.reduce((sum, d) => sum + Number(d.contractor_charge || 0), 0);
            const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const balance = Number(contractor.opening_balance || 0) + totalTrips - totalPayments + totalAdjustments;

            const totals = {
                openingBalance: Number(contractor.opening_balance || 0),
                totalTrips,
                totalPayments,
                totalAdjustments,
                balance
            };

            res.render('contractors/details', { contractor, deliveries, payments, adjustments, totals });
        } catch (err) {
            next(err);
        }
    }
};
