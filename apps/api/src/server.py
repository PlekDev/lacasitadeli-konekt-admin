#!/usr/bin/env python3
"""
La Casita POS - API Backend (Python/Flask)
Serve frontend + REST API usando SQLite
"""

import sqlite3
import json
import os
import uuid
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, send_file
from pathlib import Path

app = Flask(__name__)

DB_PATH = Path(__file__).parent / 'db' / 'lacasita.db'
STATIC_PATH = Path(__file__).parent.parent.parent / 'web' / 'public'

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def uid():
    return uuid.uuid4().hex[:25]

def now_ms():
    return int(time.time() * 1000)

# ─── STATIC FRONTEND ──────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path and (STATIC_PATH / path).exists():
        return send_from_directory(str(STATIC_PATH), path)
    return send_file(str(STATIC_PATH / 'index.html'))

# ─── HEALTH ───────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})

# ─── AUTH ─────────────────────────────────────────────────────────
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, email, name, role FROM User WHERE email=? AND password=? AND active=1",
            (data.get('email'), data.get('password'))
        ).fetchone()
        if not user:
            return jsonify({'error': 'Credenciales incorrectas'}), 401
        return jsonify({'user': dict(user)})

@app.route('/api/locations')
def get_locations():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM Location WHERE active=1 ORDER BY name").fetchall()
        return jsonify([dict(r) for r in rows])

# ─── PRODUCTS ─────────────────────────────────────────────────────
@app.route('/api/products')
def get_products():
    location_id = request.args.get('locationId', '')
    q = request.args.get('q', '')
    category_id = request.args.get('categoryId', '')

    sql = """
        SELECT p.id, p.barcode, p.name, p.salePrice, p.costPrice, p.unit,
               c.name AS category, c.color AS categoryColor,
               COALESCE(i.quantity, 0) AS stock,
               COALESCE(i.minStock, 5) AS minStock
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Inventory i ON p.id = i.productId AND i.locationId = ?
        WHERE p.active = 1
    """
    params = [location_id]

    if q:
        sql += " AND (p.name LIKE ? OR p.barcode LIKE ?)"
        params += [f'%{q}%', f'%{q}%']
    if category_id:
        sql += " AND p.categoryId = ?"
        params.append(category_id)

    sql += " ORDER BY p.name ASC"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/products/search-all')
def search_all_products():
    q = request.args.get('q', '')
    if len(q) < 2:
        return jsonify([])

    sql = """
        SELECT p.id, p.barcode, p.name, p.salePrice, p.costPrice, p.unit,
               c.name AS category,
               l.id AS locationId, l.name AS locationName, l.type AS locationType,
               COALESCE(i.quantity, 0) AS stock,
               COALESCE(i.minStock, 5) AS minStock
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        CROSS JOIN Location l
        LEFT JOIN Inventory i ON p.id = i.productId AND i.locationId = l.id
        WHERE p.active = 1 AND l.active = 1
          AND (p.name LIKE ? OR p.barcode LIKE ?)
        ORDER BY p.name, l.name
    """

    with get_db() as conn:
        rows = conn.execute(sql, [f'%{q}%', f'%{q}%']).fetchall()

    grouped = {}
    for r in rows:
        r = dict(r)
        pid = r['id']
        if pid not in grouped:
            grouped[pid] = {
                'id': r['id'], 'barcode': r['barcode'], 'name': r['name'],
                'salePrice': r['salePrice'], 'costPrice': r['costPrice'],
                'unit': r['unit'], 'category': r['category'],
                'locations': [], 'totalStock': 0
            }
        if r['locationId']:
            grouped[pid]['locations'].append({
                'locationId': r['locationId'],
                'locationName': r['locationName'],
                'locationType': r['locationType'],
                'stock': r['stock'],
                'minStock': r['minStock']
            })
            grouped[pid]['totalStock'] += r['stock']

    return jsonify(list(grouped.values()))

@app.route('/api/products/categories')
def get_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM Category WHERE active=1 ORDER BY name").fetchall()
        return jsonify([dict(r) for r in rows])

# ─── SESSIONS ─────────────────────────────────────────────────────
@app.route('/api/sessions/active')
def get_active_session():
    location_id = request.args.get('locationId', '')
    with get_db() as conn:
        row = conn.execute("""
            SELECT cs.*, u.name AS cashierName, l.name AS locationName
            FROM CashSession cs
            LEFT JOIN User u ON cs.cashierId = u.id
            LEFT JOIN Location l ON cs.locationId = l.id
            WHERE cs.locationId = ? AND cs.status = 'abierta'
            ORDER BY cs.openedAt DESC LIMIT 1
        """, (location_id,)).fetchone()
        return jsonify(dict(row) if row else None)

