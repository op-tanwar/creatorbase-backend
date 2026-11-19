import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AttributionService } from '../services/attributionService';
import prisma from '../utils/prisma';

export class AttributionController {
  static async createAttribution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const { creatorId, campaignCode, creatorSlug, destinationUrl, promoCode, discountPercent } = req.body;

      if (!creatorId || !campaignCode || !creatorSlug) {
        res.status(400).json({
          success: false,
          message: 'creatorId, campaignCode, and creatorSlug are required',
        });
        return;
      }

      const attribution = await AttributionService.createAttribution({
        campaignId,
        creatorId,
        campaignCode: campaignCode.trim().toLowerCase(),
        creatorSlug: creatorSlug.trim().toLowerCase(),
        destinationUrl,
        promoCode,
        discountPercent: discountPercent ? parseInt(String(discountPercent), 10) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Attribution tracker and UTM link created successfully',
        data: attribution,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignAttributions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const attributions = await AttributionService.getCampaignAttributions(campaignId);

      res.status(200).json({
        success: true,
        data: attributions,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordMetric(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attributionId = String(req.params.attributionId);
      const { clicks = 0, conversions = 0, revenueINR = 0 } = req.body;

      const updated = await AttributionService.recordMetricById(
        attributionId,
        parseInt(String(clicks), 10) || 0,
        parseInt(String(conversions), 10) || 0,
        parseFloat(String(revenueINR)) || 0
      );

      res.status(200).json({
        success: true,
        message: 'Attribution telemetry recorded',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAttribution(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const attributionId = String(req.params.attributionId);
      await AttributionService.deleteAttribution(attributionId);

      res.status(200).json({
        success: true,
        message: 'Attribution tracker deleted',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public click tracker & redirect: GET /api/r/:campaignCode/:creatorSlug
   */
  static async handlePublicRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campaignCode, creatorSlug } = req.params;

      const record = await prisma.campaignAttribution.findUnique({
        where: {
          campaignCode_creatorSlug: {
            campaignCode: String(campaignCode).toLowerCase(),
            creatorSlug: String(creatorSlug).toLowerCase(),
          },
        },
      });

      if (!record) {
        // Fallback redirect to homepage
        res.redirect(302, 'https://creatorbase.in');
        return;
      }

      // Increment click count asynchronously
      await AttributionService.recordClick(record.campaignCode, record.creatorSlug);

      res.redirect(302, record.utmUrl);
    } catch (err) {
      next(err);
    }
  }
}
