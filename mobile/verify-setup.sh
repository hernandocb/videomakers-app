#!/bin/bash

echo "🔍 Verificando configuração do App Mobile..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado: $(node -v)"
else
    echo "❌ Node.js não encontrado"
fi

# Check package.json
if [ -f "/app/mobile/package.json" ]; then
    echo "✅ package.json encontrado"
else
    echo "❌ package.json não encontrado"
fi

# Check node_modules
if [ -d "/app/mobile/node_modules" ]; then
    echo "✅ node_modules instalado"
else
    echo "⚠️  node_modules não encontrado - execute: yarn install"
fi

# Check key files
echo ""
echo "📁 Verificando arquivos principais:"

files=(
    "/app/mobile/src/context/AuthContext.js"
    "/app/mobile/src/screens/auth/LoginScreen.js"
    "/app/mobile/src/screens/common/ChatScreen.js"
    "/app/mobile/src/utils/constants.js"
    "/app/mobile/src/services/api.js"
    "/app/mobile/.env"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename $file)"
    else
        echo "❌ $(basename $file) - FALTANDO!"
    fi
done

# Check API keys in constants
echo ""
echo "🔑 Verificando API Keys:"

if grep -q "AIzaSyCBweBXEmEkAR8l_-jpBRoQyeabYx0d0yk" /app/mobile/src/utils/constants.js; then
    echo "✅ Google Maps API Key configurada"
else
    echo "❌ Google Maps API Key não encontrada"
fi

if grep -q "pk_test_51SIvQJRvLMnnPOKk" /app/mobile/src/utils/constants.js; then
    echo "✅ Stripe Publishable Key configurada"
else
    echo "❌ Stripe Publishable Key não encontrada"
fi

if grep -q "wss://" /app/mobile/src/utils/constants.js; then
    echo "✅ WebSocket URL configurada"
else
    echo "❌ WebSocket URL não encontrada"
fi

# Check dependencies
echo ""
echo "📦 Verificando dependências principais:"

deps=(
    "@react-native-google-signin/google-signin"
    "react-native-maps"
    "@react-native-firebase/app"
    "axios"
    "@react-navigation/native"
)

for dep in "${deps[@]}"; do
    if grep -q "\"$dep\"" /app/mobile/package.json; then
        echo "✅ $dep"
    else
        echo "❌ $dep - FALTANDO!"
    fi
done

echo ""
echo "✨ Verificação concluída!"
echo ""
echo "Para executar o app:"
echo "  cd /app/mobile"
echo "  yarn install  # Se node_modules não estiver instalado"
echo "  npx react-native run-android  # Para Android"
echo "  npx react-native run-ios      # Para iOS (somente macOS)"
