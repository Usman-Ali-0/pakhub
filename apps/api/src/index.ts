import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

import { config } from './config';
import { initSocket } from './lib/socket';
import routes from './routes/index';
import { errorHandler, notFound } from './middleware/error.middleware';
import { authenticate, optionalAuth, AuthRequest } from './middleware/auth.middleware';
import { getRepoPath } from './services/git.service';
import prisma from './lib/prisma';

const app = express();
app.set('trust proxy', 1);
const httpServer = http.createServer(app);

// ─────────────────────────────────────────────────────────
// Initialize Socket.IO
// ─────────────────────────────────────────────────────────
initSocket(httpServer);

// ─────────────────────────────────────────────────────────
// Ensure repos directory exists
// ─────────────────────────────────────────────────────────
const reposDir = path.resolve(config.git.reposPath);
if (!fs.existsSync(reposDir)) fs.mkdirSync(reposDir, { recursive: true });

// ─────────────────────────────────────────────────────────
// Core Middleware
// ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan(config.isDev ? 'dev' : 'combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─────────────────────────────────────────────────────────
// Git Smart HTTP Protocol Handler
// Handles: git clone, git push, git pull over HTTP
// Route: /git/:owner/:repo.git/...
// ─────────────────────────────────────────────────────────
app.use('/git/:owner/:repo.git', optionalAuth, async (req: AuthRequest, res, next) => {
  const { owner, repo } = req.params;

  // Strip .git suffix if present in repo name
  const repoName = repo.replace(/\.git$/, '');

  // Look up repo in DB
  const ownerUser = await prisma.user.findUnique({ where: { username: owner } }).catch(() => null);
  if (!ownerUser) return res.status(404).send('Repository not found\n');

  const repository = await prisma.repository.findFirst({
    where: { ownerId: ownerUser.id, name: repoName },
  }).catch(() => null);

  if (!repository) return res.status(404).send('Repository not found\n');

  // Check access for private repos
  if (repository.isPrivate && req.user?.id !== ownerUser.id) {
    return res.status(401).set('WWW-Authenticate', 'Basic realm="PakHub"').send('Authentication required\n');
  }

  const repoPath = getRepoPath(owner, repoName);

  if (!fs.existsSync(repoPath)) {
    return res.status(404).send('Repository not found on disk\n');
  }

  // Set env for git-http-backend
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_PROJECT_ROOT: path.resolve(config.git.reposPath, owner),
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: req.path,
    REQUEST_METHOD: req.method,
    QUERY_STRING: new URLSearchParams(req.query as any).toString(),
    CONTENT_TYPE: req.headers['content-type'] || '',
    HTTP_GIT_PROTOCOL: req.headers['git-protocol'] as string || '',
    GIT_HTTP_BACKEND_INFO_REFS: '',
  };

  const gitBackend = spawn('git', ['http-backend'], { env });

  // Pipe request body to git
  req.pipe(gitBackend.stdin);

  let headersParsed = false;
  let buffer = Buffer.alloc(0);

  gitBackend.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    if (!headersParsed) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      headersParsed = true;
      const headerStr = buffer.slice(0, headerEnd).toString('utf8');
      const body = buffer.slice(headerEnd + 4);

      // Parse headers
      for (const line of headerStr.split('\r\n')) {
        const [key, ...vals] = line.split(': ');
        if (key && vals.length) {
          if (key.toLowerCase() === 'status') {
            const statusCode = parseInt(vals[0].split(' ')[0]);
            res.status(statusCode);
          } else {
            res.setHeader(key, vals.join(': '));
          }
        }
      }

      if (body.length > 0) res.write(body);
    } else {
      res.write(chunk);
    }
  });

  gitBackend.stdout.on('end', () => res.end());
  gitBackend.stderr.on('data', (d: Buffer) => {
    if (config.isDev) console.error('[git-http-backend]', d.toString());
  });
  gitBackend.on('error', (err) => {
    console.error('git http-backend spawn error:', err);
    if (!res.headersSent) res.status(500).send('Git server error\n');
  });
});

// ─────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api', routes);

// ─────────────────────────────────────────────────────────
// 404 & Error Handlers
// ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────
const PORT = config.app.port;
httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        PISA-HUB API Server               ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  API:     http://localhost:${PORT}/api      ║`);
  console.log(`║  Health:  http://localhost:${PORT}/api/health║`);
  console.log(`║  Git:     http://localhost:${PORT}/git/...  ║`);
  console.log(`║  Mode:    ${config.env.padEnd(30)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

export { app, httpServer };
