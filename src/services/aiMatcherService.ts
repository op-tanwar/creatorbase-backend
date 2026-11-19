import prisma from '../utils/prisma';
import { computeAuthenticityScore } from './creatorService';

interface MatchedCreatorResult {
  id: string;
  handle: string;
  fullName: string;
  avatarUrl: string;
  platform: string;
  city: string;
  niche: string;
  followerCount: number;
  engagementRate: number;
  avgReelViews: number;
  businessEmail: string | null;
  authenticityScore: number;
  allocatedFeeINR: number;
  predictedImpressions: number;
  matchScore: number;
  matchReason: string;
}

export interface SmartRosterResponse {
  queryBrief: string;
  parsedCriteria: {
    targetCities: string[];
    targetNiches: string[];
    targetBudgetINR: number;
    minEngagement: number;
    targetCount: number;
  };
  totalCreators: number;
  allocatedBudgetINR: number;
  budgetCeilingINR: number;
  projectedReach: number;
  projectedImpressions: number;
  effectiveCPM: number;
  executiveSummary: string;
  creators: MatchedCreatorResult[];
}

const KNOWN_CITIES = [
  'Mumbai',
  'Delhi NCR',
  'Delhi',
  'Bangalore',
  'Indore',
  'Pune',
  'Jaipur',
  'Hyderabad',
  'Ahmedabad',
  'Kolkata',
  'Chennai',
  'Bhopal',
  'Surat',
  'Lucknow',
  'Chandigarh',
  'Goa',
  'Nagpur',
  'Kochi',
  'Coimbatore',
  'Patna',
];

const NICHE_KEYWORDS: Record<string, string[]> = {
  'Beauty & Skincare': ['skincare', 'beauty', 'makeup', 'cosmetics', 'glow', 'dermatology'],
  'Tech & Gadgets': ['tech', 'gadget', 'smartphone', 'ai', 'software', 'laptop', 'coding'],
  'Finance & FinTech': ['finance', 'fintech', 'stock', 'invest', 'mutual fund', 'crypto', 'tax', 'money'],
  'Fashion & Style': ['fashion', 'style', 'outfit', 'streetwear', 'zara', 'h&m', 'apparel'],
  'Fitness & Bodybuilding': ['fitness', 'gym', 'workout', 'bodybuilding', 'nutrition', 'whey', 'protein'],
  'Food & Street Culinary': ['food', 'culinary', 'recipe', 'cooking', 'cafe', 'restaurant', 'street food'],
  'Travel & Hospitality': ['travel', 'hotel', 'resort', 'vacation', 'hospitality', 'explore'],
  'Gaming & Esports': ['gaming', 'esports', 'streamer', 'bgmi', 'minecraft', 'playstation'],
  'Comedy & Entertainment': ['comedy', 'roast', 'humor', 'skit', 'standup', 'entertainment'],
  'Business & Startups': ['business', 'startup', 'd2c', 'entrepreneur', 'founder'],
  'Automobile & Moto': ['auto', 'automobile', 'car', 'bike', 'motorcycle', 'supercar'],
  'Education & EdTech': ['education', 'edtech', 'upsc', 'exam', 'teacher', 'coaching'],
};

