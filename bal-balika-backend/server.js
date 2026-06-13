const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Directory to save photos
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bal-balika-shibir-2026',
  password: 'balbalika2026',
  port: 5432,
});

app.use(express.json());

app.post('/register', upload.single('photo'), async (req, res) => {
  const { name, age, gender, region, center, parent_contact, parent_email } = req.body;
  const photoPath = req.file.path;

  try {
    const query = `
      INSERT INTO public.attendees (name, age, gender, region, center, parent_contact, parent_email, photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING member_id;
    `;
    const values = [name, age, gender, region, center, parent_contact, parent_email, photoPath];
    const result = await pool.query(query, values);

    res.status(200).json({ member_id: result.rows[0].member_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insertion failed" });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
// server.js
const bcrypt = require('bcrypt');

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    // 2. Verify password hash
    const isValid = await bcrypt.compare(password, rows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    // 3. Return user info and role
    res.status(200).json({ 
      user: { id: rows[0].id, email: rows[0].email }, 
      role: rows[0].role 
    });
  } catch (err) {
    res.status(500).json({ error: "Login system failure" });
  }
});