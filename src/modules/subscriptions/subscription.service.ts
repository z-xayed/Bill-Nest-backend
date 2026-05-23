import { Types } from 'mongoose';
import { AppError } from '../../common/errors/AppError';
import { generateRef } from '../../common/utils/generateRef';
import { getPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';
import {
  cancelStripeSubscriptionAtPeriodEnd,
  createSubscriptionCheckoutSession,
  getOrCreateStripeCustomer,
  updateStripeSubscriptionPrice,
} from '../../services/stripe/stripe.service';
import { Plan } from '../plans/plan.model';
import { User } from '../users/user.model';
import {
  CancelSubscriptionPayload,
  PurchaseSubscriptionPayload,
  SubscriptionStatus,
  UpgradeSubscriptionPayload,
} from './subscription.interface';
import { Subscription } from './subscription.model';
import { isSubscriptionCurrentlyActive } from './subscription.utils';

const getCurrentSubscriptionOrThrow = async (userId: string) => {
  const currentSubscription = await Subscription.findOne({
    userId,
    isCurrent: true,
  }).populate('planId');

  if (!currentSubscription) {
    throw new AppError('No active subscription found', 404, 'NO_ACTIVE_SUBSCRIPTION');
  }

  if (!(currentSubscription.status === 'active' || currentSubscription.status === 'canceling')) {
    throw new AppError('Subscription is not active', 400, 'SUBSCRIPTION_NOT_ACTIVE');
  }

  if (!currentSubscription.expiresAt) {
    throw new AppError('Subscription is not active', 400, 'SUBSCRIPTION_NOT_ACTIVE');
  }

  if (currentSubscription.expiresAt.getTime() <= Date.now()) {
    currentSubscription.status = 'expired';
    currentSubscription.isCurrent = false;
    await currentSubscription.save();
    throw new AppError('Subscription has expired', 400, 'SUBSCRIPTION_EXPIRED');
  }

  return currentSubscription;
};

export const purchaseSubscription = async (
  userId: string,
  payload: PurchaseSubscriptionPayload,
) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const plan = await Plan.findOne({ _id: payload.planId, isActive: true });
  if (!plan) throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');

  if (!plan.stripePriceId) {
    throw new AppError('Plan is not ready for purchase', 400, 'PLAN_NOT_READY_FOR_PURCHASE');
  }

  const currentSubscription = await Subscription.findOne({ userId: user._id, isCurrent: true });

  if (currentSubscription && isSubscriptionCurrentlyActive(currentSubscription)) {
    if (currentSubscription.planId.toString() === plan._id.toString()) {
      throw new AppError(
        'You already have an active subscription for this plan',
        409,
        'DUPLICATE_ACTIVE_SUBSCRIPTION',
      );
    }

    if (plan.price > currentSubscription.priceAtPurchase) {
      throw new AppError('Upgrade flow is required', 400, 'UPGRADE_REQUIRED');
    }

    throw new AppError('Downgrade is not allowed in this flow', 400, 'DOWNGRADE_NOT_ALLOWED');
  }

  if (currentSubscription && !isSubscriptionCurrentlyActive(currentSubscription)) {
    currentSubscription.isCurrent = false;
    if (
      (currentSubscription.status === 'active' || currentSubscription.status === 'canceling') &&
      currentSubscription.expiresAt &&
      currentSubscription.expiresAt.getTime() <= Date.now()
    ) {
      currentSubscription.status = 'expired';
    }
    await currentSubscription.save();
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(user);
  const subscriptionRef = generateRef('sub');

  let session;
  try {
    session = await createSubscriptionCheckoutSession({
      user,
      plan,
      stripeCustomerId,
      autoRenew: payload.autoRenew ?? true,
      subscriptionRef,
    });
  } catch (error) {
    logger.error('Stripe checkout session creation failed', {
      userId,
      planId: plan._id.toString(),
      error,
    });
    throw new AppError('Failed to create Stripe checkout session', 502, 'STRIPE_CHECKOUT_FAILED');
  }

  if (!session.url) {
    throw new AppError('Checkout URL is missing from Stripe session', 502, 'STRIPE_CHECKOUT_FAILED');
  }

  const subscription = await Subscription.create({
    subscriptionRef,
    userId: new Types.ObjectId(userId),
    planId: plan._id,
    status: 'pending',
    isCurrent: true,
    stripeCheckoutSessionId: session.id,
    stripeCustomerId,
    stripePriceId: plan.stripePriceId,
    priceAtPurchase: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    autoRenew: payload.autoRenew ?? true,
  });

  logger.info('Stripe checkout session created', {
    userId,
    planId: plan._id.toString(),
    subscriptionRef,
    checkoutSessionId: session.id,
  });

  return {
    checkoutUrl: session.url,
    subscription,
  };
};

export const getCurrentSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({ userId, isCurrent: true }).populate('planId');

  if (
    subscription &&
    (subscription.status === 'active' || subscription.status === 'canceling') &&
    subscription.expiresAt &&
    subscription.expiresAt.getTime() <= Date.now()
  ) {
    subscription.status = 'expired';
    subscription.isCurrent = false;
    await subscription.save();
  }

  return { subscription: subscription ?? null };
};

