const path = require('path');
const knex = require('knex');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * إنشاء قاعدة البيانات إذا لم تكن موجودة.
 */
async function createDatabaseIfNotExists() {
  // For SQLite, database file is created automatically
  console.log('Using SQLite database.');
}

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '..', 'database.sqlite')
  },
  useNullAsDefault: true
});

/**
 * إنشاء الجداول الأساسية تلقائياً إذا لم تكن موجودة.
 * هذا يسهل التشغيل لأول مرة بدون الحاجة لكتابة SQL يدوي.
 */
async function ensureTables() {
  await createDatabaseIfNotExists();

  // العملاء
  if (!(await db.schema.hasTable('clients'))) {
    await db.schema.createTable('clients', table => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('phone', 100);
      table.decimal('opening_balance', 12, 2).defaultTo(0);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // الكسارات
  if (!(await db.schema.hasTable('crushers'))) {
    await db.schema.createTable('crushers', table => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.decimal('sand_price', 12, 2).defaultTo(0); // سعر الرمل
      table.decimal('aggregate1_price', 12, 2).defaultTo(0); // سعر سن 1
      table.decimal('aggregate2_price', 12, 2).defaultTo(0); // سعر سن 2
      table.decimal('aggregate3_price', 12, 2).defaultTo(0); // سعر سن 3
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  } else {
    // For SQLite, check if columns exist differently
    try {
      const tableInfo = await db.raw("PRAGMA table_info(crushers)");
      const existingColumns = tableInfo.map(col => col.name);
      
      if (!existingColumns.includes('sand_price')) {
        await db.schema.alterTable('crushers', table => {
          table.decimal('sand_price', 12, 2).defaultTo(0);
          table.decimal('aggregate1_price', 12, 2).defaultTo(0);
          table.decimal('aggregate2_price', 12, 2).defaultTo(0);
          table.decimal('aggregate3_price', 12, 2).defaultTo(0);
        });
      }
    } catch (error) {
      // If table doesn't exist or other error, columns will be added when table is created
      console.log('Note: Could not check crusher columns, they will be added if needed');
    }
  }

  // مقاولين العجل
  if (!(await db.schema.hasTable('contractors'))) {
    await db.schema.createTable('contractors', table => {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
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
      table.string('voucher', 120).unique();
      table.decimal('quantity', 12, 3).defaultTo(0); // كمية الحمولة (م³)
      table.decimal('discount_volume', 12, 3).defaultTo(0); // قيمة الخصم (م³)
      table.decimal('net_quantity', 12, 3).defaultTo(0); // الكمية الصافية بعد الخصم
      table.decimal('price_per_meter', 12, 2).defaultTo(0); // سعر المتر للعميل
      table.decimal('total_value', 12, 2).defaultTo(0); // إجمالي قيمة التسليم للعميل
      table.decimal('material_price_at_time', 12, 2).notNullable(); // سعر المادة من الكسارة وقت التسليم (CRITICAL)
      table.decimal('crusher_total_cost', 12, 2).defaultTo(0); // إجمالي تكلفة الكسارة
      table.string('driver_name', 120);
      table.string('car_head', 60);
      table.string('car_tail', 60);
      table.decimal('car_volume', 12, 3); // تكعيب السيارة (م³)
      table.decimal('contractor_charge_per_meter', 12, 2).defaultTo(0); // مستحق للمقاول لكل م³
      table.decimal('contractor_total_charge', 12, 2).defaultTo(0); // إجمالي مستحق المقاول (محسوب)
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  } else {
    // For SQLite, check if columns exist differently
    try {
      const tableInfo = await db.raw("PRAGMA table_info(deliveries)");
      const existingColumns = tableInfo.map(col => col.name);
      
      if (!existingColumns.includes('material_price_at_time')) {
        await db.schema.alterTable('deliveries', table => {
          table.decimal('material_price_at_time', 12, 2).defaultTo(0);
          table.decimal('crusher_total_cost', 12, 2).defaultTo(0);
          table.decimal('contractor_charge_per_meter', 12, 2).defaultTo(0);
          table.decimal('contractor_total_charge', 12, 2).defaultTo(0);
        });
      }
    } catch (error) {
      // If table doesn't exist or other error, columns will be added when table is created
      console.log('Note: Could not check delivery columns, they will be added if needed');
    }
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
      table.string('method', 50);
      table.string('details', 255);
      table.text('note');
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
      table.string('method', 50);
      table.string('details', 255);
      table.text('note');
      table.timestamp('paid_at').defaultTo(db.fn.now());
    });
  }

  // مدفوعات الكسارات
  if (!(await db.schema.hasTable('crusher_payments'))) {
    await db.schema.createTable('crusher_payments', table => {
      table.increments('id').primary();
      table
        .integer('crusher_id')
        .unsigned()
        .references('id')
        .inTable('crushers')
        .onDelete('CASCADE');
      table.decimal('amount', 12, 2).notNullable();
      table.string('payment_method', 50);
      table.string('details', 255);
      table.text('note');
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
      table.string('method', 50);
      table.string('details', 255);
      table.text('reason');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['entity_type', 'entity_id']);
    });
  }

  // المصروفات
  if (!(await db.schema.hasTable('expenses'))) {
    await db.schema.createTable('expenses', table => {
      table.increments('id').primary();
      table.date('expense_date').notNullable();
      table.string('category', 50).notNullable();
      table.string('description', 255).notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.text('notes');
      table.string('method', 50);
      table.string('details', 255);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
      table.index(['expense_date']);
      table.index(['category']);
    });
  }
}

db.ensureTables = ensureTables;

module.exports = db;
