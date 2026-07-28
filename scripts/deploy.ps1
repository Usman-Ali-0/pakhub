# PakHub Production Deployment (PowerShell)
# Usage: .\scripts\deploy.ps1

param(
    [string]$Server = "root@157.245.153.76",
    [string]$DeployDir = "/opt/pakhub"
)

Write-Host "PakHub Deployment to $Server" -ForegroundColor Cyan

$remoteScript = @"
set -e
DEPLOY_DIR='$DeployDir'

if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

if [ -d "`$DEPLOY_DIR/.git" ]; then
  cd "`$DEPLOY_DIR" && git pull origin main
else
  git clone https://github.com/Usman-Ali-0/pakhub.git "`$DEPLOY_DIR"
  cd "`$DEPLOY_DIR"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|localhost:4000|157.245.153.76:4000|g' .env
  sed -i 's|development|production|g' .env
fi

docker compose down 2>/dev/null || true
docker compose build
docker compose up -d
sleep 10
docker compose exec -T api npx prisma db push --accept-data-loss || true
docker compose exec -T api npx tsx prisma/seed.ts || true
docker compose ps
echo 'Deployment complete: http://157.245.153.76:3000'
"@

ssh $Server $remoteScript

Write-Host "Done! Visit http://157.245.153.76:3000" -ForegroundColor Green
