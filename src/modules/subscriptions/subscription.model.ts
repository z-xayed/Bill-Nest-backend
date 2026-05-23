import mongoose, { Model, Schema } from 'mongoose';
import { ISubscription } from './subscription.interface';

const subscriptionSchema = new Schema<ISubscription>(
  {
    subscriptionRef: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    provider: { type: String, enum: ['stripe'], default: 'stripe', required: true },
    stripeCustomerId: { type: String, required: true, index: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true, index: true },
    stripeSubscriptionItemId: { type: String },
    stripeCheckoutSessionId: { type: String, unique: true, sparse: true, index: true },
    stripePriceId: { type: String, required: true },
    pendingPlanId: { type: Schema.Types.ObjectId, ref: 'Plan' },
    upgradedFromPlanId: { type: Schema.Types.ObjectId, ref: 'Plan' },
    upgradedAt: { type: Date },
    latestInvoiceId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'active', 'past_due', 'canceling', 'canceled', 'expired', 'incomplete', 'failed'],
      default: 'pending',
      index: true,
    },
    priceAtPurchase: { type: Number, required: true },
    currency: { type: String, required: true, lowercase: true },
    interval: { type: String, enum: ['month', 'year'], required: true },
    startsAt: { type: Date },
    expiresAt: { type: Date, index: true },
    autoRenew: { type: Boolean, default: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date },
    isCurrent: { type: Boolean, default: true, index: true },
    failureReason: { type: String },
  },
  { timestamps: true },
);

subscriptionSchema.index({ subscriptionRef: 1 }, { unique: true });
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });
subscriptionSchema.index({ stripeCheckoutSessionId: 1 }, { unique: true, sparse: true });
subscriptionSchema.index(
  { userId: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  },
);

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);
