import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import prisma, { connectWithRetry } from './utils/prisma';

const app = express();

// Enable HTTP Gzip/Brotli response compression for high throughput & sub-second TTFB
app.use(compression());

// Security Middlewares: enable cross-origin resource access for assets/downloads
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Collect and sanitize allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

if (config.frontendUrl) {
  config.frontendUrl
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .forEach((url) => {
      if (url && !allowedOrigins.includes(url)) {
        allowedOrigins.push(url);
      }
    });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin.endsWith('.railway.app') ||
        cleanOrigin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }
      // In production, allow all configured or pass through
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
  })
);

// Explicit OPTIONS preflight handler compatible with Express 5
app.options(/.*/, cors());

// Logging & Body Parsers
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf ? buf.toString() : '';
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Root healthcheck & API routes
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to CreatorBase API - Indian Influencer Discovery & Campaign Management SaaS Platform',
    version: '1.0.0',
    docs: '/api/health',
  });
});

app.use('/api', routes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errors: null,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 CreatorBase Backend API running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Frontend URL: ${config.frontendUrl}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);

  // Verify and establish database connectivity with retry
  await connectWithRetry(3, 1500);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('Gracefully terminating CreatorBase server...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected. Server closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
