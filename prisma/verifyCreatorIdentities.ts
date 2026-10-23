import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';

// Canonical Marquee Verified Directory
export const MARQUEE_VERIFIED_REGISTRY: Record<
  string,
  {
    canonicalHandle: string;
    canonicalUrl: string;
    verifiedSubs: number;
    platform: 'YOUTUBE' | 'INSTAGRAM';
    officialName: string;
  }
> = {
  // YouTube Marquee Creators
  totalgaming: {
    canonicalHandle: 'TotalGaming093',
    canonicalUrl: 'https://www.youtube.com/@TotalGaming093',
    verifiedSubs: 40500000,
    platform: 'YOUTUBE',
    officialName: 'Total Gaming (Ajjubhai)',
  },
  technogamerz: {
    canonicalHandle: 'technogamerz',
    canonicalUrl: 'https://www.youtube.com/@technogamerz',
    verifiedSubs: 41000000,
    platform: 'YOUTUBE',
    officialName: 'Techno Gamerz (Ujjwal Chaurasia)',
  },
  carryminati: {
    canonicalHandle: 'CarryMinati',
    canonicalUrl: 'https://www.youtube.com/@CarryMinati',
    verifiedSubs: 43500000,
    platform: 'YOUTUBE',
    officialName: 'Ajey Nagar | CarryMinati',
  },
  carryislive: {
    canonicalHandle: 'CarryisLive',
    canonicalUrl: 'https://www.youtube.com/@CarryisLive',
    verifiedSubs: 12500000,
    platform: 'YOUTUBE',
    officialName: 'CarryIsLive',
  },
  round2hell: {
    canonicalHandle: 'Round2hell',
    canonicalUrl: 'https://www.youtube.com/@Round2hell',
    verifiedSubs: 33000000,
    platform: 'YOUTUBE',
    officialName: 'Round2Hell',
  },
  ashishchanchlani: {
    canonicalHandle: 'ashishchanchlanivines',
    canonicalUrl: 'https://www.youtube.com/@ashishchanchlanivines',
    verifiedSubs: 30500000,
    platform: 'YOUTUBE',
    officialName: 'Ashish Chanchlani Vines',
  },
  ashishchanchlanivines: {
    canonicalHandle: 'ashishchanchlanivines',
    canonicalUrl: 'https://www.youtube.com/@ashishchanchlanivines',
    verifiedSubs: 30500000,
    platform: 'YOUTUBE',
    officialName: 'Ashish Chanchlani Vines',
  },
  souravjoshivlogs: {
    canonicalHandle: 'souravjvlogs',
    canonicalUrl: 'https://www.youtube.com/@souravjvlogs',
    verifiedSubs: 28500000,
    platform: 'YOUTUBE',
    officialName: 'Sourav Joshi Vlogs',
  },
  bbkiwines: {
    canonicalHandle: 'BBKiVines',
    canonicalUrl: 'https://www.youtube.com/@BBKiVines',
    verifiedSubs: 26500000,
    platform: 'YOUTUBE',
    officialName: 'Bhuvan Bam | BB Ki Vines',
  },
  technicalguruji_yt: {
    canonicalHandle: 'TechnicalGuruji',
    canonicalUrl: 'https://www.youtube.com/@TechnicalGuruji',
    verifiedSubs: 23500000,
    platform: 'YOUTUBE',
    officialName: 'Technical Guruji (Gaurav Chaudhary)',
  },
  triggeredinsaan: {
    canonicalHandle: 'triggeredinsaan',
    canonicalUrl: 'https://www.youtube.com/@triggeredinsaan',
    verifiedSubs: 22500000,
    platform: 'YOUTUBE',
    officialName: 'Nischay Malhan | Triggered Insaan',
  },
  harshbeniwal: {
    canonicalHandle: 'harshbeniwal',
    canonicalUrl: 'https://www.youtube.com/@harshbeniwal',
    verifiedSubs: 16000000,
    platform: 'YOUTUBE',
    officialName: 'Harsh Beniwal',
  },
  mythpat: {
    canonicalHandle: 'mythpat',
    canonicalUrl: 'https://www.youtube.com/@mythpat',
    verifiedSubs: 14500000,
    platform: 'YOUTUBE',
    officialName: 'Mithilesh Patankar | Mythpat',
  },
  trakintech: {
    canonicalHandle: 'trakintech',
    canonicalUrl: 'https://www.youtube.com/@trakintech',
    verifiedSubs: 14500000,
    platform: 'YOUTUBE',
    officialName: 'Trakin Tech (Ershad Kaleebullah)',
  },
  kabitaskitchen: {
    canonicalHandle: 'kabitaskitchen',
    canonicalUrl: 'https://www.youtube.com/@kabitaskitchen',
    verifiedSubs: 13900000,
    platform: 'YOUTUBE',
    officialName: 'Kabita Singh | Kabita’s Kitchen',
  },
  bharatzkitchen: {
    canonicalHandle: 'bharatzkitchenHINDI',
    canonicalUrl: 'https://www.youtube.com/@bharatzkitchenHINDI',
    verifiedSubs: 13000000,
    platform: 'YOUTUBE',
    officialName: 'Bharat Wadhwa | Bharatzkitchen HINDI',
  },
  physicswallah_yt: {
    canonicalHandle: 'PhysicsWallah',
    canonicalUrl: 'https://www.youtube.com/@PhysicsWallah',
    verifiedSubs: 12500000,
    platform: 'YOUTUBE',
    officialName: 'Alakh Pandey | Physics Wallah',
  },
  techburner_yt: {
    canonicalHandle: 'TechBurner',
    canonicalUrl: 'https://www.youtube.com/@TechBurner',
    verifiedSubs: 11200000,
    platform: 'YOUTUBE',
    officialName: 'Tech Burner (Shlok Srivastava)',
  },
  fukrainsaan: {
    canonicalHandle: 'fukrainsaan',
    canonicalUrl: 'https://www.youtube.com/@fukrainsaan',
    verifiedSubs: 11000000,
    platform: 'YOUTUBE',
    officialName: 'Abhishek Malhan | Fukra Insaan',
  },
  dynamogaming: {
    canonicalHandle: 'dynamogaming',
    canonicalUrl: 'https://www.youtube.com/@dynamogaming',
    verifiedSubs: 10000000,
    platform: 'YOUTUBE',
    officialName: 'Aadi Sawant | Dynamo Gaming',
  },
  flyingbeast: {
    canonicalHandle: 'FlyingBeast320',
    canonicalUrl: 'https://www.youtube.com/@FlyingBeast320',
    verifiedSubs: 9200000,
    platform: 'YOUTUBE',
    officialName: 'Gaurav Taneja | Flying Beast',
  },
  slayypoint: {
    canonicalHandle: 'SlayyPointOfficial',
    canonicalUrl: 'https://www.youtube.com/@SlayyPointOfficial',
    verifiedSubs: 9200000,
    platform: 'YOUTUBE',
    officialName: 'Abhyudaya & Gautami | Slayy Point',
  },
  zakirkhan_yt: {
    canonicalHandle: 'ZakirKhan',
    canonicalUrl: 'https://www.youtube.com/@ZakirKhan',
    verifiedSubs: 7800000,
    platform: 'YOUTUBE',
    officialName: 'Zakir Khan',
  },
  sanjeevkapoorkhazana: {
    canonicalHandle: 'sanjeevkapoorkhazana',
    canonicalUrl: 'https://www.youtube.com/@sanjeevkapoorkhazana',
    verifiedSubs: 7400000,
    platform: 'YOUTUBE',
    officialName: 'Chef Sanjeev Kapoor',
  },
  fittuber_yt: {
    canonicalHandle: 'FitTuber',
    canonicalUrl: 'https://www.youtube.com/@FitTuber',
    verifiedSubs: 7400000,
    platform: 'YOUTUBE',
    officialName: 'Fit Tuber Hindi',
  },
  ranveerbrar_yt: {
    canonicalHandle: 'RanveerBrar',
    canonicalUrl: 'https://www.youtube.com/@RanveerBrar',
    verifiedSubs: 7100000,
    platform: 'YOUTUBE',
    officialName: 'Chef Ranveer Brar',
  },
  mortal_gaming: {
    canonicalHandle: 'MortaLyt',
    canonicalUrl: 'https://www.youtube.com/@MortaLyt',
    verifiedSubs: 7100000,
    platform: 'YOUTUBE',
    officialName: 'Naman Mathur | Mortal',
  },
  foodieincarnate_yt: {
    canonicalHandle: 'foodieincarnate',
    canonicalUrl: 'https://www.youtube.com/@foodieincarnate',
    verifiedSubs: 6800000,
    platform: 'YOUTUBE',
    officialName: 'Foodie Incarnate (Amar Sirohi)',
  },
  jonathangaming: {
    canonicalHandle: 'JONATHANGAMINGYT',
    canonicalUrl: 'https://www.youtube.com/@JONATHANGAMINGYT',
    verifiedSubs: 6200000,
    platform: 'YOUTUBE',
    officialName: 'Jonathan Amaral',
  },
  pranjalkamra: {
    canonicalHandle: 'pranjalkamra',
    canonicalUrl: 'https://www.youtube.com/@pranjalkamra',
    verifiedSubs: 5900000,
    platform: 'YOUTUBE',
    officialName: 'Pranjal Kamra | Finology',
  },
  codewithharry: {
    canonicalHandle: 'CodeWithHarry',
    canonicalUrl: 'https://www.youtube.com/@CodeWithHarry',
    verifiedSubs: 5800000,
    platform: 'YOUTUBE',
    officialName: 'Haris Khan | CodeWithHarry',
  },
  bassi_standup: {
    canonicalHandle: 'anubhavsinghbassi',
    canonicalUrl: 'https://www.youtube.com/@anubhavsinghbassi',
    verifiedSubs: 5300000,
    platform: 'YOUTUBE',
    officialName: 'Anubhav Singh Bassi',
  },
  yourfoodlab: {
    canonicalHandle: 'yourfoodlab',
    canonicalUrl: 'https://www.youtube.com/@yourfoodlab',
    verifiedSubs: 5200000,
    platform: 'YOUTUBE',
    officialName: 'Chef Sanjyot Keer | Your Food Lab',
  },
  rohitkhatrifitness_yt: {
    canonicalHandle: 'RohitKhatriFitness',
    canonicalUrl: 'https://www.youtube.com/@RohitKhatriFitness',
    verifiedSubs: 5100000,
    platform: 'YOUTUBE',
    officialName: 'Rohit Khatri Fitness',
  },
  techbar: {
    canonicalHandle: 'TechBar',
    canonicalUrl: 'https://www.youtube.com/@TechBar',
    verifiedSubs: 5100000,
    platform: 'YOUTUBE',
    officialName: 'TechBar',
  },
  tanmaybhat: {
    canonicalHandle: 'TanmayBhatYT',
    canonicalUrl: 'https://www.youtube.com/@TanmayBhatYT',
    verifiedSubs: 5100000,
    platform: 'YOUTUBE',
    officialName: 'Tanmay Bhat',
  },
  scoutop: {
    canonicalHandle: 'scoutop',
    canonicalUrl: 'https://www.youtube.com/@scoutop',
    verifiedSubs: 5000000,
    platform: 'YOUTUBE',
    officialName: 'Tanmay Singh | Scout',
  },
  swadofficial: {
    canonicalHandle: 'SwadOfficial',
    canonicalUrl: 'https://www.youtube.com/@SwadOfficial',
    verifiedSubs: 4900000,
    platform: 'YOUTUBE',
    officialName: 'Gaurav Wasan | Swad Official',
  },
  samayraina: {
    canonicalHandle: 'SamayRainaOfficial',
    canonicalUrl: 'https://www.youtube.com/@SamayRainaOfficial',
    verifiedSubs: 4800000,
    platform: 'YOUTUBE',
    officialName: 'Samay Raina',
  },
  labourlawadvisor: {
    canonicalHandle: 'LabourLawAdvisor',
    canonicalUrl: 'https://www.youtube.com/@LabourLawAdvisor',
    verifiedSubs: 4800000,
    platform: 'YOUTUBE',
    officialName: 'Labour Law Advisor (LLA)',
  },
  rachanaranade: {
    canonicalHandle: 'rachanaranade',
    canonicalUrl: 'https://www.youtube.com/@rachanaranade',
    verifiedSubs: 4800000,
    platform: 'YOUTUBE',
    officialName: 'CA Rachana Phadke Ranade',
  },
  geekyranjit_yt: {
    canonicalHandle: 'geekyranjit',
    canonicalUrl: 'https://www.youtube.com/@geekyranjit',
    verifiedSubs: 3400000,
    platform: 'YOUTUBE',
    officialName: 'Geekyranjit (Ranjit Kumar)',
  },

  // Instagram Marquee Creators
  technicalguruji: {
    canonicalHandle: 'technicalguruji',
    canonicalUrl: 'https://www.instagram.com/technicalguruji/',
    verifiedSubs: 6359571,
    platform: 'INSTAGRAM',
    officialName: 'Gaurav Chaudhary',
  },
  theformaledit: {
    canonicalHandle: 'theformaledit',
    canonicalUrl: 'https://www.instagram.com/theformaledit/',
    verifiedSubs: 2375420,
    platform: 'INSTAGRAM',
    officialName: 'Karron S Dhinggra',
  },
  foodie_incarnate: {
    canonicalHandle: 'foodie_incarnate',
    canonicalUrl: 'https://www.instagram.com/foodie_incarnate/',
    verifiedSubs: 2373050,
    platform: 'INSTAGRAM',
    officialName: 'Amar Sirohi',
  },
  komalpandeyofficial: {
    canonicalHandle: 'komalpandeyofficial',
    canonicalUrl: 'https://www.instagram.com/komalpandeyofficial/',
    verifiedSubs: 2061355,
    platform: 'INSTAGRAM',
    officialName: 'Komal Pandey',
  },
  hyderabad_diaries: {
    canonicalHandle: 'hyderabad_diaries',
    canonicalUrl: 'https://www.instagram.com/hyderabad_diaries/',
    verifiedSubs: 1850000,
    platform: 'INSTAGRAM',
    officialName: 'Hyderabad Diaries',
  },
  rohitkhatrifitness: {
    canonicalHandle: 'rohitkhatrifitness',
    canonicalUrl: 'https://www.instagram.com/rohitkhatrifitness/',
    verifiedSubs: 2732584,
    platform: 'INSTAGRAM',
    officialName: 'Rohit Khatri',
  },
  kushakapila: {
    canonicalHandle: 'kusha.kapila',
    canonicalUrl: 'https://www.instagram.com/kusha.kapila/',
    verifiedSubs: 3600000,
    platform: 'INSTAGRAM',
    officialName: 'Kusha Kapila',
  },
};

