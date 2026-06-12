#!/bin/bash
# setup-local.sh — Verifica y prepara el entorno local

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setup local: Operativo Frío"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar Python
echo ""
echo "✓ Verificando Python..."
python --version || { echo "ERROR: Python no instalado"; exit 1; }

# Crear entorno virtual si no existe
if [ ! -d ".venv" ]; then
    echo "✓ Creando entorno virtual..."
    python -m venv .venv
else
    echo "✓ Entorno virtual ya existe"
fi

# Activar
echo "✓ Activando entorno virtual..."
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate

# Instalar Python deps
echo "✓ Instalando dependencias Python..."
pip install --quiet -r requirements.txt

# Verificar .env
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  FALTA .env — Crear ahora:"
    cat > .env << 'EOF'
KEY_OP_FRIO=<tu_token_kobo>
URL_OP_FRIO=<tu_url_kobo>
EOF
    echo "   Edita .env con tus credenciales KoBoToolbox"
else
    echo "✓ .env existe"
fi

# Node.js
echo "✓ Verificando Node.js..."
node --version || { echo "ERROR: Node.js no instalado"; exit 1; }

# Instalar dependencias React
echo "✓ Instalando dependencias React..."
cd Dashboard
npm ci --quiet
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Setup completo"
echo ""
echo "Próximo paso:"
echo "  bash build.sh       # Correr pipeline completo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
