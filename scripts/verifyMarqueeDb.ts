import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';
import { ApifyService } from '../src/services/apifyService';

async function main() {
  // Update Rachana Ranade handle if needed
  const rOld = await prisma.creator.findFirst({
    where: { handle: { equals: 'rachanaranade', mode: 'insensitive' } }
  });
  if (rOld) {
    await prisma.creator.update({
      where: { id: rOld.id },
      data: {
        handle: 'CARachanaRanade',
        profileUrl: 'https://www.youtube.com/@CARachanaRanade',
        isVerifiedAuthentic: true,
        lastVerifiedAt: new Date(),
      }
    });
    console.log('✅ Updated Rachana Ranade to @CARachanaRanade');
  }

  // Clean duplicate old handles
  const hOld = await prisma.creator.findFirst({
    where: { handle: 'harshbeniwal' }
  });
  if (hOld) {
    await prisma.creator.delete({ where: { id: hOld.id } });
    console.log('✅ Cleaned legacy @harshbeniwal in favor of canonical @harshbeniwal21');
  }

  const sOld = await prisma.creator.findFirst({
    where: { handle: 'scoutop' }
  });
  if (sOld) {
    await prisma.creator.delete({ where: { id: sOld.id } });
    console.log('✅ Cleaned legacy @scoutop in favor of canonical @scoutofficial');
  }

  // Check marquee creators: Total Gaming, Tech Burner, CarryMinati, Geekyranjit, and top regional creators
  const marqueeChecks = [
    'TotalGaming093',
    'CarryMinati',
    'TechBurner',
    'geekyranjit',
    'technogamerz',
    'Round2hell',
    'ashishchanchlanivines',
    'souravjvlogs',
    'BBKiVines',
    'TechnicalGuruji',
    'triggeredinsaan',
    'harshbeniwal21',
    'mythpat',
    'trakintech',
    'kabitaskitchen',
    'bharatzkitchenHINDI',
    'PhysicsWallah',
    'dynamogaming',
    'FlyingBeast320',
    'SlayyPointOfficial',
    'ZakirKhan',
    'sanjeevkapoorkhazana',
    'FitTuber',
    'RanveerBrar',
    'MortaLyt',
    'foodieincarnate',
    'JONATHANGAMINGYT',
    'pranjalkamra',
    'CodeWithHarry',
    'anubhavsinghbassi',
    'yourfoodlab',
    'RohitKhatriFitness',
    'TechBar',
    'TanmayBhatYT',
    'scoutofficial',
    'SwadOfficial',
    'SamayRainaOfficial',
    'LabourLawAdvisor',
    'CARachanaRanade',
    // Instagram creators
    'theformaledit',
    'komalpandeyofficial',
    'foodie_incarnate',
    'indorefoodexplorer',
    'indori_foodie_rahul',
    'nagarkarnaman',
    'indorediaries',
  ];

  console.log(`\nVerifying ${marqueeChecks.length} key creators in Neon PostgreSQL:`);
  const records = await prisma.creator.findMany({
    where: {
      handle: { in: marqueeChecks, mode: 'insensitive' }
    },
    select: {
      handle: true,
      fullName: true,
      platform: true,
      followerCount: true,
      profileUrl: true,
      engagementRate: true,
      businessEmail: true,
      isVerifiedAuthentic: true,
      lastVerifiedAt: true,
    }
  });

  console.table(
    records.slice(0, 25).map(r => ({
      Handle: `@${r.handle}`,
      Platform: r.platform,
      Name: r.fullName,
      Reach: `${(r.followerCount / 1e6).toFixed(2)}M`,
      ER: `${r.engagementRate}%`,
      Email: r.businessEmail || 'DM',
      'Canonical URL': r.profileUrl,
      'Live Audited': r.isVerifiedAuthentic,
    }))
  );

  console.log(`\nTotal Matched in DB: ${records.length} / ${marqueeChecks.length}`);

  // Test live HTTP checks on marquee URLs
  const sampleUrls = [
    'https://www.youtube.com/@TotalGaming093',
    'https://www.youtube.com/@CarryMinati',
    'https://www.youtube.com/@TechBurner',
    'https://www.youtube.com/@geekyranjit',
    'https://www.youtube.com/@CARachanaRanade',
    'https://www.youtube.com/@harshbeniwal21',
    'https://www.youtube.com/@scoutofficial',
    'https://www.instagram.com/theformaledit/',
    'https://www.instagram.com/komalpandeyofficial/',
  ];

  console.log('\nTesting live HTTP 200 on sample URLs:');
  for (const url of sampleUrls) {
    const res = await ApifyService.verifyUrlLive(url, 10000);
    console.log(url, res.ok ? '✅ 200 OK' : `❌ Status: ${res.status || res.error}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
