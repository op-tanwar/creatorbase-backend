import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function check() {
  const records = await prisma.creator.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Total Gaming', mode: 'insensitive' } },
        { handle: { contains: 'totalgaming', mode: 'insensitive' } },
        { fullName: { contains: 'Tech Burner', mode: 'insensitive' } },
        { fullName: { contains: 'CarryMinati', mode: 'insensitive' } },
        { fullName: { contains: 'Geekyranjit', mode: 'insensitive' } },
        { fullName: { contains: 'Triggered Insaan', mode: 'insensitive' } },
        { fullName: { contains: 'Mortal', mode: 'insensitive' } },
        { fullName: { contains: 'Technical Guruji', mode: 'insensitive' } },
        { followerCount: { gte: 10000000 } },
      ],
    },
  });

  console.log(`Found ${records.length} records matching marquee query:`);
  for (const r of records) {
    console.log({
      id: r.id,
      fullName: r.fullName,
      handle: r.handle,
      platform: r.platform,
      followers: r.followerCount,
      profileUrl: r.profileUrl,
      verified: r.isVerified,
    });
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
