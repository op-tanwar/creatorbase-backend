import prisma from '../utils/prisma';

export interface CreateAttributionInput {
  campaignId: string;
  creatorId: string;
  campaignCode: string;
  creatorSlug: string;
  destinationUrl?: string;
  promoCode?: string;
  discountPercent?: number;
}

export class AttributionService {
  static async createAttribution(input: CreateAttributionInput) {
    const {
      campaignId,
      creatorId,
      campaignCode,
      creatorSlug,
      destinationUrl = 'https://creatorbase.in',
      promoCode,
      discountPercent = 15,
    } = input;

    const utmUrl = `${destinationUrl}?utm_source=creatorbase&utm_medium=influencer&utm_campaign=${encodeURIComponent(
      campaignCode
    )}&utm_content=${encodeURIComponent(creatorSlug)}&coupon=${encodeURIComponent(
      promoCode || `${creatorSlug.toUpperCase()}${discountPercent}`
    )}`;

    const code = promoCode || `${creatorSlug.toUpperCase()}${discountPercent}`;

    const attribution = await prisma.campaignAttribution.upsert({
      where: {
        campaignCode_creatorSlug: {
          campaignCode,
          creatorSlug,
        },
      },
      update: {
        utmUrl,
        promoCode: code,
        discountPercent,
      },
      create: {
        campaignId,
        creatorId,
        campaignCode,
        creatorSlug,
        utmUrl,
        promoCode: code,
        discountPercent,
        totalClicks: 0,
        totalConversions: 0,
        revenueAttributedINR: 0,
        roas: 0,
      },
    });

    return attribution;
  }

  static async getCampaignAttributions(campaignId: string) {
    return prisma.campaignAttribution.findMany({
      where: { campaignId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            fullName: true,
            avatarUrl: true,
            platform: true,
            city: true,
          },
        },
      },
      orderBy: { revenueAttributedINR: 'desc' },
    });
  }

  static async recordClick(campaignCode: string, creatorSlug: string) {
    const attribution = await prisma.campaignAttribution.findUnique({
      where: {
        campaignCode_creatorSlug: {
          campaignCode,
          creatorSlug,
        },
      },
    });

    if (!attribution) return null;

    return prisma.campaignAttribution.update({
      where: { id: attribution.id },
      data: {
        totalClicks: { increment: 1 },
      },
    });
  }

  static async recordConversion(
    campaignCode: string,
    creatorSlug: string,
    orderAmountINR: number
  ) {
    const attribution = await prisma.campaignAttribution.findUnique({
      where: {
        campaignCode_creatorSlug: {
          campaignCode,
          creatorSlug,
        },
      },
    });

    if (!attribution) return null;

    const newRevenue = attribution.revenueAttributedINR + orderAmountINR;
    const newConversions = attribution.totalConversions + 1;
    // Assume estimated fee baseline of ₹20,000 for ROAS calculation
    const roas = +(newRevenue / 20000).toFixed(2);

    return prisma.campaignAttribution.update({
      where: { id: attribution.id },
      data: {
        totalConversions: newConversions,
        revenueAttributedINR: newRevenue,
        roas,
      },
    });
  }

  static async recordMetricById(attributionId: string, additionalClicks: number, additionalConversions: number, additionalRevenueINR: number) {
    const attribution = await prisma.campaignAttribution.findUnique({
      where: { id: attributionId },
    });
    if (!attribution) throw new Error('Attribution record not found');

    const totalClicks = attribution.totalClicks + additionalClicks;
    const totalConversions = attribution.totalConversions + additionalConversions;
    const revenueAttributedINR = attribution.revenueAttributedINR + additionalRevenueINR;
    const roas = +(revenueAttributedINR / Math.max(1, 15000)).toFixed(2);

    return prisma.campaignAttribution.update({
      where: { id: attributionId },
      data: {
        totalClicks,
        totalConversions,
        revenueAttributedINR,
        roas,
      },
    });
  }

  static async deleteAttribution(attributionId: string) {
    return prisma.campaignAttribution.delete({
      where: { id: attributionId },
    });
  }
}
