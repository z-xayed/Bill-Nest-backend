import mongoose, { Types } from 'mongoose';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { hashPassword } from './modules/auth/auth.utils';
import { IPlan, PlanCurrency, PlanInterval } from './modules/plans/plan.interface';
import { Plan } from './modules/plans/plan.model';
import { UserRole, UserStatus } from './modules/users/user.interface';
import { User } from './modules/users/user.model';
import {
  createStripeProduct,
  createStripeRecurringPrice,
  deactivateStripePrice,
  updateStripeProduct,
} from './services/stripe/stripe.service';

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
};

type SeedPlan = {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: PlanCurrency;
  interval: PlanInterval;
  features: string[];
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
};

const SEEDED_USERS: SeedUser[] = [
  {
    name: 'Bill Nest Admin',
    email: 'admin@billnest.dev',
    password: 'AdminPass123',
    role: 'admin',
    status: 'active',
    isEmailVerified: true,
  },
  {
    name: 'Bill Nest Client',
    email: 'client@billnest.dev',
    password: 'ClientPass123',
    role: 'client',
    status: 'active',
    isEmailVerified: true,
  },
];

const SEEDED_PLAN_SLUGS = ['starter', 'professional', 'enterprise'] as const;

const SEEDED_PLANS: SeedPlan[] = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Basic subscription plan for small clients.',
    price: 9.99,
    currency: 'usd',
    interval: 'month',
    features: ['Basic access', 'Email support', 'Single workspace'],
    trialDays: 7,
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Professional',
    slug: 'professional',
    description: 'Advanced subscription plan for growing teams.',
    price: 29.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Starter',
      'Priority support',
      'Multiple workspaces',
      'Advanced billing features',
    ],
    trialDays: 14,
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Enterprise-grade subscription plan for larger businesses.',
    price: 99.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Professional',
      'Dedicated support',
      'Custom billing workflows',
      'Team management',
    ],
    trialDays: 14,
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
];

const buildSeedMetadata = (plan: Pick<SeedPlan, 'slug' | 'name'>) => ({
  source: 'bill-nest-seed',
  planSlug: plan.slug,
  planName: plan.name,
});

const hasBillingChanged = (
  currentPlan: Pick<IPlan, 'price' | 'currency' | 'interval'>,
  seedPlan: Pick<SeedPlan, 'price' | 'currency' | 'interval'>,
) => {
  return (
    currentPlan.price !== seedPlan.price ||
    currentPlan.currency !== seedPlan.currency ||
    currentPlan.interval !== seedPlan.interval
  );
};

const ensureSeedUser = async (seedUser: SeedUser) => {
  const email = seedUser.email.toLowerCase();
  const existingUser = await User.findOne({ email });
  const passwordHash = await hashPassword(seedUser.password);

  if (!existingUser) {
    const createdUser = await User.create({
      name: seedUser.name,
      email,
      passwordHash,
      role: seedUser.role,
      status: seedUser.status,
      isEmailVerified: seedUser.isEmailVerified,
      emailVerifiedAt: new Date(),
    });

    logger.info(`${seedUser.role} created`, {
      userId: createdUser._id.toString(),
      email: createdUser.email,
    });
    return createdUser;
  }

  existingUser.name = seedUser.name;
  existingUser.passwordHash = passwordHash;
  existingUser.role = seedUser.role;
  existingUser.status = seedUser.status;
  existingUser.isEmailVerified = seedUser.isEmailVerified;
  existingUser.emailVerifiedAt = new Date();
  existingUser.emailVerificationTokenHash = undefined;
  existingUser.emailVerificationTokenExpiresAt = undefined;
  existingUser.passwordResetTokenHash = undefined;
  existingUser.passwordResetTokenExpiresAt = undefined;

  await existingUser.save();

  logger.info(`${seedUser.role} updated`, {
    userId: existingUser._id.toString(),
    email: existingUser.email,
  });
  return existingUser;
};

const deactivateSeededStripeResources = async () => {
  const existingPlans = await Plan.find({ slug: { $in: [...SEEDED_PLAN_SLUGS] } });

  for (const plan of existingPlans) {
    if (plan.stripePriceId) {
      try {
        await deactivateStripePrice(plan.stripePriceId);
      } catch (error) {
        logger.warn('Stripe price deactivation failed during seed reset', {
          planId: plan._id.toString(),
          stripePriceId: plan.stripePriceId,
          error,
        });
      }
    }

    if (plan.stripeProductId) {
      try {
        await updateStripeProduct(plan.stripeProductId, { active: false });
      } catch (error) {
        logger.warn('Stripe product deactivation failed during seed reset', {
          planId: plan._id.toString(),
          stripeProductId: plan.stripeProductId,
          error,
        });
      }
    }
  }
};

