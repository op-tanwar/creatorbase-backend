import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function main() {
  const c = await prisma.creator.findFirst();
  console.log('Creator object keys:', Object.keys(c || {}));
}

main().catch(console.error).finally(() => prisma.$disconnect());
