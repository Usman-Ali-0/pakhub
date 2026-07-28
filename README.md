# PakHub 🚀

> A GitHub-equivalent, AI-powered code collaboration platform built for developers worldwide.

**Live:** [http://157.245.153.76:3000](http://157.245.153.76:3000) · **GitHub:** [Usman-Ali-0/pakhub](https://github.com/Usman-Ali-0/pakhub)

## ✨ Features

### Core Platform
- 🗂️ **Git Hosting** — Real `git push`, `git pull`, `git clone` over HTTP
- 📦 **ZIP Upload** — Import entire projects by uploading a `.zip` file
- 👥 **Collaboration** — Issues, Pull Requests, Code Review, Releases
- 🔍 **Full-text Search** — Repositories, users, issues
- ⭐ **Social** — Stars, forks, follows, notifications

### CI/CD Pipelines (GitHub Actions-compatible)
- ⚡ **Workflows** — Define pipelines in `.pakhub/workflows/` or `.github/workflows/`
- 🔄 **Auto-trigger** — Runs on push, pull request, or manual dispatch
- 📊 **Run logs** — View job status, step output, and full logs
- 🎯 **YAML format** — Same syntax as GitHub Actions

### AI Integration (BYOAI)
- 🤖 **Bring Your Own AI** — Connect OpenAI (GPT-4o), Anthropic (Claude Opus/Sonnet), Google Gemini, Groq, Mistral, Cohere, Ollama, or any custom API
- 🔑 **Encrypted API keys** — AES-256 encrypted at rest
- 💬 **AI Chat** — Ask questions about your code
- ✨ **AI Code Review** — Automatic PR review and summaries
- 📝 **Commit messages** — AI-generated conventional commits
- ⚡ **Copilot** — Inline code completion

### Multi-Language UI (20+ languages)
- 🌍 **English, Urdu, Pashto**, Arabic, Hindi, Persian, Turkish, Bengali, Punjabi
- 🇫🇷 French, German, Spanish, Portuguese, Russian, Chinese, Japanese, Korean
- 🇮🇩 Indonesian, Malay, Swahili — and more
- ↔️ **RTL support** for Urdu, Pashto, Arabic, Persian

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache/Queue | Redis 7 + BullMQ |
| Storage | MinIO (S3-compatible) |
| Realtime | Socket.IO |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+, pnpm 9+, Docker, Git

### Local Development
```bash
git clone https://github.com/Usman-Ali-0/pakhub.git
cd pakhub
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:push
pnpm db:seed
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- MinIO Console: http://localhost:9001

### Default Accounts
| Username | Password | Role |
|---|---|---|
| `admin` | `Admin123!` | Administrator |
| `demo` | `Demo123!` | Regular user |

## 🐳 Production Deployment

### Deploy to server (157.245.153.76)
```bash
# Linux/Mac
chmod +x scripts/deploy.sh
./scripts/deploy.sh root@157.245.153.76

# Windows PowerShell
.\scripts\deploy.ps1
```

Or manually on the server:
```bash
git clone https://github.com/Usman-Ali-0/pakhub.git /opt/pakhub
cd /opt/pakhub
cp .env.example .env
# Edit .env with production secrets
docker compose up -d --build
docker compose exec api npx prisma db push
docker compose exec api npx tsx prisma/seed.ts
```

## 📋 CI/CD Workflow Example

Create `.pakhub/workflows/ci.yml` in your repository:

```yaml
name: CI Pipeline
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Install
        run: npm install
      - name: Test
        run: npm test
      - name: Build
        run: npm run build
```

## 🤖 AI Setup

1. Go to **Settings → AI Providers**
2. Select your provider (OpenAI, Anthropic, Google, Groq, etc.)
3. Enter your API key and choose a model (GPT-4o, Claude Opus, Gemini, etc.)
4. Use AI Chat, PR reviews, and code completion

## 🌐 Language Settings

Click the **globe icon** in the navbar or go to **Settings → Language** to switch between 20+ languages including Urdu (اردو) and Pashto (پښتو).

## 📁 Project Structure

```
pakhub/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend + Git server
├── packages/shared/    # Shared TypeScript types
├── scripts/          # Deployment scripts
├── .pakhub/workflows/# Example CI/CD workflows
└── docker-compose.yml
```

## 📄 License

MIT License
