import { Types } from 'mongoose';
import { AppError } from '../../common/errors/AppError';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { stripe } from '../../config/stripe';
import { PaymentEvent } from '../payments/paymentEvent.model';
import { Plan } from '../plans/plan.model';
import { Subscription } from '../subscriptions/subscription.model';
import { mapStripeSubscriptionStatus } from '../subscriptions/subscription.utils';

type ProcessWebhookInput = {
  rawBody: Buffer;
  signature: string | undefined;
};

type StripeEvent = ReturnType<typeof stripe.webhooks.constructEvent>;

type StripeCheckoutSessionLike = {
  id: string;
  metadata?: Record<string, string>;
  subscription?: string | { id?: string } | null;
};

type StripeSubscriptionLike = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  cancel_at_period_end?: boolean;
  customer?: string | { id?: string };
  items: {
    data: Array<{
      id?: string;
      price?: { id?: string };
      current_period_start?: number;
      current_period_end?: number;
    }>;
  };
  current_period_start?: number;
  current_period_end?: number;
};

type StripeInvoiceLike = {
  id: string;
  subscription?: string | { id?: string } | null;
};

const toDateFromSeconds = (value?: number): Date | undefined => {
  if (!value) return undefined;
  return new Date(value * 1000);
};

const getPeriodRange = (subscription: StripeSubscriptionLike) => {
  const rootStart = subscription.current_period_start;
  const rootEnd = subscription.current_period_end;

  if (rootStart && rootEnd) {
    return { startsAt: toDateFromSeconds(rootStart), expiresAt: toDateFromSeconds(rootEnd) };
  }

  const item = subscription.items?.data?.[0];

  return {
    startsAt: toDateFromSeconds(item?.current_period_start),
    expiresAt: toDateFromSeconds(item?.current_period_end),
  };
};

const handleCheckoutSessionCompleted = async (session: StripeCheckoutSessionLike) => {
  const subscriptionRef = session.metadata?.subscriptionRef;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionRef && !session.id) {
    return;
  }

  const localSubscription = await Subscription.findOne({
    $or: [{ stripeCheckoutSessionId: session.id }, { subscriptionRef }],
  });

  if (!localSubscription) return;

  if (subscriptionId) {
    localSubscription.stripeSubscriptionId = subscriptionId;
  }

  await localSubscription.save();
};

const handleSubscriptionCreatedOrUpdated = async (subscription: StripeSubscriptionLike) => {
  const metadata = subscription.metadata ?? {};
  const subscriptionRef = metadata.subscriptionRef;
  const userId = metadata.userId;
  const firstItem = subscription.items.data[0];
  const stripePriceId = firstItem?.price?.id;

  let planFromPrice = null;
  if (stripePriceId) {
    planFromPrice = await Plan.findOne({ stripePriceId });
  }

  let localSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });

  if (!localSubscription && subscriptionRef) {
    localSubscription = await Subscription.findOne({ subscriptionRef });
  }

  if (!localSubscription && userId) {
    localSubscription = await Subscription.findOne({ userId, isCurrent: true });
  }

  if (!localSubscription) return;

  const mappedStatus = mapStripeSubscriptionStatus(
    subscription.status,
    subscription.cancel_at_period_end ?? false,
  );

  const { startsAt, expiresAt } = getPeriodRange(subscription);

  if (metadata.userId && Types.ObjectId.isValid(metadata.userId)) {
    localSubscription.userId = new Types.ObjectId(metadata.userId);
  }

  if (stripePriceId) {
    localSubscription.stripePriceId = stripePriceId;
  }

  localSubscription.stripeSubscriptionId = subscription.id;
  localSubscription.stripeSubscriptionItemId = firstItem?.id;
  localSubscription.stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? localSubscription.stripeCustomerId;
  localSubscription.status = mappedStatus;
  localSubscription.startsAt = startsAt;
  localSubscription.expiresAt = expiresAt;
  localSubscription.autoRenew = !(subscription.cancel_at_period_end ?? false);
  localSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
  localSubscription.isCurrent = !['canceled', 'expired', 'failed'].includes(mappedStatus);

  const pendingPlanIdFromMetadata =
    metadata.pendingPlanId && Types.ObjectId.isValid(metadata.pendingPlanId)
      ? new Types.ObjectId(metadata.pendingPlanId)
      : undefined;

  const pendingPlanIdCandidate = pendingPlanIdFromMetadata ?? localSubscription.pendingPlanId;
  const upgradeRequested =
    metadata.action === 'upgrade' || Boolean(localSubscription.pendingPlanId) || Boolean(pendingPlanIdFromMetadata);

  if (upgradeRequested) {
    if (mappedStatus === 'active') {
      let targetPlan = null;
      if (pendingPlanIdCandidate) {
        targetPlan = await Plan.findById(pendingPlanIdCandidate);
      }

      if (!targetPlan && planFromPrice) {
        targetPlan = planFromPrice;
      }

      if (targetPlan) {
        localSubscription.upgradedFromPlanId = localSubscription.planId;
        localSubscription.planId = targetPlan._id;
        localSubscription.upgradedAt = new Date();
        localSubscription.pendingPlanId = undefined;
        localSubscription.priceAtPurchase = targetPlan.price;
        localSubscription.currency = targetPlan.currency;
        localSubscription.interval = targetPlan.interval;
        localSubscription.failureReason = undefined;

        logger.info('Subscription upgrade applied by webhook', {
          subscriptionId: localSubscription._id.toString(),
          stripeSubscriptionId: subscription.id,
          newPlanId: targetPlan._id.toString(),
        });
      }
    } else {
      if (pendingPlanIdCandidate) {
        localSubscription.pendingPlanId = pendingPlanIdCandidate;
      }
      localSubscription.failureReason =
        localSubscription.failureReason ?? 'Subscription upgrade is pending payment';
    }
  } else {
    if (planFromPrice) {
      localSubscription.planId = planFromPrice._id;
    }

    if (mappedStatus === 'active') {
      localSubscription.failureReason = undefined;
    }
  }

  if (mappedStatus === 'active') {
    await Subscription.updateMany(
      {
        userId: localSubscription.userId,
        _id: { $ne: localSubscription._id },
        isCurrent: true,
      },
      { $set: { isCurrent: false } },
    );
  }

  await localSubscription.save();

  logger.info('Subscription activated/updated from Stripe webhook', {
    subscriptionId: localSubscription._id.toString(),
    stripeSubscriptionId: subscription.id,
    status: mappedStatus,
  });
};

