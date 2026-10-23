import prisma from '../utils/prisma';
import { computeAuthenticityScore } from './creatorService';
import { ClientApprovalStatus } from '@prisma/client';

export class PitchService {
  static async getPitchByToken(shareToken: string) {
    const shortlist = await prisma.shortlist.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            companyName: true,
            name: true,
          },
        },
        campaign: {
          select: {
            title: true,
            description: true,
            targetCity: true,
          },
        },
        items: {
          include: {
            creator: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!shortlist) {
      const error: any = new Error('Pitch roster not found or link has expired');
      error.statusCode = 404;
      throw error;
    }

    if (!shortlist.isPubliclyShared) {
      const error: any = new Error('This pitch link has been disabled by the agency');
      error.statusCode = 403;
      throw error;
    }

    const totalEstimatedCostINR = shortlist.items.reduce(
      (sum, item) => sum + (item.assignedFeeINR || 0),
      0
    );

    const approvedCount = shortlist.items.filter(
      (item) => item.clientApprovalStatus === 'APPROVED'
    ).length;

    const approvedBudgetINR = shortlist.items
      .filter((item) => item.clientApprovalStatus === 'APPROVED')
      .reduce((sum, item) => sum + (item.assignedFeeINR || 0), 0);

    const totalFollowers = shortlist.items.reduce(
      (sum, item) => sum + item.creator.followerCount,
      0
    );

    const creators = shortlist.items.map((item) => ({
      shortlistItemId: item.id,
      creatorId: item.creator.id,
      handle: item.creator.handle,
      fullName: item.creator.fullName,
      avatarUrl: item.creator.avatarUrl,
      bio: item.creator.bio,
      city: item.creator.city,
      state: item.creator.state,
      niche: item.creator.niche,
      platform: item.creator.platform,
      followerCount: item.creator.followerCount,
      engagementRate: item.creator.engagementRate,
      avgReelViews: item.creator.avgReelViews,
      isVerified: item.creator.isVerified,
      commercialRateINR: item.assignedFeeINR || 0,
      assignedFeeINR: item.assignedFeeINR || 0,
      clientApprovalStatus: item.clientApprovalStatus,
      clientNotes: item.clientNotes || '',
      agencyNotes: item.notes || '',
      authenticityScore: computeAuthenticityScore(item.creator),
    }));

    return {
      shareToken: shortlist.shareToken,
      shortlistName: shortlist.name,
      agencyName: shortlist.user.companyName,
      campaignTitle: shortlist.campaign?.title || null,
      campaignTargetCity: shortlist.campaign?.targetCity || null,
      creatorCount: shortlist.items.length,
      totalEstimatedCostINR,
      totalFollowers,
      approvedCount,
      approvedBudgetINR,
      creators,
    };
  }

  static async updateApproval(
    shareToken: string,
    creatorId: string,
    status: ClientApprovalStatus,
    notes?: string
  ) {
    const shortlist = await prisma.shortlist.findUnique({
      where: { shareToken },
      select: { id: true, isPubliclyShared: true },
    });

    if (!shortlist) {
      const error: any = new Error('Pitch roster not found');
      error.statusCode = 404;
      throw error;
    }

    if (!shortlist.isPubliclyShared) {
      const error: any = new Error('This pitch link has been disabled by the agency');
      error.statusCode = 403;
      throw error;
    }

    const item = await prisma.shortlistItem.findUnique({
      where: {
        shortlistId_creatorId: {
          shortlistId: shortlist.id,
          creatorId,
        },
      },
    });

    if (!item) {
      const error: any = new Error('Creator not found in this pitch roster');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.shortlistItem.update({
      where: { id: item.id },
      data: {
        clientApprovalStatus: status,
        ...(notes !== undefined ? { clientNotes: notes.trim() } : {}),
      },
    });

    return updated;
  }
}
