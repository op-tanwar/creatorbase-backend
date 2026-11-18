import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function main() {
  const total = await prisma.creator.count();
  const ytCount = await prisma.creator.count({ where: { platform: 'YOUTUBE' } });
  const igCount = await prisma.creator.count({ where: { platform: 'INSTAGRAM' } });
  
  const lowFollowers = await prisma.creator.count({ where: { followerCount: { lt: 5000 } } });
  const lowEngagement = await prisma.creator.count({ where: { engagementRate: { lt: 1.0 } } });
  
  console.log({
    total,
    ytCount,
    igCount,
    lowFollowers,
    lowEngagement,
  });

  const sampleYt = await prisma.creator.findMany({
    where: { platform: 'YOUTUBE' },
    take: 5,
    select: { id: true, handle: true, fullName: true, followerCount: true, profileUrl: true }
  });
  console.log('Sample YouTube creators:', sampleYt);

  const sampleIg = await prisma.creator.findMany({
    where: { platform: 'INSTAGRAM' },
    take: 5,
    select: { id: true, handle: true, fullName: true, followerCount: true, profileUrl: true }
  });
  console.log('Sample Instagram creators:', sampleIg);
}

main().catch(console.error).finally(() => prisma.$disconnect());
