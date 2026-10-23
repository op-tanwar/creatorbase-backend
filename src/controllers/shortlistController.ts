import { Response, NextFunction } from 'express';
import { ShortlistService } from '../services/shortlistService';
import { AuthenticatedRequest } from '../types';

export class ShortlistController {
  static async getShortlists(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const shortlists = await ShortlistService.getShortlists(userId);
      res.status(200).json({
        success: true,
        data: shortlists,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getShortlistById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const shortlist = await ShortlistService.getShortlistById(userId, id);
      res.status(200).json({
        success: true,
        data: shortlist,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createShortlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const shortlist = await ShortlistService.createShortlist(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Shortlist created successfully',
        data: shortlist,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const item = await ShortlistService.addCreatorToShortlist(userId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Creator added to shortlist',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const creatorId = String(req.params.creatorId);
      const item = await ShortlistService.updateShortlistItem(userId, id, creatorId, req.body);
      res.status(200).json({
        success: true,
        message: 'Shortlist item updated',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeCreator(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const creatorId = String(req.params.creatorId);
      const result = await ShortlistService.removeCreatorFromShortlist(userId, id, creatorId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const shortlistId = String(req.params.shortlistId || req.params.id);
      const creatorId = String(req.params.creatorId);
      const item = await ShortlistService.updateDeliverableStage(userId, shortlistId, creatorId, req.body);
      res.status(200).json({
        success: true,
        message: `Creator deliverable stage updated to ${req.body.stage}`,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getKanban(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const shortlistId = String(req.params.shortlistId || req.params.id);
      const kanban = await ShortlistService.getKanbanBoard(userId, shortlistId);
      res.status(200).json({
        success: true,
        data: kanban,
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = String(req.params.id);
      const { csvContent, filename } = await ShortlistService.exportShortlistCsv(userId, id);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}
