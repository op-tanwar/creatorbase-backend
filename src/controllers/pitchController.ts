import { Request, Response, NextFunction } from 'express';
import { PitchService } from '../services/pitchService';
import { ClientApprovalStatus } from '@prisma/client';

export class PitchController {
  static async getPitch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shareToken = String(req.params.shareToken);
      const pitch = await PitchService.getPitchByToken(shareToken);

      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      res.status(200).json({
        success: true,
        data: pitch,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shareToken = String(req.params.shareToken);
      const creatorId = String(req.params.creatorId);
      const { status, notes } = req.body;

      if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be PENDING, APPROVED, or REJECTED',
          errors: null,
        });
        return;
      }

      const updated = await PitchService.updateApproval(
        shareToken,
        creatorId,
        status as ClientApprovalStatus,
        notes
      );

      res.status(200).json({
        success: true,
        message: `Creator status updated to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
