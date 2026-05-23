import mongoose, { Schema } from "mongoose";
import { ISubscription } from "./subscription.interface";



const subscriptionSchema = new Schema<ISubscription>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
            index: true,
        },
        pendingPlanId: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
        },
        provider: {
            type: String,
            enum: ["stripe"],
            default: "stripe",
            required: true,
        },
        stripeCustomerId: {
            type: String,
            required: true,
            index: true,
        },
        stripeSubscriptionId: {
            type: String,
            index: true,
            sparse: true,
        },
        stripeSubscriptionItemId: String,
        stripeCheckoutSessionId: {
            type: String,
            index: true,
            sparse: true,
        },
        stripePriceId: {
            type: String,
            required: true,
        },
        latestInvoiceId: String,
        status: {
            type: String,
            enum: [
                "pending",
                "active",
                "past_due",
                "canceling",
                "canceled",
                "expired",
                "incomplete",
                "failed",
            ],
            default: "pending",
            index: true,
        },
        priceAtPurchase: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            lowercase: true,
        },
        interval: {
            type: String,
            enum: ["month", "year"],
            required: true,
        },
        startsAt: Date,
        expiresAt: {
            type: Date,
            index: true,
        },
        autoRenew: {
            type: Boolean,
            default: true,
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
        },
        canceledAt: Date,
        isCurrent: {
            type: Boolean,
            default: true,
            index: true,
        },
        failureReason: String,
    },
    { timestamps: true, versionKey: false }
);

subscriptionSchema.index(
    { userId: 1, isCurrent: 1 },
    {
        unique: true,
        partialFilterExpression: { isCurrent: true },
    }
);

subscriptionSchema.index(
    { stripeSubscriptionId: 1 },
    {
        unique: true,
        sparse: true,
    }
);

subscriptionSchema.index({ userId: 1, status: 1, expiresAt: 1 });
subscriptionSchema.index({ stripeCustomerId: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>(
    "Subscription",
    subscriptionSchema
);
