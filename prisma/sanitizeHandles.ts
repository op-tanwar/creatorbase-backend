import prisma from '../src/utils/prisma';

export function cleanHandle(raw: string, platform: 'INSTAGRAM' | 'YOUTUBE' | string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // If it's a full URL, strip domain and path prefixes
  // e.g. https://www.instagram.com/therock/?hl=en -> therock
  // e.g. https://www.youtube.com/@CarryMinati -> CarryMinati
  // e.g. https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw -> UC-lHJZR3Gqxm24_Vd_AJ5Yw
  str = str.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|youtube\.com)\/?/i, '');
  str = str.replace(/^(?:channel\/|c\/|user\/)/i, '');
  str = str.replace(/\?.*$/, ''); // strip query params
  str = str.replace(/\/+$/, ''); // strip trailing slashes
  str = str.replace(/^@+/, ''); // strip leading @
  str = str.replace(/%20/g, ''); // strip encoded spaces
  str = str.replace(/[\s\t\r\n]+/g, ''); // strip all whitespace

  if (platform === 'INSTAGRAM') {
    // Valid Instagram characters: letters, numbers, periods, underscores
    str = str.replace(/[^a-zA-Z0-9._]/g, '');
  } else {
    // Valid YouTube characters: letters, numbers, periods, underscores, dashes
    str = str.replace(/[^a-zA-Z0-9._-]/g, '');
  }

  return str.trim();
}

export function buildPlatformUrl(handle: string, platform: 'INSTAGRAM' | 'YOUTUBE' | string): string {
  const clean = cleanHandle(handle, platform);
  if (platform === 'YOUTUBE') {
    if (clean.startsWith('UC') && clean.length === 24) {
      return `https://www.youtube.com/channel/${clean}`;
    }
    return `https://www.youtube.com/@${clean}`;
  }
  return `https://www.instagram.com/${clean}/`;
}

async function sanitizeAllHandles() {
  console.log('=====================================================');
  console.log('🧹 Starting CreatorBase Handle Sanitization Pipeline');
  console.log('=====================================================');

  const creators = await prisma.creator.findMany({
    select: {
      id: true,
      handle: true,
      platform: true,
      fullName: true,
      city: true,
      niche: true,
    },
  });

  console.log(`📊 Found ${creators.length} total creator records in database.`);

  let auditedCount = 0;
  let cleanedCount = 0;
  const sampleCleaned: { original: string; cleaned: string; url: string }[] = [];
  const existingHandles = new Set(creators.map((c) => c.handle.toLowerCase()));

  for (const creator of creators) {
    auditedCount++;
    const original = creator.handle;
    let target = cleanHandle(original, creator.platform);

    if (!target) {
      target = `creator_${creator.id.slice(0, 8)}`;
    }

    // Only update if handle has changed
    if (target !== original) {
      // Check for collision with another record
      if (existingHandles.has(target.toLowerCase()) && target.toLowerCase() !== original.toLowerCase()) {
        target = `${target}_${creator.id.slice(0, 4)}`;
      }

      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          handle: target,
        },
      });

      existingHandles.delete(original.toLowerCase());
      existingHandles.add(target.toLowerCase());

      cleanedCount++;
      if (sampleCleaned.length < 10) {
        sampleCleaned.push({
          original,
          cleaned: target,
          url: buildPlatformUrl(target, creator.platform),
        });
      }
    }
  }

  console.log('-----------------------------------------------------');
  console.log(`✅ Sanitization Complete:`);
  console.log(`   Total Audited: ${auditedCount}`);
  console.log(`   Total Updated: ${cleanedCount}`);
  console.log(`   Already Clean: ${auditedCount - cleanedCount}`);
  console.log('-----------------------------------------------------');

  if (sampleCleaned.length > 0) {
    console.log('🔍 Sample Updated Handles:');
    sampleCleaned.forEach((s, idx) => {
      console.log(`   ${idx + 1}. "${s.original}" -> "${s.cleaned}" | ${s.url}`);
    });
  }

  // Pick 5 random creators from database to verify generated URLs
  const sampleVerification = await prisma.creator.findMany({
    take: 5,
    orderBy: { followerCount: 'desc' },
  });

  console.log('\n🌐 Sample Top Creators Live URLs:');
  sampleVerification.forEach((c) => {
    console.log(`   - [${c.platform}] @${c.handle} (${c.fullName}): ${buildPlatformUrl(c.handle, c.platform)}`);
  });
  console.log('=====================================================');
}

sanitizeAllHandles()
  .catch((err) => {
    console.error('❌ Sanitization failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
