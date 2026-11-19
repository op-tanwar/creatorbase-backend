import prisma from '../utils/prisma';

export interface CreatePayoutInput {
  campaignId: string;
  creatorId: string;
  grossFeeINR: number;
  tdsSection?: '194J' | '194C';
  advancePaidINR?: number;
  panNumber?: string;
  paymentRef?: string;
}

export class PayoutService {
  static async createOrUpdatePayout(input: CreatePayoutInput) {
    const {
      campaignId,
      creatorId,
      grossFeeINR,
      tdsSection = '194J',
      advancePaidINR = 0,
      panNumber,
      paymentRef,
    } = input;

    // Indian TDS Rates: Section 194J is 10% (fees for professional/influencer services); 194C is 2% (contracts)
    const tdsRate = tdsSection === '194C' ? 2 : 10;
    const tdsAmountINR = Math.round((grossFeeINR * tdsRate) / 100);
    const netPayableINR = grossFeeINR - tdsAmountINR;
    const balanceDueINR = Math.max(0, netPayableINR - advancePaidINR);

    const payoutStatus =
      balanceDueINR === 0
        ? 'FULLY_SETTLED'
        : advancePaidINR > 0
        ? 'ADVANCE_PAID'
        : 'PENDING';

    const existing = await prisma.campaignPayout.findFirst({
      where: { campaignId, creatorId },
    });

    if (existing) {
      return prisma.campaignPayout.update({
        where: { id: existing.id },
        data: {
          grossFeeINR,
          tdsSection,
          tdsRate,
          tdsAmountINR,
          netPayableINR,
          advancePaidINR,
          balanceDueINR,
          payoutStatus,
          panNumber: panNumber || existing.panNumber,
          paymentRef: paymentRef || existing.paymentRef,
          settledAt: payoutStatus === 'FULLY_SETTLED' ? new Date() : null,
        },
      });
    }

    return prisma.campaignPayout.create({
      data: {
        campaignId,
        creatorId,
        grossFeeINR,
        tdsSection,
        tdsRate,
        tdsAmountINR,
        netPayableINR,
        advancePaidINR,
        balanceDueINR,
        payoutStatus,
        panNumber: panNumber || null,
        paymentRef: paymentRef || null,
        settledAt: payoutStatus === 'FULLY_SETTLED' ? new Date() : null,
      },
    });
  }

  static async getCampaignPayouts(campaignId: string) {
    return prisma.campaignPayout.findMany({
      where: { campaignId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            fullName: true,
            avatarUrl: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async settlePayout(payoutId: string, paymentRef?: string) {
    const payout = await prisma.campaignPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new Error('Payout record not found');

    return prisma.campaignPayout.update({
      where: { id: payoutId },
      data: {
        advancePaidINR: payout.netPayableINR,
        balanceDueINR: 0,
        payoutStatus: 'FULLY_SETTLED',
        paymentRef: paymentRef || payout.paymentRef || `IMPS-${Date.now()}`,
        settledAt: new Date(),
      },
    });
  }

  static async deletePayout(payoutId: string) {
    return prisma.campaignPayout.delete({
      where: { id: payoutId },
    });
  }
}
