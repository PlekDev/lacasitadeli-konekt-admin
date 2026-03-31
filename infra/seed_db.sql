-- Seed Categories
INSERT INTO Category (id, name, color, active) VALUES
('cat1', 'Lácteos', '#10b981', 1),
('cat2', 'Embutidos', '#f59e0b', 1),
('cat3', 'Vinos', '#ef4444', 1);

-- Seed Locations
INSERT INTO Location (id, name, type, active) VALUES
('loc1', 'Sucursal Centro', 'tienda', 1);

-- Seed Products
INSERT INTO Product (id, barcode, name, categoryId, salePrice, costPrice, unit, active) VALUES
('prod1', '7501234567890', 'Queso Manchego 250g', 'cat1', 85.50, 60.00, 'pz', 1),
('prod2', '7509876543210', 'Jamón Serrano 100g', 'cat2', 120.00, 85.00, 'pz', 1),
('prod3', '7505554443332', 'Vino Tinto Reserva', 'cat3', 450.00, 300.00, 'botella', 1);

-- Seed Inventory
INSERT INTO Inventory (id, productId, locationId, quantity, minStock) VALUES
('inv1', 'prod1', 'loc1', 20, 5),
('inv2', 'prod2', 'loc1', 15, 5),
('inv3', 'prod3', 'loc1', 8, 2);

-- Seed User
INSERT INTO "User" (id, email, password, name, role, active) VALUES
('user1', 'admin@lacasita.com', 'admin123', 'Admin La Casita', 'admin', 1);
