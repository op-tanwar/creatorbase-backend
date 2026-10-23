import { z } from 'zod';

const safeInt = (val: unknown, fallback: number | undefined = undefined, min?: number, max?: number): number | undefined => {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseInt(String(val), 10);
  if (isNaN(num)) return fallback;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
};

const safeFloat = (val: unknown, fallback: number | undefined = undefined, min?: number, max?: number): number | undefined => {
  if (val === undefined || val === null || val === '') return fallback;
  const num = parseFloat(String(val));
  if (isNaN(num)) return fallback;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
};

export const creatorQuerySchema = z.object({
  page: z.any().optional().transform((val) => safeInt(val, 1, 1)!),
  limit: z.any().optional().transform((val) => safeInt(val, 12, 1, 100)!),
  platform: z.enum(['INSTAGRAM', 'YOUTUBE', 'ALL']).optional(),
  city: z.string().optional(),
  niche: z.string().optional(),
  minFollowers: z.any().optional().transform((val) => safeInt(val, 5000, 5000)),
  maxFollowers: z.any().optional().transform((val) => safeInt(val, undefined, 5000)),
  minEngagement: z.any().optional().transform((val) => safeFloat(val, 1.0, 1.0, 100)),
  search: z.string().optional(),
});

export type CreatorQueryInput = z.infer<typeof creatorQuerySchema>;
