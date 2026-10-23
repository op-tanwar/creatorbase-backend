import prisma from '../utils/prisma';
import { CreatorQueryInput } from '../validators/creatorSchemas';
import { Prisma, Platform } from '@prisma/client';
import { ApifyService, ScrapedInstagramData, REAL_INDIAN_CREATOR_REGISTRY, validateCreatorQuality } from './apifyService';

export function computeAuthenticityScore(creator: {
  followerCount: number;
  followingCount?: number | null;
  engagementRate: number;
  avgReelViews: number;
  isVerified: boolean;
  postsCount?: number | null;
  businessEmail?: string | null;
  platform?: string | Platform;
}): number {
  let score = 75; // Baseline trust score for verified-quality indexed creators

  // 1. Follower to Following Ratio (organic creators have high follower:following ratios)
  const following = creator.followingCount ?? 1;
  const ratio = creator.followerCount / Math.max(1, following);
  if (ratio >= 20) score += 6;
  else if (ratio >= 5) score += 4;
  else if (ratio >= 2) score += 2;
  else score -= 6; // Suspicious follow-for-follow account

  // 2. Engagement Rate Health Band
  // Optimal authentic engagement band for Indian micro/macro creators is 2.0% - 7.5%
  if (creator.engagementRate >= 2.0 && creator.engagementRate <= 7.5) {
    score += 8;
  } else if (creator.engagementRate >= 1.0 && creator.engagementRate < 2.0) {
    score += 4;
  } else if (creator.engagementRate > 15.0 && creator.followerCount > 50000) {
    // Engagement pods / automated bot rings
    score -= 12;
  }

  // 3. Video / Reel View to Follower Ratio (15% - 65% is genuine human viewer traffic)
  const viewRatio = creator.avgReelViews / Math.max(1, creator.followerCount);
  if (viewRatio >= 0.20 && viewRatio <= 0.65) {
    score += 6;
  } else if (viewRatio >= 0.10) {
    score += 3;
  } else if (viewRatio < 0.05) {
    // Ghost follower warning (lots of followers but nobody watches videos)
    score -= 8;
  }

  // 4. Verification Check Bonus
  if (creator.isVerified) {
    score += 4;
  }

  // 5. Activity & Completeness Bonus
  if ((creator.postsCount ?? 0) >= 50) score += 2;
  if (creator.businessEmail) score += 2;

  // Clamp within realistic 50 - 99 range
  return Math.min(99, Math.max(50, Math.round(score)));
}

export class CreatorService {
  static async getCreators(query: Partial<CreatorQueryInput>) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.CreatorWhereInput = {};

    if (query.platform && query.platform !== 'ALL') {
      where.platform = query.platform as Platform;
    }

    if (query.city && query.city !== 'All') {
      const cleanCity = query.city.replace(/\s+NCR/i, '').trim();
      where.city = {
        contains: cleanCity,
        mode: 'insensitive',
      };
    }

    if (query.niche && query.niche !== 'All') {
      const cleanNiche = query.niche.split('&')[0].trim();
      where.niche = {
        contains: cleanNiche,
        mode: 'insensitive',
      };
    }

    // Quality Gatekeeper Rule 1: Enforce hard minimum followerCount >= 5,000 (nano-influencer floor)
    const minFollowersVal = Math.max(
      5000,
      query.minFollowers !== undefined && !isNaN(query.minFollowers) ? query.minFollowers : 5000
    );
    where.followerCount = {
      gte: minFollowersVal,
      ...(query.maxFollowers !== undefined && !isNaN(query.maxFollowers) ? { lte: query.maxFollowers } : {}),
    };

    // Quality Gatekeeper Rule 2: Enforce hard minimum engagement rate >= 1.0% (dead/ghost audience rejection)
    const minEngagementVal = Math.max(
      1.0,
      query.minEngagement !== undefined && !isNaN(query.minEngagement) ? query.minEngagement : 1.0
    );
    where.engagementRate = {
      gte: minEngagementVal,
    };

    // Quality Gatekeeper Rule 3: Enforce minimum activity of 15+ posts/videos
    where.postsCount = {
      gte: 15,
    };

    // Quality Gatekeeper Rule 4: Profile Completeness (valid avatarUrl)
    where.avatarUrl = {
      not: '',
    };

