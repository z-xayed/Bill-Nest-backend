import { Types } from 'mongoose';

export type PlanInterval = 'month' | 'year';
export type PlanCurrency = 'usd' | 'eur' | 'bdt';

export interface IPlan {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: PlanCurrency;
  interval: PlanInterval;
  features: string[];
  trialDays?: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePlanPayload = {
  name: string;
  description?: string;
  price: number;
  currency?: PlanCurrency;
  interval: PlanInterval;
  features?: string[];
  trialDays?: number;
  isPopular?: boolean;
  sortOrder?: number;
};

export type UpdatePlanPayload = Partial<
  Omit<CreatePlanPayload, 'currency' | 'interval'> & {
    currency: PlanCurrency;
    interval: PlanInterval;
    isActive: boolean;
  }
>;

export type GetPlansQuery = {
  page?: number;
  limit?: number;
  search?: string;
  interval?: PlanInterval;
  currency?: PlanCurrency;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'createdAt' | 'sortOrder' | 'name';
  sortOrder?: 'asc' | 'desc';
};
