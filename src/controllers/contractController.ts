import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ContractService } from '../services/contractService';

export class ContractController {
  static async createContract(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const { creatorId, deliverables, usageRightsDays, exclusivityDays, compensationINR, termsAndConditions } = req.body;

      if (!creatorId || !deliverables || compensationINR === undefined) {
        res.status(400).json({
          success: false,
          message: 'creatorId, deliverables, and compensationINR are required',
        });
        return;
      }

      const contract = await ContractService.createContract({
        campaignId,
        creatorId,
        deliverables,
        usageRightsDays: usageRightsDays ? parseInt(String(usageRightsDays), 10) : undefined,
        exclusivityDays: exclusivityDays ? parseInt(String(exclusivityDays), 10) : undefined,
        compensationINR: parseFloat(String(compensationINR)),
        termsAndConditions,
      });

      res.status(201).json({
        success: true,
        message: 'Digital contract generated successfully',
        data: contract,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignContracts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const contracts = await ContractService.getCampaignContracts(campaignId);

      res.status(200).json({
        success: true,
        data: contracts,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPublicContract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shareToken = String(req.params.shareToken);
      const contract = await ContractService.getContractByToken(shareToken);

      res.status(200).json({
        success: true,
        data: contract,
      });
    } catch (err) {
      next(err);
    }
  }

  static async signContract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shareToken = String(req.params.shareToken);
      const { signedByName } = req.body;

      if (!signedByName || !signedByName.trim()) {
        res.status(400).json({
          success: false,
          message: 'Signatory full name is required for digital execution',
        });
        return;
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const contract = await ContractService.signContract(shareToken, signedByName.trim(), String(clientIp));

      res.status(200).json({
        success: true,
        message: 'Agreement digitally signed & recorded',
        data: contract,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateContractStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const contractId = String(req.params.contractId);
      const { status } = req.body;

      const updated = await ContractService.updateContractStatus(contractId, status);

      res.status(200).json({
        success: true,
        message: 'Contract status updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