export function cleanRawHandle(raw: string, platform: 'INSTAGRAM' | 'YOUTUBE' | string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip URLs
  str = str.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|youtube\.com)\/?/i, '');
  str = str.replace(/^(?:channel\/|c\/|user\/)/i, '');
  str = str.replace(/\?.*$/, ''); // query params
  str = str.replace(/\/+$/, ''); // trailing slashes
  str = str.replace(/^@+/, ''); // leading @
  str = str.replace(/%20/g, ''); // spaces
  str = str.replace(/[\s\t\r\n]+/g, '');

  if (platform === 'INSTAGRAM') {
    str = str.replace(/[^a-zA-Z0-9._]/g, '');
  } else {
    str = str.replace(/[^a-zA-Z0-9._-]/g, '');
  }

  return str.trim();
}

export function buildVerifiedUrl(handle: string, platform: 'INSTAGRAM' | 'YOUTUBE' | string): string {
  const clean = cleanRawHandle(handle, platform);
  if (platform === 'YOUTUBE') {
    if (clean.startsWith('UC') && clean.length === 24) {
      return `https://www.youtube.com/channel/${clean}`;
    }
    return `https://www.youtube.com/@${clean}`;
  }
  return `https://www.instagram.com/${clean}/`;
}

export interface RemediationEntry {
  creatorId: string;
  creatorName: string;
  platform: 'YOUTUBE' | 'INSTAGRAM';
  originalHandle: string;
  remediatedHandle: string;
  verifiedUrl: string;
  subscriberCount: number;
  reason: string;
  actionTaken: 'FIXED_MARQUEE' | 'FIXED_SYNTAX' | 'COLLISION_RESOLVED' | 'VERIFIED_OK';
}

