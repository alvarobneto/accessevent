#!/usr/bin/env bash
set -euo pipefail

# Obtém a raiz do workspace independentemente de onde o script for executado
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/mobile/.env"
ENV_EXAMPLE="$ROOT_DIR/mobile/.env.example"

# Permite passar um IP manualmente como argumento: ./update-ip.sh 192.168.1.100
IP="${1:-}"

if [ -z "$IP" ]; then
  # 1. macOS (en0 geralmente é Wi-Fi, en1 como alternativa)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
  fi

  # 2. Linux com iproute2
  if [ -z "$IP" ] && command -v ip >/dev/null 2>&1; then
    IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' || true)
  fi

  # 3. Fallback genérico via ifconfig
  if [ -z "$IP" ] && command -v ifconfig >/dev/null 2>&1; then
    IP=$(ifconfig 2>/dev/null | grep -E "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -n 1 || true)
  fi
fi

if [ -z "$IP" ]; then
  echo "❌ Não foi possível detectar o IP local da máquina." >&2
  echo "👉 Informe manualmente: ./update-ip.sh <SEU_IP>" >&2
  exit 1
fi

# Se mobile/.env não existir, cria a partir de .env.example
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    echo "⚠️ Arquivo mobile/.env não encontrado. Copiando de mobile/.env.example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
  else
    touch "$ENV_FILE"
  fi
fi

# Detecta a porta atual configurada (padrão 3333)
PORT="3333"
if grep -qE '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"; then
  DETECTED_PORT=$(grep -E '^EXPO_PUBLIC_API_URL=' "$ENV_FILE" | sed -E 's|.*:([0-9]+).*|\1|')
  if [[ "$DETECTED_PORT" =~ ^[0-9]+$ ]]; then
    PORT="$DETECTED_PORT"
  fi
fi

NEW_URL="http://${IP}:${PORT}"

# Atualiza ou insere EXPO_PUBLIC_API_URL no mobile/.env
if grep -qE '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' -E "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${NEW_URL}|" "$ENV_FILE"
  else
    sed -i -E "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${NEW_URL}|" "$ENV_FILE"
  fi
else
  echo "" >> "$ENV_FILE"
  echo "EXPO_PUBLIC_API_URL=${NEW_URL}" >> "$ENV_FILE"
fi

echo "✅ IP configurado com sucesso!"
echo "   IP: $IP"
echo "   URL: $NEW_URL"
echo "   Arquivo: mobile/.env"

# Teste opcional de conectividade com o backend
if command -v curl >/dev/null 2>&1; then
  if curl -s --max-time 2 "${NEW_URL}/health" >/dev/null 2>&1; then
    echo "🟢 Backend ativo e respondendo no health check."
  else
    echo "🟡 Backend não respondeu em ${NEW_URL}/health (verifique se 'npm run start:dev' está rodando no backend)."
  fi
fi
