import mongoose, { Model, Schema } from 'mongoose';
import { IPlan } from './plan.interface';

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'usd', lowercase: true, enum: ['usd', 'eur', 'bdt'] },
    interval: { type: String, required: true, enum: ['month', 'year'] },
    features: { type: [String], default: [] },
    trialDays: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
  },
  { timestamps: true },
);

planSchema.index({ name: 1 }, { unique: true });
planSchema.index({ slug: 1 }, { unique: true });
planSchema.index({ price: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ interval: 1 });
planSchema.index({ currency: 1 });
planSchema.index({ sortOrder: 1 });

export const Plan: Model<IPlan> = mongoose.model<IPlan>('Plan', planSchema);
