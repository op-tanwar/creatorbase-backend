import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

async function main() {
  const all = await prisma.creator.findMany({
    select: { id: true, handle: true, fullName: true, platform: true, followerCount: true, isVerified: true }
  });

  const synthetic = all.filter(c => 
    /_\d+(_yt)?$/.test(c.handle) ||
    /^(dummy|mock|test)/i.test(c.handle) ||
    /copycat/i.test(c.handle)
  );

  const nonSynthetic = all.filter(c => 
    !/_\d+(_yt)?$/.test(c.handle) &&
    !/^(dummy|mock|test)/i.test(c.handle) &&
    !/copycat/i.test(c.handle)
  );

  console.log({
    total: all.length,
    syntheticCount: synthetic.length,
    nonSyntheticCount: nonSynthetic.length,
  });

  console.log('Sample non-synthetic:', nonSynthetic.slice(0, 20));
}

main().catch(console.error).finally(() => prisma.$disconnect());
