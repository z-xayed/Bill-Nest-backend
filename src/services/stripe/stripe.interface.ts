export type StripeProductInput = {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
};

export type StripeRecurringPriceInput = {
  productId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  metadata?: Record<string, string>;
};

export type StripeProductUpdateInput = {
  name?: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
};

export type StripeCheckoutSessionInput = {
  user: {
    _id: { toString(): string };
    email: string;
    name: string;
  };
  plan: {
    _id: { toString(): string };
    stripePriceId?: string;
  };
  stripeCustomerId: string;
  autoRenew: boolean;
  subscriptionRef: string;
};

export type StripeSubscriptionPriceUpdateInput = {
  stripeSubscriptionId: string;
  stripeSubscriptionItemId: string;
  newStripePriceId: string;
  userId: string;
  newPlanId: string;
};