    if (query.search && query.search.trim() !== '') {
      const searchTerm = query.search.trim().replace(/^@/, '');
      where.OR = [
        { handle: { contains: searchTerm, mode: 'insensitive' } },
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { city: { contains: searchTerm, mode: 'insensitive' } },
        { niche: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, creators] = await Promise.all([
      prisma.creator.count({ where }),
      prisma.creator.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ followerCount: 'desc' }, { engagementRate: 'desc' }],
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    // Attach computed Authenticity Score (0-100) to every creator record
    const mappedCreators = creators.map((creator) => ({
      ...creator,
      authenticityScore: computeAuthenticityScore(creator),
    }));

    return {
      creators: mappedCreators,
      total,
      page,
      limit,
      totalPages,
    };
  }

  static async getCreatorById(id: string) {
    const creator = await prisma.creator.findUnique({
      where: { id },
      include: {
        shortlistItems: {
          select: {
            id: true,
            shortlistId: true,
            shortlist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!creator) {
      const error: any = new Error('Creator not found');
      error.statusCode = 404;
      throw error;
    }

    // Computed influencer analytics summary
    const estimatedCostPerReelINR = Math.round(
      creator.followerCount * 0.35 + (creator.avgReelViews * 0.12)
    );
    const estimatedCostPerStoryINR = Math.round(
      creator.followerCount * 0.15
    );
    const authenticityScore = computeAuthenticityScore(creator);

    return {
      ...creator,
      authenticityScore,
      analytics: {
        estimatedCostPerReelINR,
        estimatedCostPerStoryINR,
        authenticityScore,
        tier:
          creator.followerCount >= 500000
            ? 'Macro Creator'
            : creator.followerCount >= 100000
            ? 'Mid-tier Creator'
            : 'Micro Creator',
        engagementHealthScore:
          creator.engagementRate >= 6.5
            ? 'Excellent'
            : creator.engagementRate >= 4.0
            ? 'Strong'
            : 'Average',
      },
    };
  }

  static async syncLiveCreator(
    handle: string,
    city?: string,
    niche?: string,
    forceRefresh?: boolean
  ) {
    const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();
    if (!cleanHandle) {
      const error: any = new Error('Invalid Instagram handle provided');
      error.statusCode = 400;
      throw error;
    }

    // Check 24h cache in database
    const existing = await prisma.creator.findUnique({
      where: { handle: cleanHandle },
    });

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (
      existing &&
      !forceRefresh &&
      existing.lastScrapedAt &&
      Date.now() - new Date(existing.lastScrapedAt).getTime() < ONE_DAY_MS
    ) {
      return {
        creator: existing,
        isCached: true,
        scrapedAt: existing.lastScrapedAt,
      };
    }

    // Scrape via ApifyService
    const scraped = await ApifyService.scrapeInstagramProfile(cleanHandle, city, niche);
    const upserted = await this.upsertScrapedCreator(scraped);

    return {
      creator: upserted,
      isCached: false,
      scrapedAt: upserted.lastScrapedAt,
    };
  }

  static async upsertScrapedCreator(scraped: ScrapedInstagramData) {
    // Quality Gatekeeper Validation: Discard rejected profiles before inserting into PostgreSQL
    const quality = validateCreatorQuality(scraped);
    if (!quality.isValid) {
      console.warn(`[CreatorService] Pre-save quality check failed for @${scraped.handle}: ${quality.reasons.join(', ')}`);
      const err: any = new Error(`Creator quality validation failed: ${quality.reasons.join(', ')}`);
      err.statusCode = 422;
      throw err;
    }

    const CITY_TO_STATE: Record<string, string> = {
      Mumbai: 'Maharashtra',
      Pune: 'Maharashtra',
      'Delhi NCR': 'Delhi',
      Delhi: 'Delhi',
      Bangalore: 'Karnataka',
      Bengaluru: 'Karnataka',
      Hyderabad: 'Telangana',
      Chennai: 'Tamil Nadu',
      Kolkata: 'West Bengal',
      Ahmedabad: 'Gujarat',
      Jaipur: 'Rajasthan',
      Goa: 'Goa',
      Chandigarh: 'Punjab',
      Bhopal: 'Madhya Pradesh',
      Indore: 'Madhya Pradesh',
    };

    const totalAvgEngagement = Math.round(scraped.followerCount * (scraped.engagementRate / 100));
    const avgComments = Math.max(25, Math.round(totalAvgEngagement * 0.04));
    const avgLikes = Math.max(100, totalAvgEngagement - avgComments);
    const state = CITY_TO_STATE[scraped.city] || 'Maharashtra';
    const isFemaleDominant = ['Fashion', 'Beauty'].includes(scraped.niche);
    const isMaleDominant = ['Tech', 'Gaming', 'Finance'].includes(scraped.niche);
    const audienceFemalePercentage = isFemaleDominant ? 72 : isMaleDominant ? 34 : 52;
    const audienceMalePercentage = 100 - audienceFemalePercentage;

    const platform = (scraped as any).platform || Platform.INSTAGRAM;

    return await prisma.creator.upsert({
      where: { handle: scraped.handle },
      create: {
        handle: scraped.handle,
        platform,
        fullName: scraped.fullName,
        avatarUrl: scraped.avatarUrl,
        bio: scraped.bio,
        followerCount: scraped.followerCount,
        followingCount: scraped.followingCount,
        postsCount: scraped.postsCount,
        engagementRate: scraped.engagementRate,
        avgLikes,
        avgComments,
        avgReelViews: scraped.avgReelViews,
        businessEmail: scraped.businessEmail || null,
        isVerified: scraped.isVerified,
        city: scraped.city,
        state,
        niche: scraped.niche,
        audienceTopCity: scraped.city,
        audienceFemalePercentage,
        audienceMalePercentage,
        lastScrapedAt: new Date(),
      },
      update: {
        platform,
        fullName: scraped.fullName,
        avatarUrl: scraped.avatarUrl,
        bio: scraped.bio,
        followerCount: scraped.followerCount,
        followingCount: scraped.followingCount,
        postsCount: scraped.postsCount,
        engagementRate: scraped.engagementRate,
        avgLikes,
        avgComments,
        avgReelViews: scraped.avgReelViews,
        businessEmail: scraped.businessEmail || null,
        isVerified: scraped.isVerified,
        city: scraped.city,
        state,
        niche: scraped.niche,
        audienceTopCity: scraped.city,
        audienceFemalePercentage,
        audienceMalePercentage,
        lastScrapedAt: new Date(),
      },
    });
  }

  static async bulkSeedApifyCreators(
    handles?: string[],
    batchSize = 10,
    onProgress?: (current: number, total: number, lastScraped: ScrapedInstagramData) => void
  ) {
    let targetHandles: string[];
    const targetRegistry: Record<string, any> = {};

    if (handles && handles.length > 0) {
      targetHandles = handles.map((h) => h.trim().replace(/^@/, '').toLowerCase());
    } else {
      targetHandles = REAL_INDIAN_CREATOR_REGISTRY.map((c) => c.handle);
      for (const reg of REAL_INDIAN_CREATOR_REGISTRY) {
        targetRegistry[reg.handle] = reg;
      }
    }

    const total = targetHandles.length;
    const syncedCreators = [];

    // Process in batches
    for (let i = 0; i < total; i += batchSize) {
      const batchHandles = targetHandles.slice(i, i + batchSize);
      try {
        const scrapedBatch = await ApifyService.scrapeInstagramBatch(batchHandles, targetRegistry);
        for (const item of scrapedBatch) {
          const quality = validateCreatorQuality(item);
          if (!quality.isValid) {
            console.warn(`[CreatorService] Skipping low-quality creator @${item.handle}: ${quality.reasons.join(', ')}`);
            continue;
          }
          try {
            const upserted = await this.upsertScrapedCreator(item);
            syncedCreators.push(upserted);
            if (onProgress) {
              onProgress(syncedCreators.length, total, item);
            }
          } catch (upsertErr: any) {
            console.error(`Failed to upsert @${item.handle}:`, upsertErr.message || upsertErr);
          }
        }
      } catch (batchErr: any) {
        console.error(`Error processing batch [${i} - ${i + batchSize}]:`, batchErr.message || batchErr);
      }
    }

    return {
      count: syncedCreators.length,
      creators: syncedCreators,
    };
  }

  static async cleanDummyCreators() {
    const dummyHandles = [
      'mumbai_tech_review',
      'delhi_style_file',
      'bhopal_zaika_siddharth',
      'bengaluru_coder_tanvi',
      'jaipur_wanderlust_kabir',
      'pune_fitness_rohan',
      'indore_zaika_explore',
      'ahmedabad_couture_diya',
      'dummy_creator_1',
      'dummy_creator_2',
      'mock_creator',
      'test_creator',
    ];

    const deleted = await prisma.creator.deleteMany({
      where: {
        OR: [
          { handle: { in: dummyHandles } },
          { handle: { startsWith: 'dummy_' } },
          { handle: { startsWith: 'mock_' } },
          { fullName: { contains: 'Dummy', mode: 'insensitive' } },
          { fullName: { contains: 'Mock Creator', mode: 'insensitive' } },
        ],
      },
    });

    return deleted.count;
  }
}


