import { ISubscription, SubscriptionStatus } from './subscription.interface';

export const isSubscriptionCurrentlyActive = (subscription: ISubscription): boolean => {
  if (!subscription.expiresAt) return false;
  const activeStatus = subscription.status === 'active' || subscription.status === 'canceling';
  return activeStatus && subscription.expiresAt.getTime() > Date.now();
};

export const mapStripeSubscriptionStatus = (
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
): SubscriptionStatus => {
  if (stripeStatus === 'active' && cancelAtPeriodEnd) return 'canceling';

  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'failed',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    paused: 'expired',
  };

  return statusMap[stripeStatus] ?? 'failed';
};
