-- La Casita POS Schema for PostgreSQL (Case Sensitive CamelCase)

-- Drop tables if they exist
DROP TABLE IF EXISTS "SaleItem";
DROP TABLE IF EXISTS "Sale";
DROP TABLE IF EXISTS "CashSession";
DROP TABLE IF EXISTS "Inventory";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "Location";
DROP TABLE IF EXISTS "Category";
DROP TABLE IF EXISTS "User";

-- User Table
CREATE TABLE "User" (
    "id" VARCHAR(25) PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Category Table
CREATE TABLE "Category" (
    "id" VARCHAR(25) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(20),
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Location Table
CREATE TABLE "Location" (
    "id" VARCHAR(25) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Table
CREATE TABLE "Product" (
    "id" VARCHAR(25) PRIMARY KEY,
    "barcode" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "image" TEXT,
    "salePrice" DECIMAL(12, 2) NOT NULL,
    "costPrice" DECIMAL(12, 2) DEFAULT 0,
    "unit" VARCHAR(20) DEFAULT 'pza',
    "categoryId" VARCHAR(25) REFERENCES "Category"("id"),
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE "Inventory" (
    "id" VARCHAR(25) PRIMARY KEY,
    "productId" VARCHAR(25) REFERENCES "Product"("id"),
    "locationId" VARCHAR(25) REFERENCES "Location"("id"),
    "quantity" DECIMAL(12, 3) DEFAULT 0,
    "minStock" DECIMAL(12, 3) DEFAULT 5,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("productId", "locationId")
);

-- CashSession Table
CREATE TABLE "CashSession" (
    "id" VARCHAR(25) PRIMARY KEY,
    "locationId" VARCHAR(25) REFERENCES "Location"("id"),
    "cashierId" VARCHAR(25) REFERENCES "User"("id"),
    "openingCash" DECIMAL(12, 2) DEFAULT 0,
    "openedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "closedAt" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) DEFAULT 'abierta',
    "totalSales" DECIMAL(12, 2) DEFAULT 0,
    "totalCash" DECIMAL(12, 2) DEFAULT 0,
    "totalCard" DECIMAL(12, 2) DEFAULT 0,
    "totalTransfer" DECIMAL(12, 2) DEFAULT 0,
    "totalItems" DECIMAL(12, 2) DEFAULT 0,
    "closingCash" DECIMAL(12, 2),
    "expectedCash" DECIMAL(12, 2),
    "difference" DECIMAL(12, 2),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sale Table
CREATE TABLE "Sale" (
    "id" VARCHAR(25) PRIMARY KEY,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "locationId" VARCHAR(25) REFERENCES "Location"("id"),
    "cashierId" VARCHAR(25) REFERENCES "User"("id"),
    "sessionId" VARCHAR(25) REFERENCES "CashSession"("id"),
    "subtotal" DECIMAL(12, 2) NOT NULL,
    "tax" DECIMAL(12, 2) DEFAULT 0,
    "discount" DECIMAL(12, 2) DEFAULT 0,
    "total" DECIMAL(12, 2) NOT NULL,
    "paymentMethod" VARCHAR(20) DEFAULT 'efectivo',
    "cashReceived" DECIMAL(12, 2),
    "change" DECIMAL(12, 2),
    "status" VARCHAR(20) DEFAULT 'completada',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SaleItem Table
CREATE TABLE "SaleItem" (
    "id" VARCHAR(25) PRIMARY KEY,
    "saleId" VARCHAR(25) REFERENCES "Sale"("id"),
    "productId" VARCHAR(25) REFERENCES "Product"("id"),
    "quantity" DECIMAL(12, 3) NOT NULL,
    "unitPrice" DECIMAL(12, 2) NOT NULL,
    "costPrice" DECIMAL(12, 2) DEFAULT 0,
    "discount" DECIMAL(12, 2) DEFAULT 0,
    "subtotal" DECIMAL(12, 2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data
INSERT INTO "User" ("id", "email", "password", "name", "role", "active")
VALUES ('user1', 'admin@lacasita.com', 'admin123', 'Administrador', 'admin', true);

INSERT INTO "Location" ("id", "name", "type", "address", "active")
VALUES ('loc1', 'Matriz', 'tienda', 'Calle Principal 123', true);

INSERT INTO "Category" ("id", "name", "description", "color", "active")
VALUES ('cat1', 'General', 'Categoría general', '#0a5c42', true);

INSERT INTO "Product" ("id", "barcode", "name", "categoryId", "salePrice", "costPrice", "unit", "active")
VALUES ('prod1', '7501234567890', 'Coca-Cola 600ml', 'cat1', 18.00, 12.00, 'pz', true);

INSERT INTO "Inventory" ("id", "productId", "locationId", "quantity", "minStock")
VALUES ('inv1', 'prod1', 'loc1', 50, 5);
