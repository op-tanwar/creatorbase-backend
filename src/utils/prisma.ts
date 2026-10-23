import { PrismaClient } from '@prisma/client';

/**
 * Configure Neon connection pooling & serverless retry parameters
 */
function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Auto-upgrade Neon endpoints to pooled host to avoid serverless cold start drops & connection exhaustion
  if (url.includes('neon.tech') && !url.includes('-pooler')) {
    url = url.replace(/([a-zA-Z0-9-]+)\.([a-zA-Z0-9-]+\.aws\.neon\.tech)/, '$1-pooler.$2');
    if (!url.includes('pgbouncer=true')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}pgbouncer=true`;
    }
  }

  return url;
}

const createPrismaClient = () => {
  const databaseUrl = getSanitizedDatabaseUrl();

  const baseClient = new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

  return baseClient.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const MAX_RETRIES = 3;
        let lastErr: any;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (err: any) {
            lastErr = err;
            const isConnectionError =
              err?.code === 'P1001' ||
              err?.code === 'P1017' ||
              err?.message?.includes('ConnectionReset') ||
              err?.message?.includes('forcibly closed') ||
              err?.message?.includes("Can't reach database server");

            if (isConnectionError && attempt < MAX_RETRIES) {
              console.warn(
                `⚠️  [Neon PostgreSQL Resilience] Transient connection drop on ${model || 'raw'}.${operation} (attempt ${attempt}/${MAX_RETRIES}). Re-establishing...`
              );
              await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
              continue;
            }
            throw err;
          }
        }
        throw lastErr;
      },
    },
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof createPrismaClient>;
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

/**
 * Connect with retry logic for Neon PostgreSQL serverless cold starts and pooling timeouts
 */
export async function connectWithRetry(retries = 3, delayMs = 2000): Promise<boolean> {
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('✅ Connected to PostgreSQL database successfully.');
      return true;
    } catch (err: any) {
      console.warn(
        `⚠️  [Database Connection Attempt ${attempt}/${retries} Failed]:`,
        err?.message || err
      );

      if (attempt < retries) {
        console.log(`⏳ Retrying database connection in ${currentDelay / 1000}s (Neon serverless wake-up)...`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= 1.5;
      } else {
        console.error(
          '❌ [Fatal Error] Could not establish connection to PostgreSQL database after multiple attempts.\n' +
          '   Tip: Verify your DATABASE_URL in .env has sslmode=require and connect_timeout=30.\n' +
          '   If using Neon pooled host, verify project is active in the Neon console.'
        );
      }
    }
  }
  return false;
}

export default prisma;
