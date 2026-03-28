const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  try {
    const user = db.prepare(`
      SELECT id, email, name, role FROM User 
      WHERE email = ? AND password = ? AND active = 1
    `).get(email, password);

    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación' });
  }
});

// GET /api/locations
router.get('/locations', (req, res) => {
  const db = getDb();
  try {
    const locs = db.prepare(`SELECT * FROM Location WHERE active = 1 ORDER BY name`).all();
    res.json(locs);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
});

module.exports = router;
