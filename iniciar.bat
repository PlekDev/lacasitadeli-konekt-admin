@echo off
echo.
echo   La Casita -- Sistema de Punto de Venta
echo   ----------------------------------------
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Python no encontrado. Instala Python desde https://python.org
    pause
    exit /b 1
)

python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo   Instalando Flask...
    pip install flask -q
)

echo   Iniciando servidor...
echo.
echo   Abre tu navegador en: http://localhost:3001
echo.
echo   Usuarios de prueba:
echo     cajero1@lacasita.com / cajero123
echo     cajero2@lacasita.com / cajero123
echo     admin@lacasita.com   / admin123
echo.
echo   Presiona Ctrl+C para detener el servidor
echo.

cd /d "%~dp0\apps\api\src"
python server.py
pause
