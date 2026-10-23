import prisma from '../src/utils/prisma';
import { CreatorService } from '../src/services/creatorService';
import { REAL_INDIAN_CREATOR_REGISTRY } from '../src/services/apifyService';

function formatFollowers(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function renderProgressBar(current: number, total: number, width = 25): string {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((width * current) / total);
  const bar = '='.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '>' : '') + ' '.repeat(Math.max(0, width - filled));
  return `[${bar}] ${percent.toString().padStart(3, ' ')}%`;
}

async function main() {
  console.log('\n====================================================================');
  console.log('🚀 CreatorBase Real Indian Influencer Bulk Ingestion Engine');
  console.log('====================================================================');
  console.log(`📍 Indexed Registry Target: ${REAL_INDIAN_CREATOR_REGISTRY.length} verified creators`);
  console.log(`📡 Ingestion Engine: Apify Actor apify/instagram-profile-scraper`);
  console.log(`⚙️  PostgreSQL Database: Neon Serverless AWS ap-southeast-1\n`);

  console.log('🧹 Step 1: Cleaning legacy dummy mock data...');
  const cleanedCount = await CreatorService.cleanDummyCreators();
  console.log(`   Removed ${cleanedCount} legacy mock creator records.\n`);

  console.log('⚡ Step 2: Ingesting verified Indian creators in sequential batches...');
  const startTime = Date.now();

  const result = await CreatorService.bulkSeedApifyCreators(
    undefined,
    10, // 10 handles per batch
    (current, total, creator) => {
      const bar = renderProgressBar(current, total);
      const followers = formatFollowers(creator.followerCount);
      const handleTag = `@${creator.handle}`.padEnd(25, ' ');
      const cityNiche = `(${creator.city} • ${creator.niche})`.padEnd(25, ' ');
      console.log(`   ${bar} [${current.toString().padStart(2, ' ')}/${total}] ${handleTag} ${cityNiche} ${followers} followers | ER ${creator.engagementRate}%`);
    }
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Group metrics summary
  const totalInDb = await prisma.creator.count();
  const cityStats = await prisma.creator.groupBy({
    by: ['city'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  const nicheStats = await prisma.creator.groupBy({
    by: ['niche'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\n====================================================================');
  console.log('🎉 BULK INGESTION COMPLETED SUCCESSFULLY');
  console.log('====================================================================');
  console.log(`⏱️  Duration: ${durationSec} seconds`);
  console.log(`✅ Total Verified Creators In Database: ${totalInDb}`);
  console.log('\n📊 Geographic Distribution:');
  for (const c of cityStats) {
    console.log(`   - ${c.city.padEnd(16, ' ')}: ${c._count.id} creators`);
  }
  console.log('\n🏷️  Niche Distribution:');
  for (const n of nicheStats) {
    console.log(`   - ${n.niche.padEnd(16, ' ')}: ${n._count.id} creators`);
  }
  console.log('====================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Bulk ingestion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
