const express = require('express');
const db = require('../db');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(`
      SELECT id, email, name, role FROM "User"
      WHERE email = $1 AND password = $2 AND active = true
    `, [email, password]);

    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de autenticación' });
  }
});

// GET /api/locations
router.get('/locations', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM "Location" WHERE active = true ORDER BY name`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
});

module.exports = router;
