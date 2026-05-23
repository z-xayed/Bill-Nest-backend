import { Types } from 'mongoose';
import { AppError } from '../../common/errors/AppError';
import { getPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';
import {
  activateStripePrice,
  createStripeProduct,
  createStripeRecurringPrice,
  deactivateStripePrice,
  updateStripeProduct,
} from '../../services/stripe/stripe.service';
import { CreatePlanPayload, GetPlansQuery, IPlan, UpdatePlanPayload } from './plan.interface';
import { Plan } from './plan.model';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

const isStripeSyncFailureCode = (code: string): boolean => {
  return (
    code === 'STRIPE_PRODUCT_CREATE_FAILED' ||
    code === 'STRIPE_PRICE_CREATE_FAILED' ||
    code === 'STRIPE_PLAN_SYNC_FAILED'
  );
};

const toStripeSyncError = (error: unknown): AppError => {
  if (error instanceof AppError && isStripeSyncFailureCode(error.code)) {
    return new AppError('Failed to sync plan with Stripe', 502, 'STRIPE_PLAN_SYNC_FAILED', {
      causeCode: error.code,
      causeMessage: error.message,
    });
  }

  return new AppError('Failed to sync plan with Stripe', 502, 'STRIPE_PLAN_SYNC_FAILED');
};

const ensureStripeProductId = async (
  plan: Pick<IPlan, '_id' | 'name' | 'slug' | 'description' | 'stripeProductId'>,
): Promise<string> => {
  if (plan.stripeProductId) {
    return plan.stripeProductId;
  }

  const product = await createStripeProduct({
    name: plan.name,
    description: plan.description,
    metadata: {
      planId: plan._id.toString(),
      planSlug: plan.slug,
      source: 'bill-nest',
    },
  });

  return product.id;
};

const ensureStripePriceId = async (
  plan: Pick<IPlan, 'price' | 'currency' | 'interval' | 'stripePriceId'>,
  stripeProductId: string,
): Promise<string> => {
  if (plan.stripePriceId) {
    return plan.stripePriceId;
  }

  const price = await createStripeRecurringPrice({
    productId: stripeProductId,
    amount: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    metadata: {
      source: 'bill-nest',
    },
  });

  return price.id;
};

export const createPlan = async (payload: CreatePlanPayload, adminUserId: string) => {
  const trimmedName = payload.name.trim();
  const slug = slugify(trimmedName);

  const existing = await Plan.findOne({
    $or: [{ name: trimmedName }, { slug }],
  });
  if (existing) {
    throw new AppError('Plan already exists', 409, 'PLAN_ALREADY_EXISTS');
  }

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  try {
    const product = await createStripeProduct({
      name: trimmedName,
      description: payload.description,
      metadata: {
        planName: trimmedName,
        source: 'bill-nest',
      },
    });
    stripeProductId = product.id;

    const price = await createStripeRecurringPrice({
      productId: product.id,
      amount: payload.price,
      currency: payload.currency ?? 'usd',
      interval: payload.interval,
      metadata: {
        planName: trimmedName,
        source: 'bill-nest',
      },
    });
    stripePriceId = price.id;
  } catch (error) {
    throw toStripeSyncError(error);
  }

  try {
    const plan = await Plan.create({
      ...payload,
      name: trimmedName,
      slug,
      stripeProductId,
      stripePriceId,
      createdBy: new Types.ObjectId(adminUserId),
    });

    try {
      await updateStripeProduct(String(stripeProductId), {
        metadata: {
          planId: plan._id.toString(),
          planSlug: plan.slug,
          source: 'bill-nest',
        },
      });
    } catch (error) {
      logger.warn('Stripe product metadata update failed after plan creation', {
        planId: plan._id.toString(),
        stripeProductId,
        error,
      });
    }

    return { plan };
  } catch (error) {
    if (stripeProductId) {
      try {
        await updateStripeProduct(stripeProductId, { active: false });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup Stripe product after plan create DB failure', {
          stripeProductId,
          cleanupError,
        });
      }
    }

    throw error;
  }
};

