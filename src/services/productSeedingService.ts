import prisma from '../utils/prisma';

export interface CreateProductSeedingInput {
  campaignId: string;
  creatorId: string;
  productName: string;
  productSku: string;
  productValueINR?: number;
  shippingAddress: string;
  courierPartner?: string;
  trackingNumber?: string;
  notes?: string;
}

export class ProductSeedingService {
  static async createProductSeeding(input: CreateProductSeedingInput) {
    const {
      campaignId,
      creatorId,
      productName,
      productSku,
      productValueINR = 0,
      shippingAddress,
      courierPartner = 'Bluedart',
      trackingNumber,
      notes,
    } = input;

    const [campaign, creator] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId } }),
      prisma.creator.findUnique({ where: { id: creatorId } }),
    ]);

    if (!campaign || !creator) {
      throw new Error('Campaign or Creator not found');
    }

    const seeding = await prisma.productSeeding.create({
      data: {
        campaignId,
        creatorId,
        productName,
        productSku,
        productValueINR,
        shippingAddress,
        courierPartner,
        trackingNumber: trackingNumber || `BD-${Date.now().toString().slice(-8)}`,
        shippingStatus: trackingNumber ? 'DISPATCHED' : 'PREPARING',
        dispatchedAt: trackingNumber ? new Date() : null,
        notes,
      },
      include: {
        creator: true,
      },
    });

    return seeding;
  }

  static async getCampaignSeedings(campaignId: string) {
    return prisma.productSeeding.findMany({
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
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateSeedingStatus(
    seedingId: string,
    status: string,
    courierPartner?: string,
    trackingNumber?: string
  ) {
    const updateData: any = { shippingStatus: status };
    if (courierPartner) updateData.courierPartner = courierPartner;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    if (status === 'DISPATCHED' && !updateData.dispatchedAt) {
      updateData.dispatchedAt = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    return prisma.productSeeding.update({
      where: { id: seedingId },
      data: updateData,
      include: {
        creator: true,
      },
    });
  }

  static async deleteProductSeeding(seedingId: string) {
    return prisma.productSeeding.delete({
      where: { id: seedingId },
    });
  }
}
