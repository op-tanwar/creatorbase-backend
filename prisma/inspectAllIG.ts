import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function listIGCreators() {
  const igCreators = await prisma.creator.findMany({
    where: { platform: 'INSTAGRAM' },
    select: {
      id: true,
      fullName: true,
      handle: true,
      followerCount: true,
      city: true,
      niche: true,
    },
    take: 30,
    orderBy: { followerCount: 'desc' },
  });

  console.log(`Top 30 Instagram creators:`);
  for (const c of igCreators) {
    console.log(`${c.id} | ${c.fullName} | handle: @${c.handle} | followers: ${c.followerCount}`);
  }
}

listIGCreators()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
