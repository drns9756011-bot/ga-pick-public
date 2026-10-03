const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../functions/api/[[path]].js'), 'utf8');
const migrationCode = source.slice(source.indexOf('async function ensureColumns('), source.indexOf('async function createUniqueQuoteNumber('));
const context = vm.createContext({});
vm.runInContext(migrationCode, context);

test('existing schemas use one check per table and no ALTER statements', async () => {
  const db = new DatabaseSync(':memory:');
  const statements = [];
  try {
    db.exec(`CREATE TABLE customer_quotes (id TEXT PRIMARY KEY);
      CREATE TABLE quote_images (id TEXT PRIMARY KEY);
      CREATE TABLE seller_applications (id TEXT PRIMARY KEY);
      CREATE TABLE approved_sellers (id TEXT PRIMARY KEY);`);
    const env = { DB: { prepare(sql) {
      statements.push(sql);
      return {
        all: async () => ({ results: db.prepare(sql).all() }),
        run: async () => db.prepare(sql).run(),
      };
    } } };
    await context.ensureCustomerQuoteColumns(env);
    await context.ensureSellerColumns(env);
    assert.equal(db.prepare('PRAGMA table_info(customer_quotes)').all().some((row) => row.name === 'quote_expires_at'), true);
    assert.equal(db.prepare('PRAGMA table_info(approved_sellers)').all().some((row) => row.name === 'quote_alimtalk_opt_out'), true);
    statements.length = 0;
    await context.ensureCustomerQuoteColumns(env);
    await context.ensureSellerColumns(env);
    assert.equal(statements.filter((sql) => sql.startsWith('ALTER TABLE')).length, 0);
    assert.equal(statements.filter((sql) => sql.startsWith('PRAGMA table_info')).length, 4);
  } finally { db.close(); }
});
