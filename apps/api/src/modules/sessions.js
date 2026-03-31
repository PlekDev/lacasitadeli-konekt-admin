const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/sessions/active - get active session for a location
router.get('/active', async (req, res) => {
  const { locationId } = req.query;

  try {
    const result = await db.query(`
      SELECT cs.*, u.name AS "cashierName", l.name AS "locationName"
      FROM "CashSession" cs
      LEFT JOIN "User" u ON cs."cashierId" = u.id
      LEFT JOIN "Location" l ON cs."locationId" = l.id
      WHERE cs."locationId" = $1 AND cs.status = 'abierta'
      ORDER BY cs."openedAt" DESC LIMIT 1
    `, [locationId]);

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

// POST /api/sessions/open - open a new cash session
router.post('/open', async (req, res) => {
  const { locationId, cashierId, openingCash } = req.body;

  try {
    // Close any existing open sessions for this location
    const now = new Date();
    await db.query(`
      UPDATE "CashSession" SET status = 'cerrada', "closedAt" = $1, "updatedAt" = $1
      WHERE "locationId" = $2 AND status = 'abierta'
    `, [now, locationId]);

    const id = uuidv4().replace(/-/g, '').substring(0, 25);
    await db.query(`
      INSERT INTO "CashSession" (id, "locationId", "cashierId", "openingCash", "openedAt", "totalSales", "totalCash", "totalCard", "totalTransfer", "totalItems", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, 0, 'abierta', $5, $5)
    `, [id, locationId, cashierId, openingCash || 0, now]);

    const result = await db.query(`
      SELECT cs.*, u.name AS "cashierName", l.name AS "locationName"
      FROM "CashSession" cs
      LEFT JOIN "User" u ON cs."cashierId" = u.id
      LEFT JOIN "Location" l ON cs."locationId" = l.id
      WHERE cs.id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
});

// POST /api/sessions/close/:id - close a cash session
router.post('/close/:id', async (req, res) => {
  const { id } = req.params;
  const { closingCash, notes } = req.body;
  const now = new Date();

  try {
    const sessionRes = await db.query(`SELECT * FROM "CashSession" WHERE id = $1`, [id]);
    const session = sessionRes.rows[0];
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const expectedCash = parseFloat(session.openingCash) + parseFloat(session.totalCash);
    const difference = (parseFloat(closingCash) || 0) - expectedCash;

    await db.query(`
      UPDATE "CashSession" SET
        status = 'cerrada', "closedAt" = $1, "closingCash" = $2,
        "expectedCash" = $3, "difference" = $4, notes = $5, "updatedAt" = $1
      WHERE id = $6
    `, [now, closingCash || 0, expectedCash, difference, notes || null, id]);

    const closedRes = await db.query(`SELECT * FROM "CashSession" WHERE id = $1`, [id]);
    res.json(closedRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
});

// GET /api/sessions/:id/summary - full session summary with sales
router.get('/:id/summary', async (req, res) => {
  const { id } = req.params;

  try {
    const sessionRes = await db.query(`
      SELECT cs.*, u.name AS "cashierName", l.name AS "locationName"
      FROM "CashSession" cs
      LEFT JOIN "User" u ON cs."cashierId" = u.id
      LEFT JOIN "Location" l ON cs."locationId" = l.id
      WHERE cs.id = $1
    `, [id]);

    const session = sessionRes.rows[0];
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const salesRes = await db.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM "SaleItem" si WHERE si."saleId" = s.id)::int AS "numProductos"
      FROM "Sale" s WHERE s."sessionId" = $1 ORDER BY s."createdAt" DESC
    `, [id]);

    const topProductsRes = await db.query(`
      SELECT p.name, SUM(si.quantity)::float AS unidades, SUM(si.subtotal)::float AS total
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      JOIN "Product" p ON si."productId" = p.id
      WHERE s."sessionId" = $1
      GROUP BY si."productId", p.name
      ORDER BY unidades DESC LIMIT 10
    `, [id]);

    res.json({ session, sales: salesRes.rows, topProducts: topProductsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
