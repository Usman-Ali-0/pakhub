#!/bin/bash
# Run this ON the server (SSH or DigitalOcean web console as root)
# PakHub one-shot bootstrap — does not store passwords in repo

set -e

DEPLOY_DIR="${DEPLOY_DIR:-/opt/pakhub}"
REPO_URL="https://github.com/Usman-Ali-0/pakhub.git"
PUBLIC_IP="${PUBLIC_IP:-157.245.153.76}"

echo "=== PakHub bootstrap ==="

if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &>/dev/null; then
  apt-get update -y
  apt-get install -y git curl ca-certificates docker-compose-plugin || true
fi

if [ -d "$DEPLOY_DIR/.git" ]; then
  cd "$DEPLOY_DIR"
  git fetch origin
  git reset --hard origin/main
else
  rm -rf "$DEPLOY_DIR"
  git clone "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  JWT=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
  REF=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
  ENC=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
  sed -i "s|NODE_ENV=development|NODE_ENV=production|g" .env
  sed -i "s|http://localhost:4000|http://${PUBLIC_IP}:4000|g" .env
  sed -i "s|http://localhost:3000|http://${PUBLIC_IP}:3000|g" .env
  sed -i "s|your-super-secret-jwt-key-change-this-in-production-min-32-chars|${JWT}|g" .env
  sed -i "s|your-refresh-token-secret-change-this-too|${REF}|g" .env
  sed -i "s|your-32-char-encryption-key-here!!|${ENC}${ENC}|g" .env
  echo "Created .env with random secrets. Add GEMINI_API_KEY / GROQ_API_KEY if you want platform AI."
fi

export API_URL="http://${PUBLIC_IP}:4000"
export CLIENT_URL="http://${PUBLIC_IP}:3000"

docker compose down 2>/dev/null || true
docker compose build
docker compose up -d

echo "Waiting for Postgres..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U pisahub -d pisahub &>/dev/null; then
    break
  fi
  sleep 2
done

docker compose exec -T api npx prisma db push --accept-data-loss || docker compose run --rm api npx prisma db push --accept-data-loss
docker compose exec -T api npx tsx prisma/seed.ts || docker compose run --rm api npx tsx prisma/seed.ts || true

echo ""
echo "=== PakHub is up ==="
echo "  Web:  http://${PUBLIC_IP}:3000"
echo "  API:  http://${PUBLIC_IP}:4000/api/health"
echo "  Git:  http://${PUBLIC_IP}:4000/git/USER/REPO.git"
echo ""
docker compose ps
