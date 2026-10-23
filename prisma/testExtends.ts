import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient().$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      return query(args);
    },
  },
});

async function main() {
  const c = await client.creator.findFirst();
  console.log('Successfully queried with extended client! ID:', c?.id);
  await client.$disconnect();
}

main().catch(console.error);
