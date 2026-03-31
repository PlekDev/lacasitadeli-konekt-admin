#!/bin/bash
# ─────────────────────────────────────────────
#  La Casita POS — Script de inicio rápido
# ─────────────────────────────────────────────

echo ""
echo "  🏪  La Casita — Sistema de Punto de Venta"
echo "  ──────────────────────────────────────────"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js no encontrado. Instálalo desde https://nodejs.org"
    exit 1
fi

# Kill any existing processes on 3001 and 3002
echo "  🛑 Deteniendo procesos anteriores en puertos 3001 y 3002..."
kill $(lsof -t -i :3001) $(lsof -t -i :3002) 2>/dev/null || true

echo "  🚀 Iniciando API Backend en puerto 3002..."
cd apps/api
npm install -s
PORT=3002 node src/index.js > api.log 2>&1 &

echo "  🚀 Iniciando Frontend (Next.js) en puerto 3001..."
cd ../web
npm install -s
npm run dev -- -p 3001 > web.log 2>&1 &

echo ""
echo "  ✅ Sistema listo."
echo "  👉 Abre tu navegador en: http://localhost:3001"
echo ""
echo "  Usuarios de prueba:"
echo "    admin@lacasita.com / admin123"
echo ""
echo "  Presiona Ctrl+C para salir (se detendrán los logs, pero los procesos seguirán hasta que el script termine)"
echo ""

# Monitor logs
tail -f api.log -f ../web/web.log