async function verifyAllIdentities() {
  console.log('========================================================================');
  console.log('🛡️  CreatorBase Identity Integrity & Impostor Auto-Remediation Suite');
  console.log('========================================================================\n');

  const allCreators = await prisma.creator.findMany({
    select: {
      id: true,
      fullName: true,
      handle: true,
      platform: true,
      followerCount: true,
      city: true,
      niche: true,
      isVerified: true,
    },
    orderBy: { followerCount: 'desc' },
  });

  console.log(`📊 Ingested ${allCreators.length} total creator records for audit.\n`);

  const remediations: RemediationEntry[] = [];
  const existingHandles = new Set(allCreators.map((c) => c.handle.toLowerCase()));
  let marqueeFixedCount = 0;
  let syntaxFixedCount = 0;
  let totalVerifiedCount = 0;

  for (const creator of allCreators) {
    const rawHandle = creator.handle;
    const lowerHandle = rawHandle.toLowerCase();
    const platform = creator.platform as 'YOUTUBE' | 'INSTAGRAM';
    let targetHandle = cleanRawHandle(rawHandle, platform);
    let action: RemediationEntry['actionTaken'] = 'VERIFIED_OK';
    let reason = 'Canonical format verified.';

    // 1. Check Marquee Registry Mappings
    if (MARQUEE_VERIFIED_REGISTRY[lowerHandle]) {
      const match = MARQUEE_VERIFIED_REGISTRY[lowerHandle];
      if (rawHandle !== match.canonicalHandle) {
        targetHandle = match.canonicalHandle;
        action = 'FIXED_MARQUEE';
        reason = `Impostor/Mismatched handle corrected to official verified handle @${match.canonicalHandle} (${(match.verifiedSubs / 1e6).toFixed(1)}M subs).`;
        marqueeFixedCount++;
      }
    } else {
      // Check if creator full name matches marquee creators
      for (const [key, item] of Object.entries(MARQUEE_VERIFIED_REGISTRY)) {
        if (
          creator.fullName.toLowerCase().includes(item.officialName.toLowerCase().split(' ')[0]) &&
          item.platform === platform &&
          creator.followerCount >= 5000000 &&
          rawHandle !== item.canonicalHandle
        ) {
          targetHandle = item.canonicalHandle;
          action = 'FIXED_MARQUEE';
          reason = `High-reach name matched marquee directory: updated to official verified channel @${item.canonicalHandle}.`;
          marqueeFixedCount++;
          break;
        }
      }
    }

    // 2. Syntax sanitization
    if (action === 'VERIFIED_OK' && targetHandle !== rawHandle) {
      action = 'FIXED_SYNTAX';
      reason = 'Stripped invalid characters, spaces, or leading @';
      syntaxFixedCount++;
    }

    // 3. Prevent collision if handle changed
    if (targetHandle !== rawHandle) {
      const targetLower = targetHandle.toLowerCase();
      if (existingHandles.has(targetLower) && targetLower !== lowerHandle) {
        // Find existing record with this handle
        const duplicate = allCreators.find(
          (c) => c.handle.toLowerCase() === targetLower && c.id !== creator.id
        );
        if (duplicate) {
          // If the current creator is the true marquee with high reach, keep targetHandle for this creator
          // and suffix the lower-reach copycat record
          if (creator.followerCount > duplicate.followerCount) {
            const copycatSuffix = `${duplicate.handle}_copycat_${duplicate.id.slice(0, 4)}`;
            await prisma.creator.update({
              where: { id: duplicate.id },
              data: { handle: copycatSuffix },
            });
            existingHandles.delete(targetLower);
            existingHandles.add(copycatSuffix.toLowerCase());
          } else {
            targetHandle = `${targetHandle}_${creator.id.slice(0, 4)}`;
            action = 'COLLISION_RESOLVED';
            reason = 'Collision with primary verified account resolved with unique suffix.';
          }
        }
      }

      // Execute update in database
      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          handle: targetHandle,
          isVerified: true,
        },
      });

      existingHandles.delete(lowerHandle);
      existingHandles.add(targetHandle.toLowerCase());
    }

    totalVerifiedCount++;

    if (action !== 'VERIFIED_OK' || MARQUEE_VERIFIED_REGISTRY[targetHandle.toLowerCase()]) {
      remediations.push({
        creatorId: creator.id,
        creatorName: creator.fullName,
        platform,
        originalHandle: rawHandle,
        remediatedHandle: targetHandle,
        verifiedUrl: buildVerifiedUrl(targetHandle, platform),
        subscriberCount: creator.followerCount,
        reason,
        actionTaken: action,
      });
    }
  }

  console.log('========================================================================');
  console.log('🎯 IDENTITY AUDIT & REMEDIATION COMPLETE');
  console.log('========================================================================');
  console.log(`✅ Total Records Audited:      ${allCreators.length}`);
  console.log(`✨ Marquee Impostors Corrected: ${marqueeFixedCount}`);
  console.log(`🧹 Syntax Sanitizations:       ${syntaxFixedCount}`);
  console.log(`🛡️  Total Verified Records:     ${totalVerifiedCount}\n`);

  console.log('📋 SAMPLE MARQUEE REMEDIATIONS:');
  console.table(
    remediations.slice(0, 15).map((r) => ({
      'Creator Name': r.creatorName,
      Platform: r.platform,
      'Original Handle': `@${r.originalHandle}`,
      'Verified Handle': `@${r.remediatedHandle}`,
      'Subscriber Reach': `${(r.subscriberCount / 1e6).toFixed(1)}M`,
      'Action Taken': r.actionTaken,
    }))
  );

  return remediations;
}

if (require.main === module) {
  verifyAllIdentities()
    .catch((err) => {
      console.error('Fatal error during identity verification:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
