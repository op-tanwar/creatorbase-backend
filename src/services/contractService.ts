import prisma from '../utils/prisma';
import crypto from 'crypto';

export interface CreateContractInput {
  campaignId: string;
  creatorId: string;
  deliverables: string;
  usageRightsDays?: number;
  exclusivityDays?: number;
  compensationINR: number;
  termsAndConditions?: string;
}

export class ContractService {
  static async createContract(input: CreateContractInput) {
    const {
      campaignId,
      creatorId,
      deliverables,
      usageRightsDays = 90,
      exclusivityDays = 30,
      compensationINR,
      termsAndConditions,
    } = input;

    const [campaign, creator] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId } }),
      prisma.creator.findUnique({ where: { id: creatorId } }),
    ]);

    if (!campaign || !creator) {
      throw new Error('Campaign or Creator not found');
    }

    const contractCount = await prisma.creatorContract.count({ where: { campaignId } });
    const contractNumber = `CB-CTR-${Date.now().toString().slice(-6)}-${String(contractCount + 1).padStart(3, '0')}`;
    const shareToken = crypto.randomBytes(16).toString('hex');

    const defaultTerms = termsAndConditions || `1. Scope of Deliverables: The Creator agrees to produce, edit, and publish the following verified deliverables: "${deliverables}" for campaign "${campaign.title}".
2. Exclusivity & Category Lock: The Creator warrants that they will not enter into promotional arrangements with direct competitors within the brand's industry category for a period of ${exclusivityDays} days from asset go-live.
3. Digital Ad Usage Rights: The Brand receives worldwide, non-exclusive rights to whitelist and run paid performance ads with the created content across Meta, Google, and ByteDance networks for ${usageRightsDays} days.
4. Compliance & ASCI Disclosure: All sponsored assets must explicitly feature prominent #ad or #sponsored disclosure in compliance with ASCI and Indian consumer protection guidelines.
5. Commercial Compensation: Net compensation of ₹${compensationINR.toLocaleString('en-IN')} subject to applicable Indian Income Tax withholding (Section 194J/194C TDS).`;

    const contract = await prisma.creatorContract.create({
      data: {
        campaignId,
        creatorId,
        contractNumber,
        deliverables,
        usageRightsDays,
        exclusivityDays,
        compensationINR,
        termsAndConditions: defaultTerms,
        status: 'SENT',
        shareToken,
      },
      include: {
        creator: true,
        campaign: true,
      },
    });

    return contract;
  }

  static async getCampaignContracts(campaignId: string) {
    return prisma.creatorContract.findMany({
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

  static async getContractByToken(shareToken: string) {
    const contract = await prisma.creatorContract.findUnique({
      where: { shareToken },
      include: {
        creator: true,
        campaign: true,
      },
    });

    if (!contract) {
      const err: any = new Error('Contract not found or invalid token');
      err.statusCode = 404;
      throw err;
    }

    return contract;
  }

  static async signContract(shareToken: string, signedByName: string, ipAddress?: string) {
    const contract = await this.getContractByToken(shareToken);

    if (contract.status === 'SIGNED') {
      return contract;
    }

    return prisma.creatorContract.update({
      where: { id: contract.id },
      data: {
        status: 'SIGNED',
        signedByName,
        signedAt: new Date(),
        signedIp: ipAddress || '127.0.0.1',
      },
      include: {
        creator: true,
        campaign: true,
      },
    });
  }

  static async updateContractStatus(contractId: string, status: string) {
    return prisma.creatorContract.update({
      where: { id: contractId },
      data: { status },
    });
  }
}
