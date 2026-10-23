import { Readable } from 'stream';
import csvParser from 'csv-parser';
import prisma from '../utils/prisma';
import { ApifyService } from './apifyService';
import { computeAuthenticityScore } from './creatorService';

export interface EnrichedCreatorResult {
  handle: string;
  platform: 'INSTAGRAM' | 'YOUTUBE';
  fullName: string;
  avatarUrl: string;
  followerCount: number;
  engagementRate: number;
  avgReelViews: number;
  businessEmail: string | null;
  city: string;
  niche: string;
  authenticityScore: number;
  isCached: boolean;
  status: 'SUCCESS' | 'NOT_FOUND' | 'FAILED';
  error?: string;
}

export class EnrichmentService {
  /**
   * Sanitizes raw handle string into clean lowercase handle
   */
  public static sanitizeHandle(raw: string): string {
    if (!raw) return '';
    let clean = String(raw).trim();
    // Strip URL prefixes like https://www.instagram.com/
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|youtube\.com)\/?/i, '');
    clean = clean.replace(/\?.*$/, ''); // strip query parameters
    clean = clean.replace(/\/.*$/, ''); // strip trailing path segments
    clean = clean.replace(/^@+/, ''); // strip leading @ symbols
    clean = clean.replace(/[\s\t\r\n]+/g, ''); // strip internal whitespace
    return clean.toLowerCase();
  }

  /**
   * Parses uploaded CSV buffer, detects handle column, and returns unique sanitized handles
   */
  public static async parseCsvHandles(buffer: Buffer): Promise<{ handles: string[]; originalRowCount: number }> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(
          csvParser({
            mapHeaders: ({ header }) => header.trim().toLowerCase(),
          })
        )
        .on('data', (data) => rows.push(data))
        .on('end', () => {
          if (rows.length === 0) {
            return reject(new Error('CSV file is empty or could not be parsed.'));
          }

          // Auto-detect handle column
          const headers = Object.keys(rows[0] || {});
          const handleHeader =
            headers.find((h) =>
              /^(handle|username|instagram|profile|link|creator|url|account|ig|insta)$/i.test(h)
            ) ||
            headers.find((h) => h.includes('handle') || h.includes('user') || h.includes('instagram')) ||
            headers[0];

          if (!handleHeader) {
            return reject(new Error('Could not detect a valid handle/username column in CSV.'));
          }

          const rawHandles = rows.map((r) => r[handleHeader]).filter(Boolean);
          const sanitizedSet = new Set<string>();

          for (const raw of rawHandles) {
            const clean = EnrichmentService.sanitizeHandle(raw);
            if (clean && clean.length >= 2 && clean.length <= 40 && !clean.includes('example.com')) {
              sanitizedSet.add(clean);
            }
          }

          const uniqueHandles = Array.from(sanitizedSet);
          if (uniqueHandles.length === 0) {
            return reject(
              new Error('No valid Instagram or YouTube creator handles found in the uploaded file.')
            );
          }

          if (uniqueHandles.length > 500) {
            return reject(
              new Error(
                `File contains ${uniqueHandles.length} handles. Maximum allowed is 500 rows per batch.`
              )
            );
          }

          resolve({
            handles: uniqueHandles,
            originalRowCount: rows.length,
          });
        })
        .on('error', (err) => reject(new Error(`Failed to parse CSV: ${err.message}`)));
    });
  }

  /**
   * Retrieves and refreshes monthly quota limits for a user
   */
  public static async getUserQuota(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        planType: true,
        enrichmentCreditsUsed: true,
        enrichmentCreditsLimit: true,
        creditsResetAt: true,
      },
    });

    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    // Monthly rollover reset
    if (user.creditsResetAt && now > user.creditsResetAt) {
      const nextReset = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          enrichmentCreditsUsed: 0,
          creditsResetAt: nextReset,
        },
      });
      return {
        used: 0,
        limit: updated.enrichmentCreditsLimit,
        remaining: updated.enrichmentCreditsLimit,
        resetAt: nextReset,
        planType: user.planType,
      };
    }

    const remaining = Math.max(0, user.enrichmentCreditsLimit - user.enrichmentCreditsUsed);
    return {
      used: user.enrichmentCreditsUsed,
      limit: user.enrichmentCreditsLimit,
      remaining,
      resetAt: user.creditsResetAt,
      planType: user.planType,
    };
  }

  /**
   * Spawns an EnrichmentJob and processes it with local caching + batched Apify live queries
   */
  public static async startEnrichmentJob(userId: string, fileName: string, handles: string[]) {
    // 1. Quota Enforcement
    const quota = await this.getUserQuota(userId);
    if (handles.length > quota.remaining) {
      const err: any = new Error(
        `Insufficient enrichment quota. File has ${handles.length} creators, but you only have ${quota.remaining} credits remaining this month. Please upgrade your plan or reduce row count.`
      );
      err.statusCode = 403;
      throw err;
    }

    // 2. Create Job in database
    const job = await prisma.enrichmentJob.create({
      data: {
        userId,
        fileName,
        totalRows: handles.length,
        processedRows: 0,
        status: 'PROCESSING',
        logs: [
          `[INITIALIZE] Upload received: "${fileName}" with ${handles.length} unique creator handles.`,
          `[QUOTA] User has ${quota.remaining} / ${quota.limit} credits remaining.`,
          `[CACHE] Querying Neon PostgreSQL for 7-day verified records...`,
        ],
        results: [],
      },
    });

    // 3. Run execution asynchronously in background so client gets instant Job ID
    this.executeEnrichment(job.id, userId, handles).catch((err) => {
      console.error(`[EnrichmentService] Error in job ${job.id}:`, err);
    });

    return job;
  }

  /**
   * Background processor: executes cache check + batched Apify scraping
   */
  private static async executeEnrichment(jobId: string, userId: string, handles: string[]) {
    const logs: string[] = [
      `[INITIALIZE] Commencing distributed enrichment pipeline for ${handles.length} handles.`,
    ];
    const results: EnrichedCreatorResult[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    try {
      // Step A: Local Smart Cache Check (costs 0 credits)
      const existingInDb = await prisma.creator.findMany({
        where: {
          handle: { in: handles, mode: 'insensitive' },
        },
      });

      const existingMap = new Map<string, any>();
      for (const c of existingInDb) {
        existingMap.set(c.handle.toLowerCase(), c);
      }

      const staleOrMissingHandles: string[] = [];

      for (const h of handles) {
        const cached = existingMap.get(h.toLowerCase());
        // Fresh if updated within 7 days
        if (cached && cached.updatedAt && cached.updatedAt > sevenDaysAgo) {
          const score = computeAuthenticityScore(cached);
          results.push({
            handle: cached.handle,
            platform: cached.platform || 'INSTAGRAM',
            fullName: cached.fullName,
            avatarUrl: cached.avatarUrl,
            followerCount: cached.followerCount,
            engagementRate: cached.engagementRate,
            avgReelViews: cached.avgReelViews,
            businessEmail: cached.businessEmail,
            city: cached.city,
            niche: cached.niche,
            authenticityScore: score,
            isCached: true,
            status: 'SUCCESS',
          });
          logs.push(
            `[CACHE HIT] @${cached.handle} -> ${cached.followerCount.toLocaleString('en-IN')} followers, ${cached.engagementRate}% ER, Email: ${cached.businessEmail || 'Locked'} (0 credits)`
          );
        } else {
          staleOrMissingHandles.push(h);
        }
      }

      // Update intermediate progress
      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          processedRows: results.length,
          results: results as any,
          logs,
        },
      });

      // Step B: Batch Apify Scraper for missing or stale creators
      if (staleOrMissingHandles.length > 0) {
        logs.push(
          `[APIFY QUEUE] ${staleOrMissingHandles.length} handles require live Apify ingestion. Batching in groups of 12...`
        );

        const BATCH_SIZE = 12;
        for (let i = 0; i < staleOrMissingHandles.length; i += BATCH_SIZE) {
          const batch = staleOrMissingHandles.slice(i, i + BATCH_SIZE);
          logs.push(
            `[APIFY BATCH ${Math.floor(i / BATCH_SIZE) + 1}] Querying Apify Instagram Actor for: ${batch.join(', ')}...`
          );

          try {
            const scrapedItems = await ApifyService.scrapeInstagramBatch(batch);
            const scrapedMap = new Map<string, any>();
            for (const s of scrapedItems) {
              scrapedMap.set(s.handle.toLowerCase(), s);
            }

            for (const h of batch) {
              const scraped = scrapedMap.get(h.toLowerCase());
              if (scraped) {
                // Upsert back to database
                const upserted = await prisma.creator.upsert({
                  where: { handle: scraped.handle },
                  update: {
                    fullName: scraped.fullName,
                    avatarUrl: scraped.avatarUrl,
                    bio: scraped.bio,
                    postsCount: scraped.postsCount,
                    followerCount: scraped.followerCount,
                    followingCount: scraped.followingCount,
                    engagementRate: scraped.engagementRate,
                    avgReelViews: scraped.avgReelViews,
                    businessEmail: scraped.businessEmail,
                    isVerified: scraped.isVerified,
                    city: scraped.city,
                    niche: scraped.niche,
                    lastScrapedAt: new Date(),
                  },
                  create: {
                    platform: scraped.platform || 'INSTAGRAM',
                    handle: scraped.handle,
                    fullName: scraped.fullName,
                    avatarUrl: scraped.avatarUrl,
                    bio: scraped.bio,
                    postsCount: scraped.postsCount,
                    followerCount: scraped.followerCount,
                    followingCount: scraped.followingCount,
                    engagementRate: scraped.engagementRate,
                    avgLikes: Math.round(scraped.followerCount * (scraped.engagementRate / 100)),
                    avgComments: Math.round(scraped.followerCount * 0.002),
                    avgReelViews: scraped.avgReelViews,
                    businessEmail: scraped.businessEmail,
                    isVerified: scraped.isVerified,
                    city: scraped.city,
                    state: 'India',
                    niche: scraped.niche,
                    audienceTopCity: scraped.city,
                    audienceFemalePercentage: 50,
                    audienceMalePercentage: 50,
                    lastScrapedAt: new Date(),
                  },
                });

                const score = computeAuthenticityScore(upserted);
                results.push({
                  handle: upserted.handle,
                  platform: upserted.platform,
                  fullName: upserted.fullName,
                  avatarUrl: upserted.avatarUrl,
                  followerCount: upserted.followerCount,
                  engagementRate: upserted.engagementRate,
                  avgReelViews: upserted.avgReelViews,
                  businessEmail: upserted.businessEmail,
                  city: upserted.city,
                  niche: upserted.niche,
                  authenticityScore: score,
                  isCached: false,
                  status: 'SUCCESS',
                });
                logs.push(
                  `[APIFY LIVE] @${upserted.handle} -> ${upserted.followerCount.toLocaleString('en-IN')} followers, ${upserted.engagementRate}% ER, Email: ${upserted.businessEmail || 'Unlisted'}`
                );
              } else {
                // If not found in Apify, record not found
                results.push({
                  handle: h,
                  platform: 'INSTAGRAM',
                  fullName: h,
                  avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(h)}&background=27272a&color=a1a1aa`,
                  followerCount: 0,
                  engagementRate: 0,
                  avgReelViews: 0,
                  businessEmail: null,
                  city: 'Unindexed',
                  niche: 'General',
                  authenticityScore: 0,
                  isCached: false,
                  status: 'NOT_FOUND',
                  error: 'Profile private, deactivated, or not found on Instagram',
                });
                logs.push(`[NOT FOUND] @${h} -> Profile private or could not be audited`);
              }
            }
          } catch (batchErr: any) {
            logs.push(`[BATCH ERROR] Error processing batch: ${batchErr.message}`);
            for (const h of batch) {
              results.push({
                handle: h,
                platform: 'INSTAGRAM',
                fullName: h,
                avatarUrl: '',
                followerCount: 0,
                engagementRate: 0,
                avgReelViews: 0,
                businessEmail: null,
                city: 'Unknown',
                niche: 'Unknown',
                authenticityScore: 0,
                isCached: false,
                status: 'FAILED',
                error: batchErr.message,
              });
            }
          }

          // Update progress after each batch
          await prisma.enrichmentJob.update({
            where: { id: jobId },
            data: {
              processedRows: results.length,
              results: results as any,
              logs,
            },
          });
        }
      }

      // Step C: Deduct actual Apify credits used
      const liveEnrichedCount = results.filter((r) => !r.isCached && r.status === 'SUCCESS').length;
      if (liveEnrichedCount > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            enrichmentCreditsUsed: {
              increment: liveEnrichedCount,
            },
          },
        });
        logs.push(
          `[CREDITS DEDUCTED] Successfully deducted ${liveEnrichedCount} live enrichment credits. (${results.filter((r) => r.isCached).length} cached profiles were free!)`
        );
      }

      logs.push(`[COMPLETED] Enrichment pipeline finished. ${results.length} total rows processed.`);

      // Final job update
      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          processedRows: results.length,
          status: 'COMPLETED',
          results: results as any,
          logs,
        },
      });
    } catch (err: any) {
      console.error(`[EnrichmentService] Fatal job error ${jobId}:`, err);
      logs.push(`[FATAL ERROR] Job failed: ${err.message}`);
      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          logs,
        },
      });
    }
  }

  /**
   * Retrieves an EnrichmentJob by ID ensuring user authorization
   */
  public static async getJobById(userId: string, jobId: string) {
    const job = await prisma.enrichmentJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      const error: any = new Error('Enrichment job not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const percentage =
      job.totalRows > 0 ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100)) : 0;

    return {
      id: job.id,
      fileName: job.fileName,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      percentage,
      status: job.status,
      logs: (job.logs as unknown as string[]) || [],
      results: (job.results as unknown as EnrichedCreatorResult[]) || [],
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * Generates RFC-4180 compliant CSV stream with UTF-8 BOM for Excel compatibility
   */
  public static async generateExportCsv(userId: string, jobId: string) {
    const job = await this.getJobById(userId, jobId);

    const headers = [
      'Handle',
      'Platform',
      'Full Name',
      'Audited Followers',
      'Engagement Rate (%)',
      'Avg Reel Views',
      'Verified Business Email',
      'City',
      'Niche',
      'Authenticity Score',
      'Cache Status',
      'Enrichment Status',
    ];

    const escapeCsvField = (field: any) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [];
    rows.push(headers.join(','));

    for (const r of job.results) {
      const row = [
        escapeCsvField(`@${r.handle}`),
        escapeCsvField(r.platform),
        escapeCsvField(r.fullName),
        escapeCsvField(r.followerCount),
        escapeCsvField(r.engagementRate),
        escapeCsvField(r.avgReelViews),
        escapeCsvField(r.businessEmail || 'N/A'),
        escapeCsvField(r.city),
        escapeCsvField(r.niche),
        escapeCsvField(r.authenticityScore),
        escapeCsvField(r.isCached ? 'CACHED' : 'LIVE_SCRAPED'),
        escapeCsvField(r.status),
      ];
      rows.push(row.join(','));
    }

    // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const cleanFileName = job.fileName.replace(/\.csv$/i, '');
    const exportFileName = `CreatorBase_Enriched_${cleanFileName}_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      csvContent,
      filename: exportFileName,
    };
  }
}