export const getPlans = async (query: GetPlansQuery) => {
  const { page, limit, skip } = getPagination(query as Record<string, unknown>);

  const filter: Record<string, unknown> = {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.interval) filter.interval = query.interval;
  if (query.currency) filter.currency = query.currency;
  if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
  if (typeof query.minPrice === 'number' || typeof query.maxPrice === 'number') {
    const priceFilter: { $gte?: number; $lte?: number } = {};
    if (typeof query.minPrice === 'number') priceFilter.$gte = query.minPrice;
    if (typeof query.maxPrice === 'number') priceFilter.$lte = query.maxPrice;
    filter.price = priceFilter;
  }

  const sortBy = query.sortBy ?? 'sortOrder';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [plans, total] = await Promise.all([
    Plan.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Plan.countDocuments(filter),
  ]);

  return {
    plans,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const getPlanByIdOrSlug = async (idOrSlug: string) => {
  const filter = isValidObjectId(idOrSlug)
    ? { _id: idOrSlug, isActive: true }
    : { slug: idOrSlug.toLowerCase(), isActive: true };

  const plan = await Plan.findOne(filter);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  return { plan };
};

export const updatePlan = async (
  id: string,
  payload: UpdatePlanPayload,
  adminUserId: string,
) => {
  if (!isValidObjectId(id)) {
    throw new AppError('Invalid plan id', 400, 'INVALID_PLAN_ID');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  if (payload.name && payload.name.trim() !== plan.name) {
    const nextSlug = slugify(payload.name);
    const duplicate = await Plan.findOne({
      _id: { $ne: plan._id },
      $or: [{ name: payload.name.trim() }, { slug: nextSlug }],
    });
    if (duplicate) {
      throw new AppError('Plan already exists', 409, 'PLAN_ALREADY_EXISTS');
    }
    plan.name = payload.name.trim();
    plan.slug = nextSlug;
  }

  const nameChanged = payload.name !== undefined;
  const descriptionChanged = payload.description !== undefined;
  const billingChanged =
    payload.price !== undefined || payload.currency !== undefined || payload.interval !== undefined;

  const oldStripePriceId = plan.stripePriceId;

  if (payload.description !== undefined) plan.description = payload.description;
  if (payload.price !== undefined) plan.price = payload.price;
  if (payload.currency !== undefined) plan.currency = payload.currency;
  if (payload.interval !== undefined) plan.interval = payload.interval;
  if (payload.features !== undefined) plan.features = payload.features;
  if (payload.trialDays !== undefined) plan.trialDays = payload.trialDays;
  if (payload.isPopular !== undefined) plan.isPopular = payload.isPopular;
  if (payload.sortOrder !== undefined) plan.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) plan.isActive = payload.isActive;

  try {
    if (nameChanged || descriptionChanged || billingChanged) {
      const stripeProductId = await ensureStripeProductId(plan);
      plan.stripeProductId = stripeProductId;

      if (nameChanged || descriptionChanged) {
        try {
          await updateStripeProduct(stripeProductId, {
            name: nameChanged ? plan.name : undefined,
            description: descriptionChanged ? plan.description : undefined,
            metadata: {
              planId: plan._id.toString(),
              planSlug: plan.slug,
              source: 'bill-nest',
            },
          });
        } catch (error) {
          logger.warn('Stripe product update failed', {
            planId: plan._id.toString(),
            stripeProductId,
            error,
          });
          throw new AppError('Failed to sync plan with Stripe', 502, 'STRIPE_PLAN_SYNC_FAILED');
        }
      }

      if (billingChanged || !plan.stripePriceId) {
        const newPrice = await createStripeRecurringPrice({
          productId: stripeProductId,
          amount: plan.price,
          currency: plan.currency,
          interval: plan.interval,
          metadata: {
            planId: plan._id.toString(),
            planSlug: plan.slug,
            source: 'bill-nest',
          },
        });

        plan.stripePriceId = newPrice.id;

        if (oldStripePriceId) {
          try {
            await deactivateStripePrice(oldStripePriceId);
            logger.info('Stripe price deactivated', {
              oldStripePriceId,
              planId: plan._id.toString(),
            });
          } catch (error) {
            logger.warn('Stripe price deactivate failed', {
              priceId: oldStripePriceId,
              planId: plan._id.toString(),
              error,
            });
          }
        }
      }
    }
  } catch (error) {
    throw toStripeSyncError(error);
  }

  plan.updatedBy = new Types.ObjectId(adminUserId);
  await plan.save();

  return { plan };
};

export const deletePlan = async (id: string, adminUserId: string) => {
  if (!isValidObjectId(id)) {
    throw new AppError('Invalid plan id', 400, 'INVALID_PLAN_ID');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  plan.isActive = false;
  plan.updatedBy = new Types.ObjectId(adminUserId);
  await plan.save();

  if (plan.stripeProductId) {
    try {
      await updateStripeProduct(plan.stripeProductId, { active: false });
    } catch (error) {
      logger.warn('Stripe product update failed during soft delete', {
        planId: plan._id.toString(),
        stripeProductId: plan.stripeProductId,
        error,
      });
    }
  }

  if (plan.stripePriceId) {
    try {
      await deactivateStripePrice(plan.stripePriceId);
      logger.info('Stripe price deactivated', {
        planId: plan._id.toString(),
        stripePriceId: plan.stripePriceId,
      });
    } catch (error) {
      logger.warn('Stripe price deactivate failed during soft delete', {
        planId: plan._id.toString(),
        stripePriceId: plan.stripePriceId,
        error,
      });
    }
  }

  return { success: true };
};

export const restorePlan = async (id: string, adminUserId: string) => {
  if (!isValidObjectId(id)) {
    throw new AppError('Invalid plan id', 400, 'INVALID_PLAN_ID');
  }

  const plan = await Plan.findById(id);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  plan.isActive = true;
  plan.updatedBy = new Types.ObjectId(adminUserId);

  try {
    const stripeProductId = await ensureStripeProductId(plan);
    plan.stripeProductId = stripeProductId;

    const stripePriceId = await ensureStripePriceId(plan, stripeProductId);
    plan.stripePriceId = stripePriceId;

    await updateStripeProduct(stripeProductId, { active: true });
    await activateStripePrice(stripePriceId);
  } catch (error) {
    logger.warn('Stripe restore failed for plan', {
      planId: plan._id.toString(),
      error,
    });
    throw toStripeSyncError(error);
  }

  await plan.save();

  return { plan };
};

export const syncPlanWithStripe = async (planId: string, adminUserId: string) => {
  if (!isValidObjectId(planId)) {
    throw new AppError('Invalid plan id', 400, 'INVALID_PLAN_ID');
  }

  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  try {
    const stripeProductId = await ensureStripeProductId(plan);
    const stripePriceId = await ensureStripePriceId(plan, stripeProductId);

    plan.stripeProductId = stripeProductId;
    plan.stripePriceId = stripePriceId;
    plan.updatedBy = new Types.ObjectId(adminUserId);

    await updateStripeProduct(stripeProductId, {
      metadata: {
        planId: plan._id.toString(),
        planSlug: plan.slug,
        source: 'bill-nest',
      },
    });

    await plan.save();

    logger.info('Plan synced with Stripe', {
      planId: plan._id.toString(),
      stripeProductId,
      stripePriceId,
    });

    return { plan };
  } catch (error) {
    throw toStripeSyncError(error);
  }
};

export const syncMissingPlansWithStripe = async (adminUserId: string) => {
  const plans = await Plan.find({
    isActive: true,
    $or: [{ stripeProductId: { $exists: false } }, { stripeProductId: '' }, { stripePriceId: { $exists: false } }, { stripePriceId: '' }],
  });

  const syncedPlans: IPlan[] = [];

  for (const plan of plans) {
    const result = await syncPlanWithStripe(plan._id.toString(), adminUserId);
    syncedPlans.push(result.plan);
  }

  return {
    syncedCount: syncedPlans.length,
    plans: syncedPlans,
  };
};
