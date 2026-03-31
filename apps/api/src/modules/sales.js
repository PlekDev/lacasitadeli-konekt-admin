const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// POST /api/sales - create a new sale
router.post('/', async (req, res) => {
  const { locationId, cashierId, sessionId, items, paymentMethod, cashReceived, notes } = req.body;

  const finalLocationId = locationId || 'loc1';
  const finalCashierId = cashierId || 'user1';

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
  }

  // Calculate totals
  let subtotal = 0;
  items.forEach(item => { subtotal += item.unitPrice * item.quantity; });
  const total = subtotal;
  const change = paymentMethod === 'efectivo' && cashReceived ? cashReceived - total : null;

  const client = await db.getPool().connect();

  try {
    await client.query('BEGIN');

    // Get next invoice number
    const lastSaleRes = await client.query(`
      SELECT "invoiceNumber" FROM "Sale"
      WHERE "locationId" = $1
      ORDER BY "createdAt" DESC LIMIT 1
    `, [finalLocationId]);

    const lastSale = lastSaleRes.rows[0];
    let nextNum = 1;
    if (lastSale) {
      const match = lastSale.invoiceNumber.match(/\d+/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const invoiceNumber = `F${String(nextNum).padStart(4, '0')}`;

    const saleId = uuidv4().replace(/-/g, '').substring(0, 25);
    const now = new Date();

    // Insert sale
    await client.query(`
      INSERT INTO "Sale" ("id", "invoiceNumber", "locationId", "cashierId", "sessionId", "subtotal", "tax", "discount", "total", "paymentMethod", "cashReceived", "change", "status", "notes", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7, $8, $9, $10, 'completada', $11, $12, $12)
    `, [saleId, invoiceNumber, finalLocationId, finalCashierId, sessionId || null, subtotal, total, paymentMethod, cashReceived || null, change, notes || null, now]);

    // Insert items and update inventory
    for (const item of items) {
      const itemId = uuidv4().replace(/-/g, '').substring(0, 25);
      const subtotalItem = item.unitPrice * item.quantity;

      await client.query(`
        INSERT INTO "SaleItem" ("id", "saleId", "productId", "quantity", "unitPrice", "costPrice", "discount", "subtotal", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)
      `, [itemId, saleId, item.productId, item.quantity, item.unitPrice, item.costPrice || 0, subtotalItem, now]);

      // Decrease inventory at the sale location
      const invRes = await client.query(`
        SELECT "id", "quantity" FROM "Inventory" WHERE "productId" = $1 AND "locationId" = $2
      `, [item.productId, finalLocationId]);

      const inv = invRes.rows[0];
      if (inv) {
        await client.query(`
          UPDATE "Inventory" SET "quantity" = GREATEST(0, "quantity" - $1), "updatedAt" = $2 WHERE "id" = $3
        `, [item.quantity, now, inv.id]);
      }
    }

    // Update cash session totals if session exists
    if (sessionId) {
      const amountByMethod = {
        efectivo: paymentMethod === 'efectivo' ? total : 0,
        tarjeta: paymentMethod === 'tarjeta' ? total : 0,
        transferencia: paymentMethod === 'transferencia' ? total : 0,
      };
      await client.query(`
        UPDATE "CashSession" SET
          "totalSales" = "totalSales" + $1,
          "totalCash" = "totalCash" + $2,
          "totalCard" = "totalCard" + $3,
          "totalTransfer" = "totalTransfer" + $4,
          "totalItems" = "totalItems" + $5,
          "updatedAt" = $6
        WHERE "id" = $7
      `, [total, amountByMethod.efectivo, amountByMethod.tarjeta, amountByMethod.transferencia, items.reduce((a, b) => a + b.quantity, 0), now, sessionId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, saleId, invoiceNumber, total, change });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la venta' });
  } finally {
    client.release();
  }
});

// GET /api/sales/report - daily sales report
router.get('/report', async (req, res) => {
  const { date, locationId } = req.query;

  // Build date range
  let startTs, endTs;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    startTs = d.toISOString();
    const dend = new Date(d);
    dend.setHours(23, 59, 59, 999);
    endTs = dend.toISOString();
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startTs = today.toISOString();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    endTs = todayEnd.toISOString();
  }

  try {
    let where = `WHERE s."createdAt" >= $1 AND s."createdAt" <= $2 AND s."status" = 'completada'`;
    const params = [startTs, endTs];

    if (locationId) {
      where += ` AND s."locationId" = $3`;
      params.push(locationId);
    }

    const summaryRes = await db.query(`
      SELECT 
        COUNT(*)::int AS "totalVentas",
        COALESCE(SUM(s."total"), 0)::float AS "totalIngresos",
        COALESCE(SUM(s."total" - COALESCE((SELECT SUM(si2."costPrice" * si2."quantity") FROM "SaleItem" si2 WHERE si2."saleId" = s."id"), 0)), 0)::float AS "gananciaEstimada",
        COALESCE(AVG(s."total"), 0)::float AS "ticketPromedio",
        COALESCE(SUM(CASE WHEN s."paymentMethod" = 'efectivo' THEN s."total" ELSE 0 END), 0)::float AS "totalEfectivo",
        COALESCE(SUM(CASE WHEN s."paymentMethod" = 'tarjeta' THEN s."total" ELSE 0 END), 0)::float AS "totalTarjeta",
        COALESCE(SUM(CASE WHEN s."paymentMethod" = 'transferencia' THEN s."total" ELSE 0 END), 0)::float AS "totalTransferencia"
      FROM "Sale" s ${where}
    `, params);

    // Top products
    const topProductsRes = await db.query(`
      SELECT p."name", p."unit", SUM(si."quantity")::float AS "unidadesVendidas", SUM(si."subtotal")::float AS ingresos
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s."id"
      JOIN "Product" p ON si."productId" = p."id"
      ${where}
      GROUP BY si."productId", p."name", p."unit"
      ORDER BY "unidadesVendidas" DESC
      LIMIT 10
    `, params);

    // Sale detail
    const ventasRes = await db.query(`
      SELECT s."id", s."invoiceNumber" AS "invoiceNumber", s."total"::float, s."paymentMethod" AS "paymentMethod", s."createdAt" AS "createdAt",
             u."name" AS cajero,
             (SELECT COUNT(*) FROM "SaleItem" si WHERE si."saleId" = s."id")::int AS "numProductos"
      FROM "Sale" s
      LEFT JOIN "User" u ON s."cashierId" = u."id"
      ${where}
      ORDER BY s."createdAt" DESC
    `, params);

    res.json({ summary: summaryRes.rows[0], topProducts: topProductsRes.rows, ventas: ventasRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

module.exports = router;
