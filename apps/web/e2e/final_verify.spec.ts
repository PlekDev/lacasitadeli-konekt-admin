import { test, expect } from '@playwright/test';

test('dashboard has correct cards and charts', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Wait for loading to finish
  await expect(page.locator('text=Cargando datos...')).not.toBeVisible({ timeout: 15000 });

  // Check for summary cards
  await expect(page.locator('text=INGRESOS TOTALES')).toBeVisible();
  await expect(page.locator('text=TICKET PROMEDIO')).toBeVisible();

  // Check for charts
  const charts = page.locator('.recharts-responsive-container');
  await expect(charts).toHaveCount(3);

  await page.screenshot({ path: 'final_dashboard.png', fullPage: true });
});

test('inventory view works', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.click('text=Inventario');

  await expect(page.locator('text=Inventario Global')).toBeVisible();
  await expect(page.locator('table')).toBeVisible();

  await page.screenshot({ path: 'final_inventory.png', fullPage: true });
});

test('sales (ventas) view works', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.click('text=Ventas');

  // Use a more robust locator for the search input in Ventas
  const searchInput = page.getByPlaceholder('Buscar producto para vender...');
  await expect(searchInput).toBeVisible({ timeout: 10000 });

  // Fixed strict mode violation by being more specific
  await expect(page.getByRole('heading', { name: 'Carrito' })).toBeVisible();

  await page.screenshot({ path: 'final_sales.png', fullPage: true });
});