export class AIMatcherService {
  static parseBrief(brief: string) {
    const lower = brief.toLowerCase();

    // 1. Extract Cities
    const matchedCities: string[] = [];
    for (const city of KNOWN_CITIES) {
      if (lower.includes(city.toLowerCase())) {
        matchedCities.push(city === 'Delhi' ? 'Delhi NCR' : city);
      }
    }

    // 2. Extract Niches
    const matchedNiches: string[] = [];
    for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        matchedNiches.push(niche);
      }
    }

    // 3. Extract Budget
    let targetBudgetINR = 150000; // default ₹1.5L
    const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:l|lakh|lac|lakhs|lacs)/);
    const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand)/);
    const rawNumberMatch = lower.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/);

    if (lakhMatch) {
      targetBudgetINR = parseFloat(lakhMatch[1]) * 100000;
    } else if (kMatch) {
      targetBudgetINR = parseFloat(kMatch[1]) * 1000;
    } else if (rawNumberMatch) {
      targetBudgetINR = parseFloat(rawNumberMatch[1].replace(/,/g, ''));
    }

    // 4. Extract Target Count
    let targetCount = 6;
    const countMatch = lower.match(/(\d+)\s*(?:creators|influencers|profiles|roster|talents)/);
    if (countMatch) {
      targetCount = Math.min(20, Math.max(2, parseInt(countMatch[1], 10)));
    }

    // 5. Extract Engagement Floor
    let minEngagement = 2.0;
    const erMatch = lower.match(/(?:>|above|min|minimum)\s*(\d+(?:\.\d+)?)\s*%/);
    if (erMatch) {
      minEngagement = Math.min(10.0, Math.max(1.0, parseFloat(erMatch[1])));
    }

    return {
      targetCities: Array.from(new Set(matchedCities)),
      targetNiches: Array.from(new Set(matchedNiches)),
      targetBudgetINR,
      minEngagement,
      targetCount,
    };
  }

  static async matchBrief(brief: string, maxCreatorsParam?: number): Promise<SmartRosterResponse> {
    const parsed = this.parseBrief(brief);
    const targetCount = maxCreatorsParam || parsed.targetCount;

    // Fetch candidate creators from database
    const candidates = await prisma.creator.findMany({
      where: {
        followerCount: { gte: 5000 },
        engagementRate: { gte: parsed.minEngagement },
      },
      take: 100,
      orderBy: [{ engagementRate: 'desc' }, { followerCount: 'desc' }],
    });

    // Score and rank candidates
    const scoredCandidates = candidates.map((creator) => {
      let score = 50;
      const reasons: string[] = [];

      // City match
      if (parsed.targetCities.length > 0) {
        const cityMatch = parsed.targetCities.some((c) =>
          creator.city.toLowerCase().includes(c.toLowerCase().replace(/\s+ncr/i, ''))
        );
        if (cityMatch) {
          score += 40;
          reasons.push(`Target City (${creator.city})`);
        }
      }

      // Niche match
      if (parsed.targetNiches.length > 0) {
        const nicheMatch = parsed.targetNiches.some((n) =>
          creator.niche.toLowerCase().includes(n.split('&')[0].trim().toLowerCase())
        );
        if (nicheMatch) {
          score += 35;
          reasons.push(`Core Niche (${creator.niche})`);
        }
      }

      // High ER Bonus
      if (creator.engagementRate >= 4.0) {
        score += 15;
        reasons.push(`High ER (${creator.engagementRate.toFixed(1)}%)`);
      }

      // Verified Email Bonus
      if (creator.businessEmail) {
        score += 10;
        reasons.push('Verified Contact Ready');
      }

      const authenticity = creator.audienceCredibilityScore || computeAuthenticityScore(creator);

      // Estimated standard rate
      const rawEstimated =
        (creator.followerCount / 1000) * 140 * 0.5 +
        (creator.avgReelViews / 1000) * 110 * 0.5;
      const estFee = Math.max(3500, Math.round(rawEstimated / 500) * 500);

      return {
        creator,
        authenticity,
        estFee,
        score,
        reason: reasons.length > 0 ? reasons.join(' • ') : 'High Organic Engagement & Reach',
      };
    });

    // Sort by weighted match score
    scoredCandidates.sort((a, b) => b.score - a.score || b.creator.engagementRate - a.creator.engagementRate);

    // Pick top candidates
    const selected = scoredCandidates.slice(0, targetCount);

    // Budget allocation logic:
    // Scale fees to fit within targetBudgetINR while keeping fair rates
    const rawTotalFee = selected.reduce((sum, item) => sum + item.estFee, 0);
    const scalingFactor = rawTotalFee > parsed.targetBudgetINR ? parsed.targetBudgetINR / rawTotalFee : 1.0;

    let totalAllocated = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    const matchedCreators: MatchedCreatorResult[] = selected.map((item) => {
      const allocatedFeeINR = Math.max(
        3000,
        Math.round((item.estFee * scalingFactor) / 500) * 500
      );
      const predictedImpressions = Math.round(item.creator.avgReelViews * 1.15);

      totalAllocated += allocatedFeeINR;
      totalReach += item.creator.followerCount;
      totalImpressions += predictedImpressions;

      return {
        id: item.creator.id,
        handle: item.creator.handle,
        fullName: item.creator.fullName,
        avatarUrl: item.creator.avatarUrl,
        platform: item.creator.platform,
        city: item.creator.city,
        niche: item.creator.niche,
        followerCount: item.creator.followerCount,
        engagementRate: item.creator.engagementRate,
        avgReelViews: item.creator.avgReelViews,
        businessEmail: item.creator.businessEmail,
        authenticityScore: item.authenticity,
        allocatedFeeINR,
        predictedImpressions,
        matchScore: Math.min(99, item.score),
        matchReason: item.reason,
      };
    });

    const effectiveCPM = Math.round((totalAllocated / Math.max(1000, totalImpressions)) * 1000);

    const executiveSummary = `Generated an optimal ${matchedCreators.length}-creator roster for budget ₹${totalAllocated.toLocaleString(
      'en-IN'
    )} (under ceiling ₹${parsed.targetBudgetINR.toLocaleString(
      'en-IN'
    )}). Delivering a projected ${totalImpressions.toLocaleString(
      'en-IN'
    )} impressions across ${totalReach.toLocaleString(
      'en-IN'
    )} verified reach at an effective ₹${effectiveCPM} CPM.`;

    return {
      queryBrief: brief,
      parsedCriteria: parsed,
      totalCreators: matchedCreators.length,
      allocatedBudgetINR: totalAllocated,
      budgetCeilingINR: parsed.targetBudgetINR,
      projectedReach: totalReach,
      projectedImpressions: totalImpressions,
      effectiveCPM,
      executiveSummary,
      creators: matchedCreators,
    };
  }

  static async discoverByKeywords(options: {
    query?: string;
    keywords?: string[];
    platform?: string;
    city?: string;
    niche?: string;
    minFollowers?: number;
    maxFollowers?: number;
    minCredibility?: number;
    limit?: number;
  }) {
    const {
      query,
      keywords = [],
      platform,
      city,
      niche,
      minFollowers,
      maxFollowers,
      minCredibility = 70,
      limit = 24,
    } = options;

    const searchTerms: string[] = [...keywords];
    if (query) {
      const parts = query
        .split(/[\s,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      searchTerms.push(...parts);
    }

    const where: any = {};
    if (platform && platform !== 'ALL') {
      where.platform = platform;
    }
    if (city && city !== 'All') {
      where.city = { contains: city.replace(/\s+NCR/i, '').trim(), mode: 'insensitive' };
    }
    if (niche && niche !== 'All') {
      where.niche = { contains: niche.split('&')[0].trim(), mode: 'insensitive' };
    }

    where.followerCount = {
      gte: minFollowers ? Math.max(5000, minFollowers) : 5000,
      ...(maxFollowers ? { lte: maxFollowers } : {}),
    };

    if (minCredibility) {
      where.audienceCredibilityScore = { gte: minCredibility };
    }

    if (searchTerms.length > 0) {
      where.OR = searchTerms.flatMap((term) => [
        { niche: { contains: term, mode: 'insensitive' } },
        { bio: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
        { handle: { contains: term, mode: 'insensitive' } },
      ]);
    }

    const creators = await prisma.creator.findMany({
      where,
      take: limit,
      orderBy: [{ engagementRate: 'desc' }, { followerCount: 'desc' }],
    });

    return {
      query,
      searchTerms,
      totalFound: creators.length,
      creators: creators.map((c) => ({
        ...c,
        authenticityScore: c.audienceCredibilityScore || computeAuthenticityScore(c),
      })),
    };
  }
}
