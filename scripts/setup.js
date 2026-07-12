#!/usr/bin/env node
/**
 * PISA-HUB Setup Script
 * Runs after `pnpm install` to configure the development environment
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function step(msg) {
  log(`\n▶ ${msg}`, colors.blue + colors.bold);
}

function success(msg) {
  log(`✓ ${msg}`, colors.green);
}

function warn(msg) {
  log(`⚠ ${msg}`, colors.yellow);
}

function error(msg) {
  log(`✗ ${msg}`, colors.red);
}

function run(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: 'inherit', ...options });
    return true;
  } catch (e) {
    return false;
  }
}

async function setup() {
  log('\n╔═══════════════════════════════════╗', colors.bold);
  log('║      PISA-HUB Setup Script        ║', colors.bold);
  log('╚═══════════════════════════════════╝\n', colors.bold);

  // 1. Check .env exists
  step('Checking environment configuration...');
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    success('Created .env from .env.example');
    warn('Remember to update your .env with real API keys (especially GEMINI_API_KEY and GROQ_API_KEY)');
  } else {
    success('.env already exists');
  }

  // 2. Create repos directory
  step('Creating git repositories storage directory...');
  const reposDir = path.join(rootDir, 'repos');
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
    success('Created repos/ directory');
  } else {
    success('repos/ directory already exists');
  }

  // 3. Check Docker
  step('Checking Docker...');
  const dockerRunning = run('docker info', { stdio: 'ignore' });
  if (!dockerRunning) {
    error('Docker is not running! Please start Docker Desktop and try again.');
    process.exit(1);
  }
  success('Docker is running');

  // 4. Start Docker services
  step('Starting infrastructure (PostgreSQL, Redis, MinIO, Elasticsearch)...');
  const dockerUp = run('docker compose up -d', { cwd: rootDir });
  if (!dockerUp) {
    error('Failed to start Docker services');
    process.exit(1);
  }
  success('Docker services started');

  // 5. Wait for PostgreSQL to be ready
  step('Waiting for PostgreSQL to be ready...');
  let pgReady = false;
  for (let i = 0; i < 30; i++) {
    pgReady = run('docker exec pisahub-postgres pg_isready -U pisahub -d pisahub', { stdio: 'ignore' });
    if (pgReady) break;
    await new Promise(r => setTimeout(r, 2000));
    process.stdout.write('.');
  }
  if (!pgReady) {
    error('\nPostgreSQL did not start in time');
    process.exit(1);
  }
  success('\nPostgreSQL is ready');

  log('\n╔═══════════════════════════════════════════════════╗', colors.green + colors.bold);
  log('║          Setup Complete! 🎉                       ║', colors.green + colors.bold);
  log('╠═══════════════════════════════════════════════════╣', colors.green + colors.bold);
  log('║  Run these commands to finish:                    ║', colors.green + colors.bold);
  log('║                                                   ║', colors.green + colors.bold);
  log('║  pnpm db:push    → Push database schema           ║', colors.green + colors.bold);
  log('║  pnpm db:seed    → Create demo accounts           ║', colors.green + colors.bold);
  log('║  pnpm dev        → Start all dev servers          ║', colors.green + colors.bold);
  log('║                                                   ║', colors.green + colors.bold);
  log('║  Frontend: http://localhost:3000                  ║', colors.green + colors.bold);
  log('║  Backend:  http://localhost:4000                  ║', colors.green + colors.bold);
  log('║  MinIO UI: http://localhost:9001                  ║', colors.green + colors.bold);
  log('║  Email UI: http://localhost:8025                  ║', colors.green + colors.bold);
  log('╚═══════════════════════════════════════════════════╝\n', colors.green + colors.bold);
}

setup().catch(console.error);
