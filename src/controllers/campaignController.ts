import { Response, NextFunction } from 'express';
import { CampaignService } from '../services/campaignService';
import { AuthenticatedRequest } from '../types';

export class CampaignController {
  static async getCampaigns(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const campaigns = await CampaignService.getCampaigns(userId);
      res.status(200).json({
        success: true,
        data: campaigns,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const campaign = await CampaignService.createCampaign(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const campaign = await CampaignService.getCampaignById(userId, id);
      res.status(200).json({
        success: true,
        data: campaign,
      });
    } catch (err) {
      next(err);
    }
  }
}
