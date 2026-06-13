const { Pool } = require('pg');

// Use environment variables for security (NEVER hardcode passwords)
const pool = new Pool({
  user: 'postgres',         // Default user
  host: 'localhost',
  database: 'bal-balika-shibir-2026', // The DB you created in pgAdmin
  password: process.env.DATABASE_PASSWORD,  // Use the one you set during installation
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};