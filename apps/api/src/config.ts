import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  app: {
    name: optional('APP_NAME', 'PISA-HUB'),
    url: optional('APP_URL', 'http://localhost:3000'),
    apiUrl: optional('API_URL', 'http://localhost:4000'),
    port: parseInt(optional('PORT', '4000')),
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-in-production-min-32-chars!!'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    refreshSecret: optional('REFRESH_TOKEN_SECRET', 'dev-refresh-secret-change-in-production!!'),
  },

  database: {
    url: optional('DATABASE_URL', 'postgresql://pisahub:pisahub123@localhost:5432/pisahub'),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },

  minio: {
    endpoint: optional('MINIO_ENDPOINT', 'localhost'),
    port: parseInt(optional('MINIO_PORT', '9000')),
    accessKey: optional('MINIO_ACCESS_KEY', 'pisahub_admin'),
    secretKey: optional('MINIO_SECRET_KEY', 'pisahub_secret_123'),
    useSSL: optional('MINIO_USE_SSL', 'false') === 'true',
    buckets: {
      repos: optional('MINIO_BUCKET_REPOS', 'repos'),
      avatars: optional('MINIO_BUCKET_AVATARS', 'avatars'),
      releases: optional('MINIO_BUCKET_RELEASES', 'releases'),
    },
  },

  git: {
    reposPath: optional('GIT_REPOS_PATH', './repos'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: parseInt(optional('SMTP_PORT', '1025')),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'noreply@pisahub.com'),
  },

  ai: {
    geminiApiKey: optional('GEMINI_API_KEY', ''),
    groqApiKey: optional('GROQ_API_KEY', ''),
    encryptionKey: optional('ENCRYPTION_KEY', 'change-this-key-in-production-32c'),
  },

  ssh: {
    port: parseInt(optional('SSH_PORT', '2222')),
    hostKeyPath: optional('SSH_HOST_KEY_PATH', './ssh_host_key'),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000')),
    max: parseInt(optional('RATE_LIMIT_MAX', '5000')),
  },

  cors: {
    origins: optional('CORS_ORIGINS', 'http://localhost:3000').split(','),
  },
} as const;
