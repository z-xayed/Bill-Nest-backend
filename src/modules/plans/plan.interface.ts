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