export const upgradeSubscription = async (
  userId: string,
  payload: UpgradeSubscriptionPayload,
) => {
  const targetPlan = await Plan.findOne({ _id: payload.planId, isActive: true });
  if (!targetPlan) {
    throw new AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
  }

  if (!targetPlan.stripePriceId) {
    throw new AppError('Plan is not ready for purchase', 400, 'PLAN_NOT_READY_FOR_PURCHASE');
  }

  const currentSubscription = await getCurrentSubscriptionOrThrow(userId);

  const currentPlanPopulated = currentSubscription.planId as unknown as
    | { _id: { toString(): string }; price?: number }
    | undefined;

  const currentPlanId = currentPlanPopulated?._id?.toString() ?? currentSubscription.planId.toString();
  const currentPlanPrice =
    typeof currentPlanPopulated?.price === 'number'
      ? currentPlanPopulated.price
      : currentSubscription.priceAtPurchase;

  if (currentPlanId === targetPlan._id.toString()) {
    throw new AppError(
      'You already have an active subscription for this plan',
      409,
      'DUPLICATE_ACTIVE_SUBSCRIPTION',
    );
  }

  if (targetPlan.price <= currentPlanPrice) {
    throw new AppError('Selected plan is not valid for upgrade', 400, 'INVALID_UPGRADE_PLAN');
  }

  if (!currentSubscription.stripeSubscriptionId || !currentSubscription.stripeSubscriptionItemId) {
    throw new AppError(
      'Subscription is not ready for upgrade',
      400,
      'SUBSCRIPTION_NOT_READY_FOR_UPGRADE',
    );
  }

  const stripeSubscription = await updateStripeSubscriptionPrice({
    stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
    stripeSubscriptionItemId: currentSubscription.stripeSubscriptionItemId,
    newStripePriceId: targetPlan.stripePriceId,
    userId,
    newPlanId: targetPlan._id.toString(),
  });

  currentSubscription.pendingPlanId = targetPlan._id;
  await currentSubscription.save();

  logger.info('Subscription upgrade initiated', {
    userId,
    subscriptionId: currentSubscription._id.toString(),
    currentPlanId,
    targetPlanId: targetPlan._id.toString(),
    stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
  });

  return {
    subscription: currentSubscription,
    stripeStatus: stripeSubscription.status,
  };
};

export const cancelSubscription = async (
  userId: string,
  payload: CancelSubscriptionPayload,
) => {
  const currentSubscription = await getCurrentSubscriptionOrThrow(userId);

  const shouldCancelAtPeriodEnd = payload.cancelAtPeriodEnd ?? true;
  if (!shouldCancelAtPeriodEnd) {
    throw new AppError('Immediate cancellation is not allowed', 400, 'IMMEDIATE_CANCEL_NOT_ALLOWED');
  }

  if (currentSubscription.status === 'canceling' || currentSubscription.cancelAtPeriodEnd) {
    return {
      subscription: currentSubscription,
      message: 'Subscription is already scheduled for cancellation',
    };
  }

  if (!currentSubscription.stripeSubscriptionId) {
    throw new AppError(
      'Subscription is not ready for cancellation',
      400,
      'SUBSCRIPTION_NOT_READY_FOR_CANCEL',
    );
  }

  await cancelStripeSubscriptionAtPeriodEnd(currentSubscription.stripeSubscriptionId);

  currentSubscription.status = 'canceling';
  currentSubscription.autoRenew = false;
  currentSubscription.cancelAtPeriodEnd = true;
  currentSubscription.canceledAt = new Date();
  currentSubscription.isCurrent = true;
  await currentSubscription.save();

  logger.info('Subscription cancellation scheduled', {
    userId,
    subscriptionId: currentSubscription._id.toString(),
    stripeSubscriptionId: currentSubscription.stripeSubscriptionId,
  });

  return {
    subscription: currentSubscription,
    message: 'Subscription cancellation scheduled successfully',
  };
};

export const getAllSubscribedUsers = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination(query);
  const activeLikeStatuses: SubscriptionStatus[] = [
    'active',
    'canceling',
    'pending',
    'past_due',
    'incomplete',
  ];

  const filter = {
    isCurrent: true,
    status: { $in: activeLikeStatuses },
  };

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('userId', 'name email role status isEmailVerified createdAt')
      .populate('planId', 'name slug price currency interval isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Subscription.countDocuments(filter),
  ]);

  return {
    subscriptions,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};
