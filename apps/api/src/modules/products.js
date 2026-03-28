const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/products - search products with inventory for a location
router.get('/', (req, res) => {
  const db = getDb();
  const { q, locationId, categoryId } = req.query;

  let sql = `
    SELECT 
      p.id, p.barcode, p.name, p.salePrice, p.costPrice, p.unit,
      c.name AS category, c.color AS categoryColor,
      COALESCE(i.quantity, 0) AS stock,
      i.minStock
    FROM Product p
    LEFT JOIN Category c ON p.categoryId = c.id
    LEFT JOIN Inventory i ON p.id = i.productId AND i.locationId = ?
    WHERE p.active = 1
  `;
  const params = [locationId || ''];

  if (q) {
    sql += ` AND (p.name LIKE ? OR p.barcode LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  if (categoryId) {
    sql += ` AND p.categoryId = ?`;
    params.push(categoryId);
  }

  sql += ` ORDER BY p.name ASC`;

  try {
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/search-all - search across ALL locations (for inventory count)
router.get('/search-all', (req, res) => {
  const db = getDb();
  const { q } = req.query;

  if (!q || q.length < 2) return res.json([]);

  const sql = `
    SELECT 
      p.id, p.barcode, p.name, p.salePrice, p.costPrice, p.unit,
      c.name AS category,
      l.id AS locationId, l.name AS locationName, l.type AS locationType,
      COALESCE(i.quantity, 0) AS stock,
      i.minStock
    FROM Product p
    LEFT JOIN Category c ON p.categoryId = c.id
    LEFT JOIN Location l ON l.active = 1
    LEFT JOIN Inventory i ON p.id = i.productId AND i.locationId = l.id
    WHERE p.active = 1 AND (p.name LIKE ? OR p.barcode LIKE ?)
    ORDER BY p.name, l.name
  `;

  try {
    const rows = db.prepare(sql).all(`%${q}%`, `%${q}%`);

    // Group by product
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.id]) {
        grouped[row.id] = {
          id: row.id,
          barcode: row.barcode,
          name: row.name,
          salePrice: row.salePrice,
          costPrice: row.costPrice,
          unit: row.unit,
          category: row.category,
          locations: [],
          totalStock: 0
        };
      }
      if (row.locationId) {
        grouped[row.id].locations.push({
          locationId: row.locationId,
          locationName: row.locationName,
          locationType: row.locationType,
          stock: row.stock,
          minStock: row.minStock
        });
        grouped[row.id].totalStock += row.stock;
      }
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// GET /api/products/categories
router.get('/categories', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare(`SELECT * FROM Category WHERE active = 1 ORDER BY name`).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

module.exports = router;
