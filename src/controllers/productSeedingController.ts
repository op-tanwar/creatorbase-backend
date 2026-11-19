import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ProductSeedingService } from '../services/productSeedingService';

export class ProductSeedingController {
  static async createSeeding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const {
        creatorId,
        productName,
        productSku,
        productValueINR,
        shippingAddress,
        courierPartner,
        trackingNumber,
        notes,
      } = req.body;

      if (!creatorId || !productName || !shippingAddress) {
        res.status(400).json({
          success: false,
          message: 'creatorId, productName, and shippingAddress are required',
        });
        return;
      }

      const seeding = await ProductSeedingService.createProductSeeding({
        campaignId,
        creatorId,
        productName,
        productSku: productSku || `SKU-${Date.now().toString().slice(-6)}`,
        productValueINR: productValueINR ? parseFloat(String(productValueINR)) : 0,
        shippingAddress,
        courierPartner,
        trackingNumber,
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Product seeding shipment logged successfully',
        data: seeding,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCampaignSeedings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = String(req.params.id);
      const seedings = await ProductSeedingService.getCampaignSeedings(campaignId);

      res.status(200).json({
        success: true,
        data: seedings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSeedingStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const seedingId = String(req.params.seedingId);
      const { shippingStatus, courierPartner, trackingNumber } = req.body;

      if (!shippingStatus) {
        res.status(400).json({
          success: false,
          message: 'shippingStatus is required',
        });
        return;
      }

      const updated = await ProductSeedingService.updateSeedingStatus(
        seedingId,
        shippingStatus,
        courierPartner,
        trackingNumber
      );

      res.status(200).json({
        success: true,
        message: 'Shipping status updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSeeding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const seedingId = String(req.params.seedingId);
      await ProductSeedingService.deleteProductSeeding(seedingId);

      res.status(200).json({
        success: true,
        message: 'Product seeding record deleted',
      });
    } catch (err) {
      next(err);
    }
  }
}
