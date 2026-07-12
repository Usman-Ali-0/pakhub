# PISA-HUB 🚀

> A GitHub-equivalent, AI-powered code collaboration platform built for the modern developer.

![PISA-HUB Banner](./docs/banner.png)

## ✨ Features

- 🗂️ **Git Hosting** — Real `git push`, `git pull`, `git clone` over HTTP & SSH
- 👥 **Collaboration** — Issues, Pull Requests, Code Review, Discussions
- 🤖 **PISA Copilot** — Built-in free AI code completion (no API key needed for users)
- 🧠 **AI Code Review** — Automatic PR review powered by Gemini 2.5 Flash
- 🔑 **BYOAI** — Users can plug in their own Claude, GPT-4, Gemini, Groq, or any AI key
- ⚡ **CI/CD** — GitHub Actions-equivalent pipeline runner (Phase 2)
- 📦 **Package Registry** — npm, Docker image hosting (Phase 2)
- 🌐 **PISA Pages** — Static site hosting from repos (Phase 2)
- 🔍 **Full-text Search** — Code, repos, issues, users
- 📊 **Analytics** — Contributor graphs, traffic, insights

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis 7 |
| Search | Elasticsearch 8 |
| Storage | MinIO (S3-compatible) |
| AI | Google Gemini 2.5 Flash + Groq Llama 4 Scout |
| Realtime | Socket.IO |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop (running)
- Git

### 1. Clone & Install
```bash
git clone https://github.com/your-org/pisa-hub.git
cd pisa-hub
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values (especially AI API keys)
```

### 3. Start Infrastructure
```bash
pnpm docker:up
# This starts PostgreSQL, Redis, MinIO, Elasticsearch
```

### 4. Setup Database
```bash
pnpm db:push   # Push Prisma schema to PostgreSQL
pnpm db:seed   # Create admin and demo user
```

### 5. Start Development Servers
```bash
pnpm dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# MinIO UI: http://localhost:9001
# Email UI: http://localhost:8025
```

### 6. Default Accounts
| Username | Email | Password | Role |
|---|---|---|---|
| `admin` | admin@pisahub.com | `Admin123!` | Administrator |
| `demo` | demo@pisahub.com | `Demo123!` | Regular user |

## 🤖 AI Setup (Free)

PISA-HUB comes with built-in free AI. Get your free API keys:

1. **Gemini** (for code review, PR summaries, AI chat):
   - Go to [aistudio.google.com](https://aistudio.google.com)
   - Click "Get API Key" → "Create API key"
   - Add to `.env`: `GEMINI_API_KEY=your-key`

2. **Groq** (for Copilot completions — ultra fast):
   - Go to [console.groq.com](https://console.groq.com)
   - Create account → API Keys → Create key
   - Add to `.env`: `GROQ_API_KEY=your-key`

## 🐳 Git Clone via HTTP

After setup, users can clone repos like this:
```bash
git clone http://localhost:4000/git/username/repo-name.git
```

## 📁 Project Structure

```
pisa-hub/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   └── api/          # Express backend + Git server
├── packages/
│   └── shared/       # Shared TypeScript types
├── repos/            # Bare git repositories (auto-created)
├── docker-compose.yml
├── turbo.json
└── package.json
```

## 📋 Roadmap

- [x] Phase 1 — Core Platform (Auth, Git, Issues, PRs, AI)
- [ ] Phase 2 — CI/CD, Search, Packages, Pages
- [ ] Phase 3 — Discussions, Gists, Analytics
- [ ] Phase 4 — Advanced AI, Security Scanning
- [ ] Phase 5 — Enterprise (SSO, Billing)
- [ ] Phase 6 — Mobile App, CLI, VS Code Extension

## 📄 License

MIT License — see [LICENSE](./LICENSE)
