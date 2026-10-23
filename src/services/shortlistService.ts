import crypto from 'crypto';
import prisma from '../utils/prisma';
import {
  CreateShortlistInput,
  AddCreatorToShortlistInput,
  UpdateShortlistItemInput,
  UpdateDeliverableStageInput,
} from '../validators/shortlistSchemas';
import { generateShortlistCsv, ShortlistCsvRow } from '../utils/csvExport';

export class ShortlistService {
  static async getShortlists(userId: string) {
    const shortlists = await prisma.shortlist.findMany({
      where: { userId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            budgetINR: true,
            status: true,
          },
        },
        items: {
          include: {
            creator: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return shortlists.map((sl) => {
      const totalEstimatedCostINR = sl.items.reduce(
        (sum, item) => sum + (item.assignedFeeINR || 0),
        0
      );
      const totalFollowers = sl.items.reduce(
        (sum, item) => sum + item.creator.followerCount,
        0
      );
      const avgEngagement =
        sl.items.length > 0
          ? Number(
              (
                sl.items.reduce((sum, item) => sum + item.creator.engagementRate, 0) /
                sl.items.length
              ).toFixed(2)
            )
          : 0;

      return {
        ...sl,
        creatorCount: sl.items.length,
        totalEstimatedCostINR,
        totalFollowers,
        avgEngagement,
      };
    });
  }

  static async getShortlistById(userId: string, id: string) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id, userId },
      include: {
        campaign: true,
        items: {
          include: {
            creator: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const totalEstimatedCostINR = shortlist.items.reduce(
      (sum, item) => sum + (item.assignedFeeINR || 0),
      0
    );

    return {
      ...shortlist,
      creatorCount: shortlist.items.length,
      totalEstimatedCostINR,
    };
  }

  static async createShortlist(userId: string, data: CreateShortlistInput) {
    // If campaignId provided, check ownership
    if (data.campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, userId },
      });
      if (!campaign) {
        const error: any = new Error('Campaign not found or not owned by user');
        error.statusCode = 400;
        throw error;
      }
    }

    const shortlist = await prisma.shortlist.create({
      data: {
        userId,
        name: data.name,
        campaignId: data.campaignId || null,
        shareToken: crypto.randomUUID(),
      },
      include: {
        campaign: true,
        items: {
          include: {
            creator: true,
          },
        },
      },
    });

    return {
      ...shortlist,
      creatorCount: 0,
      totalEstimatedCostINR: 0,
    };
  }

  static async addCreatorToShortlist(
    userId: string,
    shortlistId: string,
    data: AddCreatorToShortlistInput
  ) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const creator = await prisma.creator.findUnique({
      where: { id: data.creatorId },
    });

    if (!creator) {
      const error: any = new Error('Creator not found');
      error.statusCode = 404;
      throw error;
    }

    // Upsert shortlist item so re-adding updates notes/fee rather than crashing
    const item = await prisma.shortlistItem.upsert({
      where: {
        shortlistId_creatorId: {
          shortlistId,
          creatorId: data.creatorId,
        },
      },
      update: {
        assignedFeeINR: data.assignedFeeINR !== undefined ? data.assignedFeeINR : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      create: {
        shortlistId,
        creatorId: data.creatorId,
        assignedFeeINR: data.assignedFeeINR ?? null,
        notes: data.notes ?? null,
      },
      include: {
        creator: true,
      },
    });

    // Touch shortlist updatedAt
    await prisma.shortlist.update({
      where: { id: shortlistId },
      data: { updatedAt: new Date() },
    });

    return item;
  }

  static async updateShortlistItem(
    userId: string,
    shortlistId: string,
    creatorId: string,
    data: UpdateShortlistItemInput
  ) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.shortlistItem.update({
      where: {
        shortlistId_creatorId: {
          shortlistId,
          creatorId,
        },
      },
      data: {
        ...(data.assignedFeeINR !== undefined && { assignedFeeINR: data.assignedFeeINR }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        creator: true,
      },
    });

    return updated;
  }

  static async updateDeliverableStage(
    userId: string,
    shortlistId: string,
    creatorId: string,
    data: UpdateDeliverableStageInput
  ) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.shortlistItem.update({
      where: {
        shortlistId_creatorId: {
          shortlistId,
          creatorId,
        },
      },
      data: {
        stage: data.stage as any,
        ...(data.agreedFeeINR !== undefined && {
          agreedFeeINR: data.agreedFeeINR,
          assignedFeeINR: data.agreedFeeINR !== null ? Number(data.agreedFeeINR) : null,
        }),
        ...(data.liveUrl !== undefined && { liveUrl: data.liveUrl }),
        ...(data.draftUrl !== undefined && { draftUrl: data.draftUrl }),
        ...(data.deliverableNotes !== undefined && { deliverableNotes: data.deliverableNotes }),
      },
      include: {
        creator: true,
      },
    });

    // Touch shortlist updatedAt
    await prisma.shortlist.update({
      where: { id: shortlistId },
      data: { updatedAt: new Date() },
    });

    return updated;
  }

