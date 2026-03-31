import { test, expect } from '@playwright/test';

test('Dashboard renders with key components', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Verify main logo text (part of sidebar)
  await expect(page.getByText('La Casita', { exact: true }).first()).toBeVisible();

  // Verify main heading
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Verify summary cards (labels)
  await expect(page.getByText('VENTAS', { exact: true })).toBeVisible();
  await expect(page.getByText('INGRESOS TOTALES', { exact: true })).toBeVisible();
  await expect(page.getByText('PRODUCTOS ACTIVOS', { exact: true })).toBeVisible();

  // Verify sidebar navigation items
  await expect(page.getByRole('button', { name: 'Inventario' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ventas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sucursales', exact: true })).toBeVisible();
});

test('POS view is functional', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.getByRole('button', { name: 'Ventas' }).click();

  // Verify POS components
  await expect(page.getByPlaceholder('Buscar producto para vender...')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carrito' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Completar Venta' })).toBeVisible();
});
