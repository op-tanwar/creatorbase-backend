import prisma from '../utils/prisma';
import { CreateCampaignInput } from '../validators/campaignSchemas';

export class CampaignService {
  static async getCampaigns(userId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        shortlists: {
          include: {
            items: {
              include: {
                creator: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns.map((camp) => {
      let allocatedBudgetINR = 0;
      let totalReach = 0;
      const creatorIds = new Set<string>();

      for (const sl of camp.shortlists) {
        for (const item of sl.items) {
          allocatedBudgetINR += item.assignedFeeINR || 0;
          if (!creatorIds.has(item.creatorId)) {
            creatorIds.add(item.creatorId);
            totalReach += item.creator.followerCount;
          }
        }
      }

      const budgetUtilizationPercent = camp.budgetINR > 0
        ? Math.round((allocatedBudgetINR / camp.budgetINR) * 100)
        : 0;

      return {
        ...camp,
        analytics: {
          allocatedBudgetINR,
          remainingBudgetINR: Math.max(0, camp.budgetINR - allocatedBudgetINR),
          budgetUtilizationPercent,
          totalCreatorsCount: creatorIds.size,
          totalEstimatedReach: totalReach,
        },
      };
    });
  }

  static async createCampaign(userId: string, data: CreateCampaignInput) {
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        budgetINR: data.budgetINR,
        targetCity: data.targetCity || null,
      },
      include: {
        shortlists: true,
      },
    });

    return {
      ...campaign,
      analytics: {
        allocatedBudgetINR: 0,
        remainingBudgetINR: campaign.budgetINR,
        budgetUtilizationPercent: 0,
        totalCreatorsCount: 0,
        totalEstimatedReach: 0,
      },
    };
  }

  static async getCampaignById(userId: string, id: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        shortlists: {
          include: {
            items: {
              include: {
                creator: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      const error: any = new Error('Campaign not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    let allocatedBudgetINR = 0;
    let totalReach = 0;
    let totalAvgReelViews = 0;
    const creatorIds = new Set<string>();

    for (const sl of campaign.shortlists) {
      for (const item of sl.items) {
        allocatedBudgetINR += item.assignedFeeINR || 0;
        if (!creatorIds.has(item.creatorId)) {
          creatorIds.add(item.creatorId);
          totalReach += item.creator.followerCount;
          totalAvgReelViews += item.creator.avgReelViews;
        }
      }
    }

    const budgetUtilizationPercent = campaign.budgetINR > 0
      ? Number(((allocatedBudgetINR / campaign.budgetINR) * 100).toFixed(1))
      : 0;

    return {
      ...campaign,
      analytics: {
        allocatedBudgetINR,
        remainingBudgetINR: Math.max(0, campaign.budgetINR - allocatedBudgetINR),
        budgetUtilizationPercent,
        totalCreatorsCount: creatorIds.size,
        totalEstimatedReach: totalReach,
        totalEstimatedReelViews: totalAvgReelViews,
      },
    };
  }
}
