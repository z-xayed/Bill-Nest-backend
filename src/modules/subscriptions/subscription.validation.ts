import { z } from 'zod';
import { Types } from 'mongoose';

export const purchaseSubscriptionValidationSchema = z.object({
  body: z.object({
    planId: z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid plan id'),
    autoRenew: z.boolean().optional().default(true),
  }),
});

export const upgradeSubscriptionValidationSchema = z.object({
  body: z.object({
    planId: z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid plan id'),
  }),
});

export const cancelSubscriptionValidationSchema = z.object({
  body: z.object({
    cancelAtPeriodEnd: z.boolean().optional().default(true),
  }),
});
