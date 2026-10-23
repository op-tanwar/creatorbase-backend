import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { EnrichmentService } from '../services/enrichmentService';

export class EnrichmentController {
  /**
   * Uploads and parses CSV, initiates enrichment job
   */
  static async uploadCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No CSV file provided. Please upload a .csv file.',
          errors: null,
        });
        return;
      }

      if (!file.originalname.toLowerCase().endsWith('.csv') && file.mimetype !== 'text/csv' && file.mimetype !== 'application/vnd.ms-excel') {
        res.status(400).json({
          success: false,
          message: 'Invalid file format. Only .csv files are supported.',
          errors: null,
        });
        return;
      }

      // Parse handles from CSV
      const { handles, originalRowCount } = await EnrichmentService.parseCsvHandles(file.buffer);

      // Start enrichment pipeline
      const job = await EnrichmentService.startEnrichmentJob(userId, file.originalname, handles);

      res.status(201).json({
        success: true,
        message: `Enrichment job initiated for ${handles.length} creator handles.`,
        data: {
          jobId: job.id,
          fileName: job.fileName,
          totalRows: job.totalRows,
          originalRowCount,
          status: job.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Returns real-time progress and logs of an ongoing or completed job
   */
  static async getJobStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = String(req.params.id);

      const job = await EnrichmentService.getJobById(userId, jobId);

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates and downloads RFC-4180 compliant CSV stream with UTF-8 BOM
   */
  static async exportEnrichedCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = String(req.params.id);

      const { csvContent, filename } = await EnrichmentService.generateExportCsv(userId, jobId);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Returns monthly enrichment credit quota for active user
   */
  static async getQuota(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const quota = await EnrichmentService.getUserQuota(userId);

      res.status(200).json({
        success: true,
        data: quota,
      });
    } catch (err) {
      next(err);
    }
  }
}
