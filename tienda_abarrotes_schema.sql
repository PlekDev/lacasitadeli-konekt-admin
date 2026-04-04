-- La Casita POS Schema for PostgreSQL (Snake Case)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Use with caution: this resets the database
DROP TABLE IF EXISTS movimientos_inventario;
DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'cajero',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(100) UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(12, 2) NOT NULL,
    precio_compra DECIMAL(12, 2) DEFAULT 0,
    precio_mayoreo DECIMAL(12, 2),
    cantidad_mayoreo INTEGER,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    visible_web BOOLEAN DEFAULT TRUE,
    categoria_id INTEGER REFERENCES categorias(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio VARCHAR(50) NOT NULL UNIQUE,
    canal VARCHAR(50) DEFAULT 'caja',
    usuario_id UUID REFERENCES usuarios(id),
    metodo_pago VARCHAR(50) DEFAULT 'efectivo',
    total DECIMAL(12, 2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'completada',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_venta (
    id SERIAL PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    nombre_producto VARCHAR(255),
    cantidad DECIMAL(12, 3) NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    tipo VARCHAR(50) NOT NULL,
    cantidad DECIMAL(12, 3) NOT NULL,
    stock_antes DECIMAL(12, 3) NOT NULL,
    stock_despues DECIMAL(12, 3) NOT NULL,
    motivo TEXT,
    usuario_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Función para registrar venta de forma atómica
CREATE OR REPLACE FUNCTION registrar_venta(
    p_folio VARCHAR,
    p_canal VARCHAR,
    p_usuario_id UUID,
    p_metodo_pago VARCHAR,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_venta_id UUID;
    v_item RECORD;
    v_total DECIMAL(12, 2) := 0;
    v_producto_nombre VARCHAR;
    v_stock_actual DECIMAL(12, 3);
    v_subtotal DECIMAL(12, 2);
BEGIN
    -- Insertar la venta
    INSERT INTO ventas (folio, canal, usuario_id, metodo_pago, total)
    VALUES (p_folio, p_canal, p_usuario_id, p_metodo_pago, 0)
    RETURNING id INTO v_venta_id;

    -- Procesar cada item
    -- The JSON objects should have keys: producto_id, cantidad, precio_unitario
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(producto_id INT, cantidad DECIMAL, precio_unitario DECIMAL)
    LOOP
        -- Obtener info del producto y bloquear fila
        SELECT nombre, stock_actual INTO v_producto_nombre, v_stock_actual
        FROM productos WHERE id = v_item.producto_id FOR UPDATE;

        IF v_producto_nombre IS NULL THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', v_item.producto_id;
        END IF;

        v_subtotal := v_item.cantidad * v_item.precio_unitario;
        v_total := v_total + v_subtotal;

        -- Insertar detalle
        INSERT INTO detalle_venta (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_item.producto_id, v_producto_nombre, v_item.cantidad, v_item.precio_unitario, v_subtotal);

        -- Actualizar stock
        UPDATE productos
        SET stock_actual = stock_actual - v_item.cantidad,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_item.producto_id;

        -- Registrar movimiento
        INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo, usuario_id)
        VALUES (v_item.producto_id, 'venta', -v_item.cantidad, v_stock_actual, v_stock_actual - v_item.cantidad, 'Venta ' || p_folio, p_usuario_id);
    END LOOP;

    -- Actualizar el total de la venta
    UPDATE ventas SET total = v_total WHERE id = v_venta_id;

    RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;

-- Datos iniciales
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES ('Administrador', 'admin@lacasita.com', 'admin123', 'admin');

INSERT INTO categorias (nombre, descripcion)
VALUES ('Sabritas', 'Papas y frituras'),
       ('Refrescos', 'Bebidas carbonatadas'),
       ('Panadería', 'Pan dulce y salado');

INSERT INTO productos (codigo_barras, nombre, precio_venta, precio_compra, stock_actual, categoria_id, precio_mayoreo, cantidad_mayoreo)
VALUES ('75010111', 'Sabritas Original 45g', 17.00, 12.00, 50, 1, 15.00, 3),
       ('75010222', 'Coca-Cola 600ml', 18.00, 13.00, 100, 2, 16.50, 6),
       ('75010333', 'Galletas Marías 200g', 20.00, 15.00, 30, 3, 18.00, 5);
