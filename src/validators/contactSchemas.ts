import { z } from 'zod';

export const inboundLeadSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  workEmail: z.string().email('Please enter a valid business email address'),
  companyName: z.string().min(2, 'Company name is required'),
  city: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  budgetINR: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type InboundLeadInput = z.infer<typeof inboundLeadSchema>;
