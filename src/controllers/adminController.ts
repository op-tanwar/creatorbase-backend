import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';
import { PlanType, SubscriptionStatus, PaymentStatus, Platform, Prisma } from '@prisma/client';
import { CreatorService } from '../services/creatorService';

export class AdminController {
  static async getMetrics(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalAgencies,
        activeSubscriptions,
        totalCreators,
        totalShortlists,
        totalCampaigns,
        revenueAggregate,
        planBreakdown,
        recentSignups,
        recentPayments,
        recentCampaigns,
      ] = await Promise.all([
        prisma.user.count({
          where: { role: { not: 'SUPER_ADMIN' } },
        }),
        prisma.user.count({
          where: {
            role: { not: 'SUPER_ADMIN' },
            planType: { not: 'FREE_TRIAL' },
            subscriptionStatus: 'ACTIVE',
            isSuspended: false,
          },
        }),
        prisma.creator.count(),
        prisma.shortlist.count(),
        prisma.campaign.count(),
        prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.user.groupBy({
          by: ['planType'],
          where: { role: { not: 'SUPER_ADMIN' } },
          _count: { id: true },
        }),
        prisma.user.findMany({
          where: { role: { not: 'SUPER_ADMIN' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            planType: true,
            subscriptionStatus: true,
            createdAt: true,
          },
        }),
        prisma.payment.findMany({
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                name: true,
                companyName: true,
                email: true,
              },
            },
          },
        }),
        prisma.campaign.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                companyName: true,
              },
            },
          },
        }),
      ]);

      const totalRevenueINR = (revenueAggregate._sum.amount || 0) / 100;
      const totalTransactionsCount = revenueAggregate._count.id || 0;

      // Consolidate activity stream
      const activityStream = [
        ...recentSignups.map((u) => ({
          id: `signup-${u.id}`,
          type: 'SIGNUP',
          title: `New Organization Joined: ${u.companyName}`,
          description: `${u.name} (${u.email}) on ${u.planType} tier`,
          timestamp: u.createdAt,
          meta: { plan: u.planType, status: u.subscriptionStatus },
        })),
        ...recentPayments.map((p) => ({
          id: `payment-${p.id}`,
          type: 'PAYMENT',
          title: `Payment Received: ₹${(p.amount / 100).toLocaleString('en-IN')}`,
          description: `${p.user.companyName} upgraded to ${p.plan} plan (${p.orderId})`,
          timestamp: p.createdAt,
          meta: { amountINR: p.amount / 100, orderId: p.orderId, plan: p.plan },
        })),
        ...recentCampaigns.map((c) => ({
          id: `campaign-${c.id}`,
          type: 'CAMPAIGN',
          title: `New Campaign: ${c.title}`,
          description: `By ${c.user.companyName} • Budget ₹${c.budgetINR.toLocaleString('en-IN')}`,
          timestamp: c.createdAt,
          meta: { budget: c.budgetINR, status: c.status },
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalAgencies,
            activeSubscriptions,
            totalRevenueINR,
            totalTransactionsCount,
            totalCreators,
            totalShortlists,
            totalCampaigns,
          },
          planBreakdown: planBreakdown.reduce((acc, curr) => {
            acc[curr.planType] = curr._count.id;
            return acc;
          }, {} as Record<string, number>),
          recentActivities: activityStream,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAgencies(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      const search = (req.query.search as string || '').trim();
      const plan = req.query.plan as string;
      const status = req.query.status as string;

      const where: Prisma.UserWhereInput = {
        role: { not: 'SUPER_ADMIN' },
      };

      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (plan && plan !== 'ALL' && Object.values(PlanType).includes(plan as PlanType)) {
        where.planType = plan as PlanType;
      }

      if (status === 'SUSPENDED') {
        where.isSuspended = true;
      } else if (status && status !== 'ALL' && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)) {
        where.subscriptionStatus = status as SubscriptionStatus;
        where.isSuspended = false;
      }

      const [total, agencies] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            role: true,
            planType: true,
            subscriptionStatus: true,
            planExpiresAt: true,
            isSuspended: true,
            suspensionReason: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                shortlists: true,
                campaigns: true,
              },
            },
            payments: {
              where: { status: 'SUCCESS' },
              select: { amount: true },
            },
          },
        }),
      ]);

      const formattedAgencies = agencies.map((agency) => {
        const totalSpentINR = agency.payments.reduce((sum, p) => sum + p.amount / 100, 0);
        const { payments, ...rest } = agency;
        return {
          ...rest,
          totalSpentINR,
          shortlistsCount: agency._count.shortlists,
          campaignsCount: agency._count.campaigns,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          agencies: formattedAgencies,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateAgency(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { planType, planExpiresAt, subscriptionStatus, isSuspended, suspensionReason } = req.body;

      const existing = await prisma.user.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Agency/User not found',
          errors: null,
        });
        return;
      }

      if (existing.role === 'SUPER_ADMIN') {
        res.status(400).json({
          success: false,
          message: 'Cannot modify Super Admin accounts through agency management',
          errors: null,
        });
        return;
      }

      const updateData: Prisma.UserUpdateInput = {};

      if (planType && Object.values(PlanType).includes(planType)) {
        updateData.planType = planType;
      }

      if (subscriptionStatus && Object.values(SubscriptionStatus).includes(subscriptionStatus)) {
        updateData.subscriptionStatus = subscriptionStatus;
      }

      if (planExpiresAt !== undefined) {
        updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
      }

      if (typeof isSuspended === 'boolean') {
        updateData.isSuspended = isSuspended;
        if (isSuspended) {
          updateData.suspensionReason = suspensionReason || 'Suspended by platform administration';
        } else {
          updateData.suspensionReason = null;
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          role: true,
          planType: true,
          subscriptionStatus: true,
          planExpiresAt: true,
          isSuspended: true,
          suspensionReason: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Agency updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      const search = (req.query.search as string || '').trim();
      const status = req.query.status as string;

      const where: Prisma.PaymentWhereInput = {};

      if (status && status !== 'ALL' && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
        where.status = status as PaymentStatus;
      }

      if (search) {
        where.OR = [
          { orderId: { contains: search, mode: 'insensitive' } },
          { paymentId: { contains: search, mode: 'insensitive' } },
          { plan: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { companyName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              },
            },
          },
        }),
      ]);

      const formatted = payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        paymentId: p.paymentId,
        amountINR: p.amount / 100,
        amountPaise: p.amount,
        currency: p.currency,
        plan: p.plan,
        status: p.status,
        createdAt: p.createdAt,
        user: p.user,
      }));

      res.status(200).json({
        success: true,
        data: {
          transactions: formatted,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        handle,
        platform,
        fullName,
        avatarUrl,
        city,
        state,
        niche,
        followerCount,
        engagementRate,
        avgLikes,
        avgComments,
        avgReelViews,
        businessEmail,
        isVerified,
        audienceTopCity,
        audienceFemalePercentage,
        audienceMalePercentage,
      } = req.body;

      if (!handle || !platform || !fullName || !city || !niche) {
        res.status(400).json({
          success: false,
          message: 'Missing required creator fields (handle, platform, fullName, city, niche)',
          errors: null,
        });
        return;
      }

      const cleanHandle = handle.trim().replace(/^@/, '');

      const existing = await prisma.creator.findUnique({
        where: { handle: cleanHandle },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          message: `Creator with handle @${cleanHandle} already exists`,
          errors: null,
        });
        return;
      }

      const creator = await prisma.creator.create({
        data: {
          handle: cleanHandle,
          platform: platform === 'YOUTUBE' ? Platform.YOUTUBE : Platform.INSTAGRAM,
          fullName: fullName.trim(),
          avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80`,
          city: city.trim(),
          state: state ? state.trim() : 'India',
          niche: niche.trim(),
          followerCount: Number(followerCount) || 10000,
          engagementRate: Number(engagementRate) || 3.5,
          avgLikes: Number(avgLikes) || Math.round((Number(followerCount) || 10000) * 0.04),
          avgComments: Number(avgComments) || 100,
          avgReelViews: Number(avgReelViews) || Math.round((Number(followerCount) || 10000) * 1.5),
          businessEmail: businessEmail ? businessEmail.trim() : null,
          isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
          audienceTopCity: audienceTopCity ? audienceTopCity.trim() : city.trim(),
          audienceFemalePercentage: Number(audienceFemalePercentage) || 50,
          audienceMalePercentage: Number(audienceMalePercentage) || 50,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Creator created successfully',
        data: creator,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = { ...req.body };

      const existing = await prisma.creator.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Creator not found',
          errors: null,
        });
        return;
      }

      if (data.handle) {
        data.handle = data.handle.trim().replace(/^@/, '');
        if (data.handle !== existing.handle) {
          const duplicate = await prisma.creator.findUnique({
            where: { handle: data.handle },
          });
          if (duplicate) {
            res.status(409).json({
              success: false,
              message: `Creator with handle @${data.handle} already exists`,
              errors: null,
            });
            return;
          }
        }
      }

      if (data.followerCount !== undefined) data.followerCount = Number(data.followerCount);
      if (data.engagementRate !== undefined) data.engagementRate = Number(data.engagementRate);
      if (data.avgLikes !== undefined) data.avgLikes = Number(data.avgLikes);
      if (data.avgComments !== undefined) data.avgComments = Number(data.avgComments);
      if (data.avgReelViews !== undefined) data.avgReelViews = Number(data.avgReelViews);
      if (data.audienceFemalePercentage !== undefined) data.audienceFemalePercentage = Number(data.audienceFemalePercentage);
      if (data.audienceMalePercentage !== undefined) data.audienceMalePercentage = Number(data.audienceMalePercentage);
      if (data.isVerified !== undefined) data.isVerified = Boolean(data.isVerified);
      if (data.platform) data.platform = data.platform === 'YOUTUBE' ? Platform.YOUTUBE : Platform.INSTAGRAM;

      const updated = await prisma.creator.update({
        where: { id },
        data,
      });

      res.status(200).json({
        success: true,
        message: 'Creator updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const existing = await prisma.creator.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: 'Creator not found',
          errors: null,
        });
        return;
      }

      await prisma.creator.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: `Creator @${existing.handle} deleted successfully`,
        data: { id },
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkApifySync(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { handles, cleanMockData } = req.body;
      
      let cleaned = 0;
      if (cleanMockData) {
        cleaned = await CreatorService.cleanDummyCreators();
      }

      const result = await CreatorService.bulkSeedApifyCreators(
        Array.isArray(handles) && handles.length > 0 ? handles : undefined
      );

      res.status(200).json({
        success: true,
        message: `Bulk Apify sync completed: ${result.count} creators indexed.`,
        data: {
          count: result.count,
          cleanedMockCount: cleaned,
          creators: result.creators,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