@app.route('/api/sessions/open', methods=['POST'])
def open_session():
    data = request.json
    n = now_ms()
    sid = uid()
    with get_db() as conn:
        # Close existing open sessions
        conn.execute(
            "UPDATE CashSession SET status='cerrada', closedAt=?, updatedAt=? WHERE locationId=? AND status='abierta'",
            (n, n, data['locationId'])
        )
        conn.execute("""
            INSERT INTO CashSession
            (id, locationId, cashierId, openingCash, openedAt, totalSales, totalCash, totalCard, totalTransfer, totalItems, status, createdAt, updatedAt)
            VALUES (?,?,?,?,?,0,0,0,0,0,'abierta',?,?)
        """, (sid, data['locationId'], data['cashierId'], data.get('openingCash', 0), n, n, n))
        conn.commit()
        row = conn.execute("""
            SELECT cs.*, u.name AS cashierName, l.name AS locationName
            FROM CashSession cs
            LEFT JOIN User u ON cs.cashierId = u.id
            LEFT JOIN Location l ON cs.locationId = l.id
            WHERE cs.id = ?
        """, (sid,)).fetchone()
        return jsonify(dict(row))

@app.route('/api/sessions/close/<session_id>', methods=['POST'])
def close_session(session_id):
    data = request.json
    n = now_ms()
    with get_db() as conn:
        session = conn.execute("SELECT * FROM CashSession WHERE id=?", (session_id,)).fetchone()
        if not session:
            return jsonify({'error': 'Sesión no encontrada'}), 404
        session = dict(session)
        expected = session['openingCash'] + session['totalCash']
        closing = data.get('closingCash', 0)
        diff = closing - expected
        conn.execute("""
            UPDATE CashSession SET status='cerrada', closedAt=?, closingCash=?,
            expectedCash=?, difference=?, notes=?, updatedAt=? WHERE id=?
        """, (n, closing, expected, diff, data.get('notes'), n, session_id))
        conn.commit()
        row = conn.execute("SELECT * FROM CashSession WHERE id=?", (session_id,)).fetchone()
        return jsonify(dict(row))

@app.route('/api/sessions/<session_id>/summary')
def session_summary(session_id):
    with get_db() as conn:
        session = conn.execute("""
            SELECT cs.*, u.name AS cashierName, l.name AS locationName
            FROM CashSession cs
            LEFT JOIN User u ON cs.cashierId = u.id
            LEFT JOIN Location l ON cs.locationId = l.id
            WHERE cs.id = ?
        """, (session_id,)).fetchone()
        if not session:
            return jsonify({'error': 'Sesión no encontrada'}), 404

        sales = conn.execute("""
            SELECT s.*,
              (SELECT COUNT(*) FROM SaleItem si WHERE si.saleId = s.id) AS numProductos
            FROM Sale s WHERE s.sessionId = ? ORDER BY s.createdAt DESC
        """, (session_id,)).fetchall()

        top = conn.execute("""
            SELECT p.name, SUM(si.quantity) AS unidades, SUM(si.subtotal) AS total
            FROM SaleItem si
            JOIN Sale s ON si.saleId = s.id
            JOIN Product p ON si.productId = p.id
            WHERE s.sessionId = ?
            GROUP BY si.productId ORDER BY unidades DESC LIMIT 10
        """, (session_id,)).fetchall()

        return jsonify({
            'session': dict(session),
            'sales': [dict(s) for s in sales],
            'topProducts': [dict(t) for t in top]
        })

