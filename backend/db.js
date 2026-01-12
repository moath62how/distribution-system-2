const path = require('path');
const knex = require('knex');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * اتصال موحد بقاعدة البيانات باستخدام knex.
 * الإعدادات تعتمد على متغيرات البيئة لضبط السيرفر بسهولة.
 */
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '123456',
    database: process.env.DB_NAME || 'al7aweri',
    charset: 'utf8mb4'
  },
  pool: { min: 0, max: 10 }
});

/**
 * إنشاء الجداول الأساسية تلقائياً إذا لم تكن موجودة.
 * هذا يسهل التشغيل لأول مرة بدون الحاجة لكتابة SQL يدوي.
 */
async function ensureTables() {
  // العملاء
  if (!(await db.schema.hasTable('clients'))) {
    await db.schema.createTable('clients', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('phone', 100);
      table.decimal('opening_balance', 12, 2).defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // الكسارات
  if (!(await db.schema.hasTable('crushers'))) {
    await db.schema.createTable('crushers', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // مقاولين العجل
  if (!(await db.schema.hasTable('contractors'))) {
    await db.schema.createTable('contractors', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.decimal('opening_balance', 12, 2).defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // التسليمات
  if (!(await db.schema.hasTable('deliveries'))) {
    await db.schema.createTable('deliveries', table => {
      table.increments('id').primary();
      table
        .integer('client_id')
        .unsigned()
        .references('id')
        .inTable('clients')
        .onDelete('CASCADE');
      table
        .integer('crusher_id')
        .unsigned()
        .references('id')
        .inTable('crushers')
        .onDelete('SET NULL');
      table
        .integer('contractor_id')
        .unsigned()
        .references('id')
        .inTable('contractors')
        .onDelete('SET NULL');
      table.string('material', 120);
      table.string('voucher', 120);
      table.decimal('quantity', 12, 3).defaultTo(0); // الكمية الأصلية
      table.decimal('discount_volume', 12, 3).defaultTo(0); // خصم تكعيب
      table.decimal('net_quantity', 12, 3).defaultTo(0); // بعد الخصم
      table.decimal('price_per_meter', 12, 2).defaultTo(0);
      table.decimal('total_value', 12, 2).defaultTo(0);
      table.string('driver_name', 120);
      table.string('car_head', 60);
      table.string('car_tail', 60);
      table.decimal('car_volume', 12, 3);
      table.decimal('contractor_charge', 12, 2).defaultTo(0); // مستحق للمقاول عن المشوار
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // مدفوعات العملاء
  if (!(await db.schema.hasTable('payments'))) {
    await db.schema.createTable('payments', table => {
      table.increments('id').primary();
      table
        .integer('client_id')
        .unsigned()
        .references('id')
        .inTable('clients')
        .onDelete('CASCADE');
      table.decimal('amount', 12, 2).notNullable();
      table.string('note', 255);
      table.timestamp('paid_at').defaultTo(db.fn.now());
    });
  }

  // مدفوعات/عُهد المقاولين
  if (!(await db.schema.hasTable('contractor_payments'))) {
    await db.schema.createTable('contractor_payments', table => {
      table.increments('id').primary();
      table
        .integer('contractor_id')
        .unsigned()
        .references('id')
        .inTable('contractors')
        .onDelete('CASCADE');
      table.decimal('amount', 12, 2).notNullable();
      table.string('note', 255);
      table.timestamp('paid_at').defaultTo(db.fn.now());
    });
  }

  // تسويات/مستحقات إضافية
  if (!(await db.schema.hasTable('adjustments'))) {
    await db.schema.createTable('adjustments', table => {
      table.increments('id').primary();
      table.string('entity_type', 20).notNullable(); // client | crusher | contractor
      table
        .integer('entity_id')
        .unsigned()
        .notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('reason', 255);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['entity_type', 'entity_id']);
    });
  }
}

db.ensureTables = ensureTables;

module.exports = db;