  static async getKanbanBoard(userId: string, shortlistId: string) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
      include: {
        campaign: true,
        items: {
          include: {
            creator: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    // Group items by deliverable stage
    const kanbanColumns: Record<string, any[]> = {
      SHORTLISTED: [],
      EMAIL_SENT: [],
      COMMERCIALS_AGREED: [],
      DRAFT_UNDER_REVIEW: [],
      LIVE_AND_PAID: [],
    };

    let totalAllocatedBudgetINR = 0;
    let livePostsCount = 0;

    shortlist.items.forEach((item) => {
      const fee = item.agreedFeeINR ?? (item.assignedFeeINR ? Math.round(item.assignedFeeINR) : 0);
      totalAllocatedBudgetINR += fee;

      if (item.liveUrl && item.liveUrl.trim().length > 0) {
        livePostsCount += 1;
      }

      const stageKey = item.stage || 'SHORTLISTED';
      if (kanbanColumns[stageKey]) {
        kanbanColumns[stageKey].push(item);
      } else {
        kanbanColumns.SHORTLISTED.push(item);
      }
    });

    return {
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        shareToken: shortlist.shareToken,
        campaign: shortlist.campaign,
        creatorCount: shortlist.items.length,
      },
      telemetry: {
        totalAllocatedBudgetINR,
        livePostsCount,
        totalCreatorsCount: shortlist.items.length,
      },
      stages: kanbanColumns,
    };
  }

  static async removeCreatorFromShortlist(
    userId: string,
    shortlistId: string,
    creatorId: string
  ) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    await prisma.shortlistItem.deleteMany({
      where: {
        shortlistId,
        creatorId,
      },
    });

    return { success: true, message: 'Creator removed from shortlist' };
  }

  static async exportShortlistCsv(userId: string, shortlistId: string) {
    const shortlist = await prisma.shortlist.findFirst({
      where: { id: shortlistId, userId },
      include: {
        items: {
          include: {
            creator: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!shortlist) {
      const error: any = new Error('Shortlist not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const rows: ShortlistCsvRow[] = shortlist.items.map((item) => ({
      handle: `@${item.creator.handle}`,
      name: item.creator.fullName,
      city: item.creator.city,
      state: item.creator.state,
      niche: item.creator.niche,
      platform: item.creator.platform,
      email: item.creator.businessEmail || 'N/A',
      followers: item.creator.followerCount,
      engagementRate: item.creator.engagementRate,
      avgReelViews: item.creator.avgReelViews,
      assignedFeeINR: item.assignedFeeINR ? `INR ${item.assignedFeeINR}` : 'Negotiating',
      notes: item.notes || 'None',
    }));

    const csvContent = generateShortlistCsv(rows);
    const sanitizedShortlistName = shortlist.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${sanitizedShortlistName}_creatorbase_export.csv`;

    return {
      csvContent,
      filename,
      count: rows.length,
    };
  }
}