const ensureSeedPlan = async (seedPlan: SeedPlan, adminUserId: Types.ObjectId) => {
  const existingPlan = await Plan.findOne({ slug: seedPlan.slug });

  if (!existingPlan) {
    const product = await createStripeProduct({
      name: seedPlan.name,
      description: seedPlan.description,
      metadata: buildSeedMetadata(seedPlan),
    });
    logger.info('Stripe product created', {
      planSlug: seedPlan.slug,
      stripeProductId: product.id,
    });

    const price = await createStripeRecurringPrice({
      productId: product.id,
      amount: seedPlan.price,
      currency: seedPlan.currency,
      interval: seedPlan.interval,
      metadata: buildSeedMetadata(seedPlan),
    });
    logger.info('Stripe price created', {
      planSlug: seedPlan.slug,
      stripePriceId: price.id,
    });

    const createdPlan = await Plan.create({
      ...seedPlan,
      createdBy: adminUserId,
      stripeProductId: product.id,
      stripePriceId: price.id,
    });

    await updateStripeProduct(product.id, {
      metadata: {
        source: 'bill-nest-seed',
        planId: createdPlan._id.toString(),
        planSlug: createdPlan.slug,
        planName: createdPlan.name,
      },
    });
    logger.info('Stripe product updated', {
      planId: createdPlan._id.toString(),
      stripeProductId: product.id,
    });

    logger.info('plan created', {
      planId: createdPlan._id.toString(),
      slug: createdPlan.slug,
    });

    return createdPlan;
  }

  const nameChanged = existingPlan.name !== seedPlan.name;
  const descriptionChanged = (existingPlan.description ?? '') !== seedPlan.description;
  const billingChanged = hasBillingChanged(existingPlan, seedPlan);
  const hadStripeProductId = Boolean(existingPlan.stripeProductId);

  existingPlan.name = seedPlan.name;
  existingPlan.slug = seedPlan.slug;
  existingPlan.description = seedPlan.description;
  existingPlan.price = seedPlan.price;
  existingPlan.currency = seedPlan.currency;
  existingPlan.interval = seedPlan.interval;
  existingPlan.features = seedPlan.features;
  existingPlan.trialDays = seedPlan.trialDays;
  existingPlan.isActive = seedPlan.isActive;
  existingPlan.isPopular = seedPlan.isPopular;
  existingPlan.sortOrder = seedPlan.sortOrder;
  existingPlan.updatedBy = adminUserId;

  if (!existingPlan.stripeProductId) {
    const product = await createStripeProduct({
      name: seedPlan.name,
      description: seedPlan.description,
      metadata: buildSeedMetadata(seedPlan),
    });
    existingPlan.stripeProductId = product.id;
    logger.info('Stripe product created', {
      planSlug: seedPlan.slug,
      stripeProductId: product.id,
    });
  }

  if (!existingPlan.stripeProductId) {
    throw new Error(`Failed to assign stripeProductId for plan ${seedPlan.slug}`);
  }

  if (nameChanged || descriptionChanged) {
    await updateStripeProduct(existingPlan.stripeProductId, {
      name: seedPlan.name,
      description: seedPlan.description,
      metadata: buildSeedMetadata(seedPlan),
    });
    logger.info('Stripe product updated', {
      planSlug: seedPlan.slug,
      stripeProductId: existingPlan.stripeProductId,
    });
  }

  const shouldCreatePrice =
    !existingPlan.stripePriceId || billingChanged || !hadStripeProductId;

  if (shouldCreatePrice) {
    const price = await createStripeRecurringPrice({
      productId: existingPlan.stripeProductId,
      amount: seedPlan.price,
      currency: seedPlan.currency,
      interval: seedPlan.interval,
      metadata: buildSeedMetadata(seedPlan),
    });
    existingPlan.stripePriceId = price.id;
    logger.info('Stripe price created', {
      planSlug: seedPlan.slug,
      stripePriceId: price.id,
    });
  }

  await existingPlan.save();

  await updateStripeProduct(existingPlan.stripeProductId, {
    metadata: {
      source: 'bill-nest-seed',
      planId: existingPlan._id.toString(),
      planSlug: existingPlan.slug,
      planName: existingPlan.name,
    },
  });
  logger.info('Stripe product updated', {
    planId: existingPlan._id.toString(),
    stripeProductId: existingPlan.stripeProductId,
  });

  logger.info('plan updated', {
    planId: existingPlan._id.toString(),
    slug: existingPlan.slug,
  });

  return existingPlan;
};

const runSeed = async () => {
  const shouldReset = process.argv.includes('--reset');

  if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
    throw new Error(
      'STRIPE_SECRET_KEY is required for seeding plans because seed must sync plans to Stripe.',
    );
  }

  await connectDB();
  logger.info('database connected');

  if (shouldReset) {
    logger.warn('Reset mode enabled: cleaning seeded users and plans');

    await deactivateSeededStripeResources();
    await Plan.deleteMany({ slug: { $in: [...SEEDED_PLAN_SLUGS] } });
    await User.deleteMany({
      email: { $in: SEEDED_USERS.map((user) => user.email.toLowerCase()) },
    });
  }

  const adminUser = await ensureSeedUser(SEEDED_USERS[0]);
  await ensureSeedUser(SEEDED_USERS[1]);

  for (const seedPlan of SEEDED_PLANS) {
    await ensureSeedPlan(seedPlan, adminUser._id);
  }

  logger.info('seed completed');
};

const main = async () => {
  try {
    await runSeed();
    process.exitCode = 0;
  } catch (error) {
    logger.error('seed failed', { error });
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    logger.info('database disconnected');
  }
};

void main();
