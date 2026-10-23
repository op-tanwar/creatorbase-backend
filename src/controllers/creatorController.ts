import { Request, Response, NextFunction } from 'express';
import { CreatorService } from '../services/creatorService';

export class CreatorController {
  static async getPublicDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city ? String(req.query.city) : undefined;
      const niche = req.query.niche ? String(req.query.niche) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? Math.min(50, parseInt(String(req.query.limit), 10)) : 16;

      const result = await CreatorService.getCreators({
        city: city && city.toLowerCase() !== 'all' ? city : undefined,
        niche: niche && niche.toLowerCase() !== 'all' ? niche : undefined,
        page,
        limit,
      });

      // Mask emails for public programmatic SEO visitors (unlocked via dashboard registration)
      const maskedCreators = result.creators.map((c: any) => {
        let maskedEmail: string | null = null;
        if (c.businessEmail) {
          const parts = c.businessEmail.split('@');
          if (parts.length === 2) {
            const user = parts[0];
            const domain = parts[1];
            maskedEmail = `${user.slice(0, 2)}***@${domain}`;
          }
        }
        return {
          ...c,
          businessEmail: maskedEmail,
          rawEmailLocked: !!c.businessEmail,
        };
      });

      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      res.status(200).json({
        success: true,
        data: {
          ...result,
          creators: maskedCreators,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CreatorService.getCreators(req.query as any);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCreatorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const creator = await CreatorService.getCreatorById(id);
      res.status(200).json({
        success: true,
        data: creator,
      });
    } catch (err) {
      next(err);
    }
  }

  static async syncLiveCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { handle, city, niche, forceRefresh } = req.body;
      if (!handle || typeof handle !== 'string' || !handle.trim()) {
        res.status(400).json({
          success: false,
          message: 'Instagram handle is required.',
        });
        return;
      }

      const result = await CreatorService.syncLiveCreator(
        handle.trim(),
        city,
        niche,
        Boolean(forceRefresh)
      );

      res.status(200).json({
        success: true,
        message: result.isCached
          ? `Creator loaded from cache (last synced ${new Date(result.scrapedAt!).toLocaleTimeString()})`
          : 'Creator synced successfully from Instagram via Apify',
        data: result.creator,
        isCached: result.isCached,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkSeedApify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { handles } = req.body;
      const result = await CreatorService.bulkSeedApifyCreators(
        Array.isArray(handles) ? handles : undefined
      );

      res.status(200).json({
        success: true,
        message: `Bulk Apify sync completed for ${result.count} creators`,
        count: result.count,
        data: result.creators,
      });
    } catch (err) {
      next(err);
    }
  }
}

