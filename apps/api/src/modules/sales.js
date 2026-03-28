const express = require('express');
const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// POST /api/sales - create a new sale
router.post('/', (req, res) => {
  const db = getDb();
  const { locationId, cashierId, sessionId, items, paymentMethod, cashReceived, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  // Calculate totals
  let subtotal = 0;
  items.forEach(item => { subtotal += item.unitPrice * item.quantity; });
  const total = subtotal;
  const change = paymentMethod === 'efectivo' && cashReceived ? cashReceived - total : null;

  // Get next invoice number
  const lastSale = db.prepare(`
    SELECT invoiceNumber FROM Sale 
    WHERE locationId = ? 
    ORDER BY createdAt DESC LIMIT 1
  `).get(locationId);

  let nextNum = 1;
  if (lastSale) {
    const match = lastSale.invoiceNumber.match(/\d+/);
    if (match) nextNum = parseInt(match[0]) + 1;
  }
  const invoiceNumber = `F${String(nextNum).padStart(4, '0')}`;

  const saleId = uuidv4().replace(/-/g, '').substring(0, 25);
  const now = Date.now();

  const insertSale = db.transaction(() => {
    // Insert sale
    db.prepare(`
      INSERT INTO Sale (id, invoiceNumber, locationId, cashierId, sessionId, subtotal, tax, discount, total, paymentMethod, cashReceived, change, status, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'completada', ?, ?, ?)
    `).run(saleId, invoiceNumber, locationId, cashierId, sessionId || null, subtotal, total, paymentMethod, cashReceived || null, change, notes || null, now, now);

    // Insert items and update inventory
    items.forEach(item => {
      const itemId = uuidv4().replace(/-/g, '').substring(0, 25);
      const subtotalItem = item.unitPrice * item.quantity;

      db.prepare(`
        INSERT INTO SaleItem (id, saleId, productId, quantity, unitPrice, costPrice, discount, subtotal, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(itemId, saleId, item.productId, item.quantity, item.unitPrice, item.costPrice || 0, subtotalItem, now);

      // Decrease inventory at the sale location
      const inv = db.prepare(`
        SELECT id, quantity FROM Inventory WHERE productId = ? AND locationId = ?
      `).get(item.productId, locationId);

      if (inv) {
        db.prepare(`
          UPDATE Inventory SET quantity = MAX(0, quantity - ?), updatedAt = ? WHERE id = ?
        `).run(item.quantity, now, inv.id);
      }
    });

    // Update cash session totals if session exists
    if (sessionId) {
      const amountByMethod = {
        efectivo: paymentMethod === 'efectivo' ? total : 0,
        tarjeta: paymentMethod === 'tarjeta' ? total : 0,
        transferencia: paymentMethod === 'transferencia' ? total : 0,
      };
      db.prepare(`
        UPDATE CashSession SET 
          totalSales = totalSales + ?,
          totalCash = totalCash + ?,
          totalCard = totalCard + ?,
          totalTransfer = totalTransfer + ?,
          totalItems = totalItems + ?,
          updatedAt = ?
        WHERE id = ?
      `).run(total, amountByMethod.efectivo, amountByMethod.tarjeta, amountByMethod.transferencia, items.reduce((a, b) => a + b.quantity, 0), now, sessionId);
    }

    return { saleId, invoiceNumber, total, change };
  });

  try {
    const result = insertSale();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la venta' });
  }
});

// GET /api/sales/session/:sessionId - get sales for a session
router.get('/session/:sessionId', (req, res) => {
  const db = getDb();
  const { sessionId } = req.params;

  try {
    const sales = db.prepare(`
      SELECT s.*, u.name AS cashierName
      FROM Sale s
      LEFT JOIN User u ON s.cashierId = u.id
      WHERE s.sessionId = ?
      ORDER BY s.createdAt DESC
    `).all(sessionId);

    // Get items for each sale
    const salesWithItems = sales.map(sale => {
      const items = db.prepare(`
        SELECT si.*, p.name AS productName, p.unit
        FROM SaleItem si
        LEFT JOIN Product p ON si.productId = p.id
        WHERE si.saleId = ?
      `).all(sale.id);
      return { ...sale, items };
    });

    res.json(salesWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/sales/report - daily sales report
router.get('/report', (req, res) => {
  const db = getDb();
  const { date, locationId } = req.query;

  // Build date range
  let startTs, endTs;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    startTs = d.getTime();
    endTs = startTs + 86400000;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startTs = today.getTime();
    endTs = startTs + 86400000;
  }

  try {
    let where = `WHERE s.createdAt >= ? AND s.createdAt < ? AND s.status = 'completada'`;
    const params = [startTs, endTs];

    if (locationId) {
      where += ` AND s.locationId = ?`;
      params.push(locationId);
    }

    const summary = db.prepare(`
      SELECT 
        COUNT(*) AS totalVentas,
        SUM(s.total) AS totalIngresos,
        SUM(s.total - COALESCE((SELECT SUM(si2.costPrice * si2.quantity) FROM SaleItem si2 WHERE si2.saleId = s.id), 0)) AS gananciaEstimada,
        AVG(s.total) AS ticketPromedio,
        SUM(CASE WHEN s.paymentMethod = 'efectivo' THEN s.total ELSE 0 END) AS totalEfectivo,
        SUM(CASE WHEN s.paymentMethod = 'tarjeta' THEN s.total ELSE 0 END) AS totalTarjeta,
        SUM(CASE WHEN s.paymentMethod = 'transferencia' THEN s.total ELSE 0 END) AS totalTransferencia
      FROM Sale s ${where}
    `).get(...params);

    // Top products
    const topProducts = db.prepare(`
      SELECT p.name, p.unit, SUM(si.quantity) AS unidadesVendidas, SUM(si.subtotal) AS ingresos
      FROM SaleItem si
      JOIN Sale s ON si.saleId = s.id
      JOIN Product p ON si.productId = p.id
      ${where.replace('s.', 's.')}
      GROUP BY si.productId
      ORDER BY unidadesVendidas DESC
      LIMIT 10
    `).all(...params);

    // Sale detail
    const ventas = db.prepare(`
      SELECT s.id, s.invoiceNumber, s.total, s.paymentMethod, s.createdAt,
             u.name AS cajero,
             (SELECT COUNT(*) FROM SaleItem si WHERE si.saleId = s.id) AS numProductos
      FROM Sale s
      LEFT JOIN User u ON s.cashierId = u.id
      ${where}
      ORDER BY s.createdAt DESC
    `).all(...params);

    res.json({ summary, topProducts, ventas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

module.exports = router;
