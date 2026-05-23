import { Types } from 'mongoose';
import { AppError } from '../../common/errors/AppError';
import { getPagination } from '../../common/utils/pagination';
import { Plan } from './plan.model';

type CreatePlanPayload = {
  name: string;
  description?: string;
  price: number;
  currency?: 'usd' | 'eur' | 'bdt';
  interval: 'month' | 'year';
  features?: string[];
  trialDays?: number;
  isPopular?: boolean;
  sortOrder?: number;
};

type UpdatePlanPayload = Partial<
  Omit<CreatePlanPayload, 'currency' | 'interval'> & {
    currency: 'usd' | 'eur' | 'bdt';
    interval: 'month' | 'year';
    isActive: boolean;
  }
>;

type GetPlansQuery = {
  page?: number;
  limit?: number;
  search?: string;
  interval?: 'month' | 'year';
  currency?: 'usd' | 'eur' | 'bdt';
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'createdAt' | 'sortOrder' | 'name';
  sortOrder?: 'asc' | 'desc';
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export const createPlan = async (payload: CreatePlanPayload, adminUserId: string) => {
  const slug = slugify(payload.name);

  const existing = await Plan.findOne({
    $or: [{ name: payload.name.trim() }, { slug }],
  });
  if (existing) {
    throw new AppError('Plan already exists', 409, 'PLAN_ALREADY_EXISTS');
  }

  const plan = await Plan.create({
    ...payload,
    name: payload.name.trim(),
    slug,
    createdBy: new Types.ObjectId(adminUserId),
  });

  return { plan };
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

  if (payload.description !== undefined) plan.description = payload.description;
  if (payload.price !== undefined) plan.price = payload.price;
  if (payload.currency !== undefined) plan.currency = payload.currency;
  if (payload.interval !== undefined) plan.interval = payload.interval;
  if (payload.features !== undefined) plan.features = payload.features;
  if (payload.trialDays !== undefined) plan.trialDays = payload.trialDays;
  if (payload.isPopular !== undefined) plan.isPopular = payload.isPopular;
  if (payload.sortOrder !== undefined) plan.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) plan.isActive = payload.isActive;

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
  await plan.save();

  return { plan };
};
