#!/bin/bash
# PakHub Production Deployment Script
# Usage: ./scripts/deploy.sh [server_user@157.245.153.76]

set -e

SERVER="${1:-root@157.245.153.76}"
DEPLOY_DIR="/opt/pakhub"
REPO_URL="https://github.com/Usman-Ali-0/pakhub.git"

echo "╔══════════════════════════════════════════╗"
echo "║       PakHub Deployment Script           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Deploying to: $SERVER"
echo "Deploy dir:   $DEPLOY_DIR"
echo ""

ssh "$SERVER" bash -s << 'REMOTE_SCRIPT'
set -e
DEPLOY_DIR="/opt/pakhub"

# Install Docker if missing
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Install docker compose plugin if missing
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  apt-get update && apt-get install -y docker-compose-plugin || true
fi

# Clone or pull repo
if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "Pulling latest changes..."
  cd "$DEPLOY_DIR"
  git pull origin main
else
  echo "Cloning repository..."
  mkdir -p "$DEPLOY_DIR"
  git clone https://github.com/Usman-Ali-0/pakhub.git "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo "Creating .env from example..."
  cp .env.example .env
  # Set production values
  sed -i 's|API_URL=http://localhost:4000|API_URL=http://157.245.153.76:4000|g' .env
  sed -i 's|NEXT_PUBLIC_API_URL=http://localhost:4000|NEXT_PUBLIC_API_URL=http://157.245.153.76:4000|g' .env
  sed -i 's|NODE_ENV=development|NODE_ENV=production|g' .env
  echo ""
  echo "⚠️  IMPORTANT: Edit $DEPLOY_DIR/.env with your secrets before first run!"
  echo "   Set JWT_SECRET, ENCRYPTION_KEY, GEMINI_API_KEY, etc."
fi

# Build and start
echo "Building and starting containers..."
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# Wait for postgres
echo "Waiting for database..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker compose exec -T api npx prisma db push --accept-data-loss 2>/dev/null || \
  docker compose run --rm api npx prisma db push --accept-data-loss || true

docker compose exec -T api npx tsx prisma/seed.ts 2>/dev/null || \
  docker compose run --rm api npx tsx prisma/seed.ts || true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "  Frontend: http://157.245.153.76:3000"
echo "  API:      http://157.245.153.76:4000/api/health"
echo "  Git:      http://157.245.153.76:4000/git/{user}/{repo}.git"
echo ""
docker compose ps
REMOTE_SCRIPT

echo ""
echo "Done! Visit http://157.245.153.76:3000"
