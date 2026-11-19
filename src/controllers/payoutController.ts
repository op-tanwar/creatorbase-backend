import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { PayoutService } from '../services/payoutService';

export class PayoutController {
  static async createOrUpdatePayout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const { creatorId, grossFeeINR, tdsSection, advancePaidINR, panNumber, paymentRef } = req.body;

      if (!creatorId || grossFeeINR === undefined) {
        res.status(400).json({
          success: false,
          message: 'creatorId and grossFeeINR are required',
        });
        return;
      }

      const payout = await PayoutService.createOrUpdatePayout({
        campaignId,
        creatorId,
        grossFeeINR: parseFloat(String(grossFeeINR)),
        tdsSection,
        advancePaidINR: advancePaidINR !== undefined ? parseFloat(String(advancePaidINR)) : 0,
        panNumber,
        paymentRef,
      });

      res.status(201).json({
        success: true,
        message: 'Payout ledger updated successfully',
        data: payout,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignPayouts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const payouts = await PayoutService.getCampaignPayouts(campaignId);

      res.status(200).json({
        success: true,
        data: payouts,
      });
    } catch (err) {
      next(err);
    }
  }

  static async settlePayout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payoutId = String(req.params.payoutId);
      const { paymentRef } = req.body;

      const settled = await PayoutService.settlePayout(payoutId, paymentRef);

      res.status(200).json({
        success: true,
        message: 'Payout marked as fully settled',
        data: settled,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deletePayout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payoutId = String(req.params.payoutId);
      await PayoutService.deletePayout(payoutId);

      res.status(200).json({
        success: true,
        message: 'Payout record deleted',
      });
    } catch (err) {
      next(err);
    }
  }
}
