import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(2, 'Campaign title must be at least 2 characters'),
  description: z.string().min(5, 'Campaign description must be at least 5 characters'),
  budgetINR: z.number().positive('Budget must be greater than 0'),
  targetCity: z.string().optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
