import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function listYTCreators() {
  const ytCreators = await prisma.creator.findMany({
    where: { platform: 'YOUTUBE' },
    select: {
      id: true,
      fullName: true,
      handle: true,
      followerCount: true,
      city: true,
      niche: true,
    },
    orderBy: { followerCount: 'desc' },
  });

  console.log(`Total YouTube creators: ${ytCreators.length}`);
  for (const c of ytCreators) {
    console.log(`${c.id} | ${c.fullName} | handle: @${c.handle} | subs: ${c.followerCount}`);
  }
}

listYTCreators()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
