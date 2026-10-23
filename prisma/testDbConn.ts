import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

async function testConnection(url: string, name: string) {
  console.log(`\nTesting connection to [${name}]...`);
  const client = new PrismaClient({
    datasources: { db: { url } },
  });
  try {
    const start = Date.now();
    await client.$connect();
    const count = await client.creator.count();
    console.log(`✅ [${name}] Connected in ${Date.now() - start}ms! Total creators: ${count}`);
    return true;
  } catch (err: any) {
    console.error(`❌ [${name}] Error:`, err.message || err);
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const currentUrl = process.env.DATABASE_URL || '';
  console.log('Current URL hostname:', currentUrl.replace(/:\/\/.*@/, '://<credentials>@'));

  // Test direct current URL
  await testConnection(currentUrl, 'Current URL');

  // Test with -pooler
  if (currentUrl.includes('neon.tech') && !currentUrl.includes('-pooler')) {
    const poolerUrl = currentUrl.replace('.ap-southeast-1.aws.neon.tech', '-pooler.ap-southeast-1.aws.neon.tech');
    await testConnection(poolerUrl, 'Neon Pooler Endpoint');
  }
}

main();
