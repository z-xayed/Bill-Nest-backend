import { z } from 'zod';
import { Types } from 'mongoose';

const baseBody = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  currency: z.enum(['usd', 'eur', 'bdt']).default('usd'),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()).optional(),
  trialDays: z.number().min(0).optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const createPlanValidationSchema = z.object({
  body: baseBody,
});

export const updatePlanValidationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      price: z.number().positive().optional(),
      currency: z.enum(['usd', 'eur', 'bdt']).optional(),
      interval: z.enum(['month', 'year']).optional(),
      features: z.array(z.string()).optional(),
      trialDays: z.number().min(0).optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' }),
});

export const planIdParamValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1)
      .refine((value) => Types.ObjectId.isValid(value), 'Invalid plan id'),
  }),
});

export const planIdOrSlugParamValidationSchema = z.object({
  params: z.object({ idOrSlug: z.string().min(1) }),
});

export const getPlansQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    search: z.string().optional(),
    interval: z.enum(['month', 'year']).optional(),
    currency: z.enum(['usd', 'eur', 'bdt']).optional(),
    isActive: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .optional()
      .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['price', 'createdAt', 'sortOrder', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
