const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/products - search products with inventory for a location
router.get('/', async (req, res) => {
  const { q, locationId, categoryId } = req.query;

  let sql = `
    SELECT 
      p."id", p."barcode", p."name", p."salePrice", p."costPrice", p."unit",
      c."name" AS category, c."color" AS "categoryColor",
      COALESCE(i."quantity", 0) AS stock,
      i."minStock" AS "minStock"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c."id"
    LEFT JOIN "Inventory" i ON p."id" = i."productId" AND i."locationId" = $1
    WHERE p."active" = true
  `;
  const params = [locationId || 'loc1']; // Default to loc1 for consistency

  if (q) {
    sql += ` AND (p."name" ILIKE $${params.length + 1} OR p."barcode" ILIKE $${params.length + 1})`;
    params.push(`%${q}%`);
  }
  if (categoryId) {
    sql += ` AND p."categoryId" = $${params.length + 1}`;
    params.push(categoryId);
  }

  sql += ` ORDER BY p."name" ASC`;

  try {
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/search-all - search across ALL locations (for inventory count)
router.get('/search-all', async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) return res.json([]);

  const sql = `
    SELECT 
      p."id", p."barcode", p."name", p."salePrice", p."costPrice", p."unit",
      c."name" AS category,
      l."id" AS "locationId", l."name" AS "locationName", l."type" AS "locationType",
      COALESCE(i."quantity", 0) AS stock,
      i."minStock" AS "minStock"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c."id"
    LEFT JOIN "Location" l ON l."active" = true
    LEFT JOIN "Inventory" i ON p."id" = i."productId" AND i."locationId" = l."id"
    WHERE p."active" = true AND (p."name" ILIKE $1 OR p."barcode" ILIKE $1)
    ORDER BY p."name", l."name"
  `;

  try {
    const result = await db.query(sql, [`%${q}%`]);
    const rows = result.rows;

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
        grouped[row.id].totalStock += parseFloat(row.stock);
      }
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM "Category" WHERE "active" = true ORDER BY "name"`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

module.exports = router;
