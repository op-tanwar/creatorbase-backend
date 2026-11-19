import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { OutreachService } from '../services/outreachService';

export class OutreachController {
  static async sendPitch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { creatorId, campaignId, deliverable, offerINR, brandName, customSubject, customBody } = req.body;

      if (!creatorId) {
        res.status(400).json({ success: false, message: 'creatorId is required' });
        return;
      }

      const result = await OutreachService.sendPitch({
        userId,
        creatorId,
        campaignId,
        deliverable,
        offerINR: offerINR ? parseFloat(offerINR) : undefined,
        brandName,
        customSubject,
        customBody,
      });

      res.status(201).json({
        success: true,
        message: 'Pitch sent successfully to creator',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getThreads(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const threads = await OutreachService.getThreads(userId);
      res.status(200).json({
        success: true,
        data: threads,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getThreadById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const threadId = String(req.params.id);
      const thread = await OutreachService.getThreadById(userId, threadId);
      res.status(200).json({
        success: true,
        data: thread,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const threadId = String(req.params.id);
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'status is required' });
        return;
      }

      const updated = await OutreachService.updateStatus(userId, threadId, status);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reply(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const threadId = String(req.params.id);
      const { message } = req.body;

      if (!message || !message.trim()) {
        res.status(400).json({ success: false, message: 'message body is required' });
        return;
      }

      const sent = await OutreachService.reply(userId, threadId, message.trim());
      res.status(201).json({
        success: true,
        data: sent,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkSend(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { creatorIds, campaignId, deliverable, offerINR, brandName, customSubject, customBody } = req.body;

      if (!creatorIds || !Array.isArray(creatorIds) || creatorIds.length === 0) {
        res.status(400).json({ success: false, message: 'creatorIds array is required' });
        return;
      }

      const result = await OutreachService.bulkSendPitches({
        userId,
        creatorIds,
        campaignId,
        deliverable,
        offerINR: offerINR ? parseFloat(offerINR) : undefined,
        brandName,
        customSubject,
        customBody,
      });

      res.status(200).json({
        success: true,
        message: `Dispatched outreach to ${result.sentCount} of ${result.total} creators`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
