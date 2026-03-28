#!/bin/bash
# ─────────────────────────────────────────────
#  La Casita POS — Script de inicio rápido
# ─────────────────────────────────────────────

echo ""
echo "  🏪  La Casita — Sistema de Punto de Venta"
echo "  ──────────────────────────────────────────"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "  ❌ Python 3 no encontrado. Instálalo desde https://python.org"
    exit 1
fi

# Check Flask
if ! python3 -c "import flask" 2>/dev/null; then
    echo "  📦 Instalando Flask..."
    pip3 install flask --break-system-packages -q || pip3 install flask -q
fi

echo "  ✅ Iniciando servidor..."
echo ""
echo "  👉 Abre tu navegador en: http://localhost:3001"
echo ""
echo "  Usuarios de prueba:"
echo "    cajero1@lacasita.com / cajero123"
echo "    cajero2@lacasita.com / cajero123"
echo "    admin@lacasita.com   / admin123"
echo ""
echo "  Presiona Ctrl+C para detener el servidor"
echo ""

cd "$(dirname "$0")/apps/api/src"
python3 server.py
