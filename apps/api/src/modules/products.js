const express = require('express');
const db = require('../db');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// GET /api/products - search products with inventory for a location
router.get('/', async (req, res) => {
  const { q, locationId, categoryId } = req.query;

  let sql = `
    SELECT 
      p."id", p."barcode", p."name", p."image", p."salePrice", p."costPrice", p."unit", p."categoryId",
      c."name" AS category, c."color" AS "categoryColor",
      COALESCE(i."quantity", 0) AS stock,
      i."minStock" AS "minStock"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c."id"
    LEFT JOIN "Inventory" i ON p."id" = i."productId" AND i."locationId" = $1
    WHERE p."active" = true
  `;
  const params = [locationId || 'loc1'];

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

// POST /api/products - Create a new product
router.post('/', async (req, res) => {
  const { barcode, name, image, salePrice, costPrice, unit, categoryId, initialStock, locationId } = req.body;
  const productId = uuidv4();
  const locId = locationId || 'loc1';
  const catId = categoryId && categoryId !== '' ? categoryId : null;

  try {
    await db.query('BEGIN');

    await db.query(
      `INSERT INTO "Product" ("id", "barcode", "name", "image", "salePrice", "costPrice", "unit", "categoryId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [productId, barcode, name, image, salePrice, costPrice, unit || 'pza', catId]
    );

    const invId = uuidv4();
    await db.query(
      `INSERT INTO "Inventory" ("id", "productId", "locationId", "quantity", "minStock")
       VALUES ($1, $2, $3, $4, $5)`,
      [invId, productId, locId, initialStock || 0, 5]
    );

    await db.query('COMMIT');
    res.status(201).json({ id: productId, message: 'Producto creado exitosamente' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { barcode, name, image, salePrice, costPrice, unit, categoryId, stock, locationId } = req.body;
  const catId = categoryId && categoryId !== '' ? categoryId : null;

  try {
    await db.query('BEGIN');

    await db.query(
      `UPDATE "Product"
       SET "barcode" = $1, "name" = $2, "image" = $3, "salePrice" = $4, "costPrice" = $5, "unit" = $6, "categoryId" = $7, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $8`,
      [barcode, name, image, salePrice, costPrice, unit, catId, id]
    );

    if (stock !== undefined) {
      const locId = locationId || 'loc1';
      await db.query(
        `INSERT INTO "Inventory" ("id", "productId", "locationId", "quantity")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("productId", "locationId") DO UPDATE SET "quantity" = $4, "updatedAt" = CURRENT_TIMESTAMP`,
         [uuidv4(), id, locId, stock]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id - Deactivate a product (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE "Product" SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, [id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// GET /api/products/search-all - search across ALL locations
router.get('/search-all', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const sql = `
    SELECT 
      p."id", p."barcode", p."name", p."image", p."salePrice", p."costPrice", p."unit",
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
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.id]) {
        grouped[row.id] = {
          id: row.id, barcode: row.barcode, name: row.name, image: row.image,
          salePrice: row.salePrice, costPrice: row.costPrice, unit: row.unit,
          category: row.category, locations: [], totalStock: 0
        };
      }
      if (row.locationId) {
        grouped[row.id].locations.push({
          locationId: row.locationId, locationName: row.locationName,
          locationType: row.locationType, stock: row.stock, minStock: row.minStock
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
