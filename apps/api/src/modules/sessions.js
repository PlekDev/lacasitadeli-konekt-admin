const express = require('express');
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/sessions/active - get active session for a location
router.get('/active', (req, res) => {
  const db = getDb();
  const { locationId } = req.query;

  try {
    const session = db.prepare(`
      SELECT cs.*, u.name AS cashierName, l.name AS locationName
      FROM CashSession cs
      LEFT JOIN User u ON cs.cashierId = u.id
      LEFT JOIN Location l ON cs.locationId = l.id
      WHERE cs.locationId = ? AND cs.status = 'abierta'
      ORDER BY cs.openedAt DESC LIMIT 1
    `).get(locationId);

    res.json(session || null);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// POST /api/sessions/open - open a new cash session
router.post('/open', (req, res) => {
  const db = getDb();
  const { locationId, cashierId, openingCash } = req.body;

  try {
    // Close any existing open sessions for this location
    const now = Date.now();
    db.prepare(`
      UPDATE CashSession SET status = 'cerrada', closedAt = ?, updatedAt = ?
      WHERE locationId = ? AND status = 'abierta'
    `).run(now, now, locationId);

    const id = uuidv4().replace(/-/g, '').substring(0, 25);
    db.prepare(`
      INSERT INTO CashSession (id, locationId, cashierId, openingCash, openedAt, totalSales, totalCash, totalCard, totalTransfer, totalItems, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'abierta', ?, ?)
    `).run(id, locationId, cashierId, openingCash || 0, now, now, now);

    const session = db.prepare(`
      SELECT cs.*, u.name AS cashierName, l.name AS locationName
      FROM CashSession cs
      LEFT JOIN User u ON cs.cashierId = u.id
      LEFT JOIN Location l ON cs.locationId = l.id
      WHERE cs.id = ?
    `).get(id);

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// POST /api/sessions/close/:id - close a cash session
router.post('/close/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { closingCash, notes } = req.body;
  const now = Date.now();

  try {
    const session = db.prepare(`SELECT * FROM CashSession WHERE id = ?`).get(id);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const expectedCash = session.openingCash + session.totalCash;
    const difference = (closingCash || 0) - expectedCash;

    db.prepare(`
      UPDATE CashSession SET 
        status = 'cerrada', closedAt = ?, closingCash = ?, 
        expectedCash = ?, difference = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(now, closingCash || 0, expectedCash, difference, notes || null, now, id);

    const closed = db.prepare(`SELECT * FROM CashSession WHERE id = ?`).get(id);
    res.json(closed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// GET /api/sessions/:id/summary - full session summary with sales
router.get('/:id/summary', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const session = db.prepare(`
      SELECT cs.*, u.name AS cashierName, l.name AS locationName
      FROM CashSession cs
      LEFT JOIN User u ON cs.cashierId = u.id
      LEFT JOIN Location l ON cs.locationId = l.id
      WHERE cs.id = ?
    `).get(id);

    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const sales = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM SaleItem si WHERE si.saleId = s.id) AS numProductos
      FROM Sale s WHERE s.sessionId = ? ORDER BY s.createdAt DESC
    `).all(id);

    const topProducts = db.prepare(`
      SELECT p.name, SUM(si.quantity) AS unidades, SUM(si.subtotal) AS total
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      JOIN Product p ON si.productId = p.id
      WHERE s.sessionId = ?
      GROUP BY si.productId
      ORDER BY unidades DESC LIMIT 10
    `).all(id);

    res.json({ session, sales, topProducts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
