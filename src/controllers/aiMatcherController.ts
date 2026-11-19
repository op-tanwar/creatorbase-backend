import { Request, Response, NextFunction } from 'express';
import { AIMatcherService } from '../services/aiMatcherService';

export class AIMatcherController {
  static async matchBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { brief, maxCreators } = req.body;

      if (!brief || typeof brief !== 'string' || brief.trim().length < 5) {
        res.status(400).json({
          success: false,
          message: 'Please provide a descriptive campaign brief (minimum 5 characters).',
        });
        return;
      }

      const roster = await AIMatcherService.matchBrief(
        brief.trim(),
        maxCreators ? parseInt(String(maxCreators), 10) : undefined
      );

      res.status(200).json({
        success: true,
        data: roster,
      });
    } catch (err) {
      next(err);
    }
  }

  static async discover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        query,
        keywords,
        platform,
        city,
        niche,
        minFollowers,
        maxFollowers,
        minCredibility,
        limit,
      } = req.body;

      const result = await AIMatcherService.discoverByKeywords({
        query: query ? String(query) : undefined,
        keywords: Array.isArray(keywords) ? keywords : undefined,
        platform: platform ? String(platform) : undefined,
        city: city ? String(city) : undefined,
        niche: niche ? String(niche) : undefined,
        minFollowers: minFollowers ? parseInt(String(minFollowers), 10) : undefined,
        maxFollowers: maxFollowers ? parseInt(String(maxFollowers), 10) : undefined,
        minCredibility: minCredibility ? parseInt(String(minCredibility), 10) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
