import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function testUserFind() {
  console.log('Testing prisma.user.findUnique...');
  const user = await prisma.user.findFirst();
  console.log('User found:', user?.email);
}

testUserFind()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
