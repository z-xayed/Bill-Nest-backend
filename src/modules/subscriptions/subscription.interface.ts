import { Types } from 'mongoose';

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'canceling'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'failed';

export interface ISubscription {
  _id: Types.ObjectId;
  subscriptionRef: string;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  provider: 'stripe';
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  stripeCheckoutSessionId?: string;
  stripePriceId: string;
  pendingPlanId?: Types.ObjectId;
  upgradedFromPlanId?: Types.ObjectId;
  upgradedAt?: Date;
  latestInvoiceId?: string;
  status: SubscriptionStatus;
  priceAtPurchase: number;
  currency: string;
  interval: 'month' | 'year';
  startsAt?: Date;
  expiresAt?: Date;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  isCurrent: boolean;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseSubscriptionPayload = {
  planId: string;
  autoRenew?: boolean;
};

export type UpgradeSubscriptionPayload = {
  planId: string;
};

export type CancelSubscriptionPayload = {
  cancelAtPeriodEnd?: boolean;
};