# ─── SALES ────────────────────────────────────────────────────────
@app.route('/api/sales', methods=['POST'])
def create_sale():
    data = request.json
    items = data.get('items', [])
    if not items:
        return jsonify({'error': 'La venta debe tener al menos un producto'}), 400

    location_id = data['locationId']
    cashier_id = data['cashierId']
    session_id = data.get('sessionId')
    payment = data.get('paymentMethod', 'efectivo')
    cash_received = data.get('cashReceived')

    subtotal = sum(i['unitPrice'] * i['quantity'] for i in items)
    total = subtotal
    change = (cash_received - total) if payment == 'efectivo' and cash_received else None

    n = now_ms()

    with get_db() as conn:
        # Get next invoice number
        last = conn.execute(
            "SELECT invoiceNumber FROM Sale WHERE locationId=? ORDER BY createdAt DESC LIMIT 1",
            (location_id,)
        ).fetchone()
        next_num = 1
        if last:
            import re
            m = re.search(r'\d+', last['invoiceNumber'])
            if m: next_num = int(m.group()) + 1
        invoice = f"F{next_num:04d}"

        sale_id = uid()
        conn.execute("""
            INSERT INTO Sale (id, invoiceNumber, locationId, cashierId, sessionId, subtotal, tax, discount, total,
            paymentMethod, cashReceived, change, status, notes, createdAt, updatedAt)
            VALUES (?,?,?,?,?,?,0,0,?,?,?,?,'completada',?,?,?)
        """, (sale_id, invoice, location_id, cashier_id, session_id, subtotal, total,
              payment, cash_received, change, data.get('notes'), n, n))

        for item in items:
            item_id = uid()
            item_subtotal = item['unitPrice'] * item['quantity']
            conn.execute("""
                INSERT INTO SaleItem (id, saleId, productId, quantity, unitPrice, costPrice, discount, subtotal, createdAt)
                VALUES (?,?,?,?,?,?,0,?,?)
            """, (item_id, sale_id, item['productId'], item['quantity'],
                  item['unitPrice'], item.get('costPrice', 0), item_subtotal, n))

            # Decrease inventory
            inv = conn.execute(
                "SELECT id, quantity FROM Inventory WHERE productId=? AND locationId=?",
                (item['productId'], location_id)
            ).fetchone()
            if inv:
                conn.execute(
                    "UPDATE Inventory SET quantity=MAX(0, quantity-?), updatedAt=? WHERE id=?",
                    (item['quantity'], n, inv['id'])
                )

        # Update session
        if session_id:
            cash_amt = total if payment == 'efectivo' else 0
            card_amt = total if payment == 'tarjeta' else 0
            transfer_amt = total if payment == 'transferencia' else 0
            total_items = sum(i['quantity'] for i in items)
            conn.execute("""
                UPDATE CashSession SET
                  totalSales=totalSales+?, totalCash=totalCash+?,
                  totalCard=totalCard+?, totalTransfer=totalTransfer+?,
                  totalItems=totalItems+?, updatedAt=?
                WHERE id=?
            """, (total, cash_amt, card_amt, transfer_amt, total_items, n, session_id))

        conn.commit()

    return jsonify({'success': True, 'saleId': sale_id, 'invoiceNumber': invoice, 'total': total, 'change': change})

@app.route('/api/sales/report')
def sales_report():
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    location_id = request.args.get('locationId', '')

    try:
        d = datetime.strptime(date_str, '%Y-%m-%d')
    except:
        d = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    start_ts = int(d.replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
    end_ts = start_ts + 86400000

    where = "WHERE s.createdAt >= ? AND s.createdAt < ? AND s.status = 'completada'"
    params = [start_ts, end_ts]

    if location_id:
        where += " AND s.locationId = ?"
        params.append(location_id)

    with get_db() as conn:
        summary = conn.execute(f"""
            SELECT
              COUNT(*) AS totalVentas,
              COALESCE(SUM(s.total), 0) AS totalIngresos,
              COALESCE(SUM(s.total - (SELECT COALESCE(SUM(si2.costPrice * si2.quantity),0) FROM SaleItem si2 WHERE si2.saleId = s.id)), 0) AS gananciaEstimada,
              COALESCE(AVG(s.total), 0) AS ticketPromedio,
              COALESCE(SUM(CASE WHEN s.paymentMethod='efectivo' THEN s.total ELSE 0 END), 0) AS totalEfectivo,
              COALESCE(SUM(CASE WHEN s.paymentMethod='tarjeta' THEN s.total ELSE 0 END), 0) AS totalTarjeta,
              COALESCE(SUM(CASE WHEN s.paymentMethod='transferencia' THEN s.total ELSE 0 END), 0) AS totalTransferencia
            FROM Sale s {where}
        """, params).fetchone()

        top_products = conn.execute(f"""
            SELECT p.name, p.unit, SUM(si.quantity) AS unidadesVendidas, SUM(si.subtotal) AS ingresos
            FROM SaleItem si
            JOIN Sale s ON si.saleId = s.id
            JOIN Product p ON si.productId = p.id
            {where}
            GROUP BY si.productId ORDER BY unidadesVendidas DESC LIMIT 10
        """, params).fetchall()

        ventas = conn.execute(f"""
            SELECT s.id, s.invoiceNumber, s.total, s.paymentMethod, s.createdAt,
                   u.name AS cajero,
                   (SELECT COUNT(*) FROM SaleItem si WHERE si.saleId = s.id) AS numProductos
            FROM Sale s
            LEFT JOIN User u ON s.cashierId = u.id
            {where}
            ORDER BY s.createdAt DESC
        """, params).fetchall()

        return jsonify({
            'summary': dict(summary),
            'topProducts': [dict(r) for r in top_products],
            'ventas': [dict(v) for v in ventas]
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    print(f"🏪 La Casita POS - Servidor en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