const handleSubscriptionPendingUpdateExpired = async (subscription: StripeSubscriptionLike) => {
  const localSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (!localSubscription) return;

  localSubscription.pendingPlanId = undefined;
  localSubscription.failureReason = 'Subscription upgrade payment was not completed';
  await localSubscription.save();

  logger.warn('Subscription upgrade expired by webhook', {
    subscriptionId: localSubscription._id.toString(),
    stripeSubscriptionId: subscription.id,
  });
};

const handleSubscriptionDeleted = async (subscription: StripeSubscriptionLike) => {
  const localSubscription = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
  if (!localSubscription) return;

  localSubscription.status = 'canceled';
  localSubscription.isCurrent = false;
  localSubscription.autoRenew = false;
  localSubscription.cancelAtPeriodEnd = false;
  localSubscription.canceledAt = new Date();

  await localSubscription.save();
};

const handleInvoicePaymentSucceeded = async (invoice: StripeInvoiceLike) => {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  if (!stripeSubscriptionId) return;

  const localSubscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!localSubscription) return;

  localSubscription.latestInvoiceId = invoice.id;
  localSubscription.failureReason = undefined;
  await localSubscription.save();
};

const handleInvoicePaymentFailed = async (invoice: StripeInvoiceLike) => {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  if (!stripeSubscriptionId) return;

  const localSubscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!localSubscription) return;

  localSubscription.status = 'past_due';
  localSubscription.latestInvoiceId = invoice.id;
  localSubscription.failureReason = 'Invoice payment failed';
  await localSubscription.save();

  logger.warn('Stripe invoice payment failed', {
    stripeSubscriptionId,
    invoiceId: invoice.id,
  });
};

export const processWebhook = async ({ rawBody, signature }: ProcessWebhookInput) => {
  if (!signature) {
    throw new AppError('Missing stripe signature', 400, 'STRIPE_SIGNATURE_MISSING');
  }

  let event: StripeEvent;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    throw new AppError('Invalid Stripe webhook signature', 400, 'INVALID_STRIPE_SIGNATURE', error);
  }

  logger.info('Stripe webhook received', { eventId: event.id, type: event.type });

  const existing = await PaymentEvent.findOne({ provider: 'stripe', eventId: event.id });
  if (existing?.processed) {
    logger.info('Duplicate webhook skipped', { eventId: event.id, type: event.type });
    return;
  }

  const paymentEvent = await PaymentEvent.findOneAndUpdate(
    { provider: 'stripe', eventId: event.id },
    {
      $setOnInsert: {
        provider: 'stripe',
        eventId: event.id,
      },
      $set: {
        type: event.type,
        processed: false,
        rawPayload: event,
      },
    },
    { new: true, upsert: true },
  );

  if (!paymentEvent) {
    throw new AppError('Failed to store webhook event', 500, 'PAYMENT_EVENT_PERSIST_FAILED');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as unknown as StripeCheckoutSessionLike);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.pending_update_applied':
        await handleSubscriptionCreatedOrUpdated(event.data.object as unknown as StripeSubscriptionLike);
        break;
      case 'customer.subscription.pending_update_expired':
        await handleSubscriptionPendingUpdateExpired(event.data.object as unknown as StripeSubscriptionLike);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as unknown as StripeSubscriptionLike);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as unknown as StripeInvoiceLike);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as unknown as StripeInvoiceLike);
        break;
      default:
        break;
    }

    paymentEvent.processed = true;
    paymentEvent.processedAt = new Date();
    paymentEvent.errorMessage = undefined;
    await paymentEvent.save();
  } catch (error) {
    paymentEvent.processed = false;
    paymentEvent.errorMessage =
      error instanceof Error ? error.message : 'Unknown webhook processing error';
    await paymentEvent.save();

    logger.error('Stripe webhook processing failed', {
      eventId: event.id,
      type: event.type,
      error,
    });

    throw error;
  }
};
