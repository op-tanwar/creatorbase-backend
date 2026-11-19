import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ContentMonitorService } from '../services/contentMonitorService';

export class ContentMonitorController {
  static async trackPost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const { creatorId, postUrl, mediaType, agreedFeeINR } = req.body;

      if (!creatorId || !postUrl) {
        res.status(400).json({
          success: false,
          message: 'creatorId and postUrl are required',
        });
        return;
      }

      const post = await ContentMonitorService.trackPost({
        campaignId,
        creatorId,
        postUrl,
        mediaType,
        agreedFeeINR: agreedFeeINR ? parseFloat(String(agreedFeeINR)) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Post successfully tracked and verified',
        data: post,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignPosts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const posts = await ContentMonitorService.getCampaignPosts(campaignId);

      res.status(200).json({
        success: true,
        data: posts,
      });
    } catch (err) {
      next(err);
    }
  }

  static async syncMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const syncResult = await ContentMonitorService.syncCampaignMetrics(campaignId);

      res.status(200).json({
        success: true,
        message: 'Campaign metrics synchronized successfully',
        data: syncResult,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deletePost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = String(req.params.postId);
      await ContentMonitorService.deletePost(postId);

      res.status(200).json({
        success: true,
        message: 'Post tracking removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
