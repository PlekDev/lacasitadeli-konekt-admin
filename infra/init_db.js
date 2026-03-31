const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/api/.env') });

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) {
    console.error('DATABASE_URL not found in apps/api/.env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const sqlFile = process.argv[2] || 'init_db.sql';
    const sqlPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, sqlFile);

    console.log(`Executing SQL from ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('SQL executed successfully');

  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

main();
