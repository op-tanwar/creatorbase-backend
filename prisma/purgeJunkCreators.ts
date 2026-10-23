import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

const GENERIC_OR_CORRUPT_NAMES = [
  'user',
  'test',
  'creator',
  'dummy',
  'mock',
  'mock creator',
  'null',
  'undefined',
  'instagram user',
  'no loft no gift',
];

const DUMMY_HANDLE_PATTERNS = [
  'dummy_',
  'mock_',
  'test_',
  'mumbai_tech_review',
  'delhi_style_file',
  'bhopal_zaika_siddharth',
  'bengaluru_coder_tanvi',
  'jaipur_wanderlust_kabir',
  'pune_fitness_rohan',
  'indore_zaika_explore',
  'ahmedabad_couture_diya',
];

async function main() {
  console.log('\n====================================================================');
  console.log('🛡️  CreatorBase Audience Authenticity & Quality Purge Engine');
  console.log('====================================================================');
  console.log('Scanning database for dead, fake, inactive & low-quality accounts...\n');

  const initialCount = await prisma.creator.count();
  console.log(`📊 Initial Creators In Database: ${initialCount}`);

  // Fetch all creators to perform granular rule verification
  const allCreators = await prisma.creator.findMany({
    select: {
      id: true,
      handle: true,
      fullName: true,
      avatarUrl: true,
      followerCount: true,
      engagementRate: true,
      postsCount: true,
      city: true,
      niche: true,
      platform: true,
    },
  });

  const toDeleteIds: string[] = [];
  const purgeReasons: Record<string, number> = {
    'Follower count < 5,000': 0,
    'Engagement rate < 1.0%': 0,
    'Pod / bot fraud ER (> 20% on > 50k followers)': 0,
    'Inactive (< 15 posts/videos)': 0,
    'Generic / corrupt name or placeholder': 0,
    'Missing or invalid avatarUrl': 0,
    'Corrupted or test handle': 0,
    'Unindexed or unknown city/niche': 0,
  };

  for (const c of allCreators) {
    let shouldDelete = false;

    // Rule 1: Minimum Follower Threshold (5,000)
    if (c.followerCount < 5000) {
      purgeReasons['Follower count < 5,000']++;
      shouldDelete = true;
    }

    // Rule 2: Minimum Engagement Rate Gate (1.0% floor)
    if (c.engagementRate < 1.0) {
      purgeReasons['Engagement rate < 1.0%']++;
      shouldDelete = true;
    } else if (c.followerCount > 50000 && c.engagementRate > 20.0) {
      purgeReasons['Pod / bot fraud ER (> 20% on > 50k followers)']++;
      shouldDelete = true;
    }

    // Rule 3: Activity & Completeness Gate (>= 15 posts)
    if ((c.postsCount ?? 0) < 15) {
      purgeReasons['Inactive (< 15 posts/videos)']++;
      shouldDelete = true;
    }

    // Rule 4: Generic or corrupt fullName
    const cleanName = (c.fullName || '').trim().toLowerCase();
    if (!cleanName || cleanName.length < 2 || GENERIC_OR_CORRUPT_NAMES.includes(cleanName)) {
      purgeReasons['Generic / corrupt name or placeholder']++;
      shouldDelete = true;
    }

    // Rule 5: Missing or invalid avatarUrl
    if (!c.avatarUrl || c.avatarUrl.trim() === '' || c.avatarUrl === 'null' || c.avatarUrl === 'undefined') {
      purgeReasons['Missing or invalid avatarUrl']++;
      shouldDelete = true;
    }

    // Rule 6: Corrupted or test handle
    const cleanHandle = (c.handle || '').trim().toLowerCase();
    if (
      !cleanHandle ||
      cleanHandle.length < 2 ||
      DUMMY_HANDLE_PATTERNS.some((pat) => cleanHandle.includes(pat))
    ) {
      purgeReasons['Corrupted or test handle']++;
      shouldDelete = true;
    }

    // Rule 7: Unindexed city or niche
    if (!c.city || c.city === 'Unknown' || c.city === 'All' || !c.niche || c.niche === 'Unknown' || c.niche === 'All') {
      purgeReasons['Unindexed or unknown city/niche']++;
      shouldDelete = true;
    }

    if (shouldDelete) {
      toDeleteIds.push(c.id);
    }
  }

  console.log(`\n🚨 Identified ${toDeleteIds.length} non-compliant / low-quality creator records.`);

  if (toDeleteIds.length > 0) {
    console.log('\nBreakdown of Quality Gate Violations:');
    for (const [reason, count] of Object.entries(purgeReasons)) {
      if (count > 0) {
        console.log(`  ❌ ${reason.padEnd(48)}: ${count} occurrences`);
      }
    }

    // Execute batch delete
    const deleteResult = await prisma.creator.deleteMany({
      where: {
        id: { in: toDeleteIds },
      },
    });

    console.log(`\n🧹 Successfully deleted ${deleteResult.count} junk / inactive records.`);
  } else {
    console.log('✨ All current creators already meet strict quality thresholds.');
  }

  const finalCount = await prisma.creator.count();
  const finalIg = await prisma.creator.count({ where: { platform: Platform.INSTAGRAM } });
  const finalYt = await prisma.creator.count({ where: { platform: Platform.YOUTUBE } });

  console.log('\n====================================================================');
  console.log('✅ QUALITY PURGE COMPLETE - VERIFIED RETENTION SUMMARY');
  console.log('====================================================================');
  console.log(`🔒 Total Verified Authentic Creators In Database : ${finalCount}`);
  console.log(`   - Verified Instagram Creators                : ${finalIg}`);
  console.log(`   - Verified YouTube Channels                  : ${finalYt}`);
  console.log(`🛡️  All remaining profiles have >= 5,000 real reach, valid ER, 15+ posts.`);
  console.log('====================================================================\n');
}

main()
  .catch((err) => {
    console.error('Fatal Purge Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
