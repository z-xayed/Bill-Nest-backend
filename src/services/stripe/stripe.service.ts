import { AppError } from '../../common/errors/AppError';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { stripe } from '../../config/stripe';
import { User } from '../../modules/users/user.model';
import {
  StripeCheckoutSessionInput,
  StripeProductInput,
  StripeProductUpdateInput,
  StripeRecurringPriceInput,
  StripeSubscriptionPriceUpdateInput,
} from './stripe.interface';

export const createStripeProduct = async (payload: StripeProductInput) => {
  try {
    const product = await stripe.products.create({
      name: payload.name,
      description: payload.description,
      metadata: payload.metadata,
    });

    logger.info('Stripe product created', { productId: product.id, name: payload.name });
    return product;
  } catch (error) {
    logger.error('Stripe product creation failed', { error });
    throw new AppError('Failed to create Stripe product', 502, 'STRIPE_PRODUCT_CREATE_FAILED');
  }
};

export const createStripeRecurringPrice = async (payload: StripeRecurringPriceInput) => {
  try {
    const price = await stripe.prices.create({
      product: payload.productId,
      unit_amount: Math.round(payload.amount * 100),
      currency: payload.currency,
      recurring: { interval: payload.interval },
      metadata: payload.metadata,
    });

    logger.info('Stripe price created', { priceId: price.id, productId: payload.productId });
    return price;
  } catch (error) {
    logger.error('Stripe price creation failed', { error, productId: payload.productId });
    throw new AppError('Failed to create Stripe price', 502, 'STRIPE_PRICE_CREATE_FAILED');
  }
};

export const updateStripeProduct = async (
  productId: string,
  payload: StripeProductUpdateInput,
) => {
  return stripe.products.update(productId, payload);
};

export const deactivateStripePrice = async (priceId: string) => {
  return stripe.prices.update(priceId, { active: false });
};

export const activateStripePrice = async (priceId: string) => {
  return stripe.prices.update(priceId, { active: true });
};

export const getOrCreateStripeCustomer = async (user: {
  _id: { toString(): string };
  email: string;
  name: string;
  stripeCustomerId?: string;
}) => {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString(),
        source: 'bill-nest',
      },
    });

    await User.updateOne(
      { _id: user._id.toString() },
      { $set: { stripeCustomerId: customer.id } },
    );

    return customer.id;
  } catch (error) {
    logger.error('Stripe customer create failed', { error, userId: user._id.toString() });
    throw new AppError('Failed to create Stripe customer', 502, 'STRIPE_CUSTOMER_CREATE_FAILED');
  }
};

export const createSubscriptionCheckoutSession = async (
  payload: StripeCheckoutSessionInput,
) => {
  if (!payload.plan.stripePriceId) {
    throw new AppError('Plan is not ready for purchase', 400, 'PLAN_NOT_READY_FOR_PURCHASE');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: payload.stripeCustomerId,
      line_items: [
        {
          price: payload.plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${env.CLIENT_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: env.CLIENT_CANCEL_URL,
      metadata: {
        userId: payload.user._id.toString(),
        planId: payload.plan._id.toString(),
        subscriptionRef: payload.subscriptionRef,
        action: 'new_subscription',
        autoRenew: String(payload.autoRenew),
      },
      subscription_data: {
        metadata: {
          userId: payload.user._id.toString(),
          planId: payload.plan._id.toString(),
          subscriptionRef: payload.subscriptionRef,
          action: 'new_subscription',
          autoRenew: String(payload.autoRenew),
        },
      },
    });

    return session;
  } catch (error) {
    logger.error('Stripe checkout session create failed', {
      error,
      userId: payload.user._id.toString(),
      planId: payload.plan._id.toString(),
    });
    throw new AppError('Failed to create checkout session', 502, 'STRIPE_CHECKOUT_FAILED');
  }
};

export const updateStripeSubscriptionPrice = async (
  payload: StripeSubscriptionPriceUpdateInput,
) => {
  try {
    return await stripe.subscriptions.update(payload.stripeSubscriptionId, {
      items: [
        {
          id: payload.stripeSubscriptionItemId,
          price: payload.newStripePriceId,
        },
      ],
      payment_behavior: 'pending_if_incomplete',
      proration_behavior: 'always_invoice',
      metadata: {
        userId: payload.userId,
        pendingPlanId: payload.newPlanId,
        action: 'upgrade',
      },
    });
  } catch (error) {
    logger.error('Stripe subscription update failed', {
      error,
      stripeSubscriptionId: payload.stripeSubscriptionId,
    });
    throw new AppError(
      'Failed to update Stripe subscription',
      502,
      'STRIPE_SUBSCRIPTION_UPDATE_FAILED',
    );
  }
};

export const cancelStripeSubscriptionAtPeriodEnd = async (
  stripeSubscriptionId: string,
) => {
  try {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    logger.error('Stripe subscription cancel failed', { error, stripeSubscriptionId });
    throw new AppError(
      'Failed to cancel Stripe subscription at period end',
      502,
      'STRIPE_SUBSCRIPTION_CANCEL_FAILED',
    );
  }
};
