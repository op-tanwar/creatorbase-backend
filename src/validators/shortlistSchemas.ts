import { z } from 'zod';

export const createShortlistSchema = z.object({
  name: z.string().min(1, 'Shortlist name is required'),
  campaignId: z.string().uuid().optional().nullable(),
});

export const addCreatorToShortlistSchema = z.object({
  creatorId: z.string().uuid('Valid Creator ID is required'),
  assignedFeeINR: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateShortlistItemSchema = z.object({
  assignedFeeINR: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const deliverableStageSchema = z.enum([
  'SHORTLISTED',
  'EMAIL_SENT',
  'COMMERCIALS_AGREED',
  'DRAFT_UNDER_REVIEW',
  'LIVE_AND_PAID',
]);

export const updateDeliverableStageSchema = z.object({
  stage: deliverableStageSchema,
  agreedFeeINR: z.number().int().nonnegative().optional().nullable(),
  liveUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  draftUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  deliverableNotes: z.string().optional().nullable(),
});

export type CreateShortlistInput = z.infer<typeof createShortlistSchema>;
export type AddCreatorToShortlistInput = z.infer<typeof addCreatorToShortlistSchema>;
export type UpdateShortlistItemInput = z.infer<typeof updateShortlistItemSchema>;
export type UpdateDeliverableStageInput = z.infer<typeof updateDeliverableStageSchema>;
