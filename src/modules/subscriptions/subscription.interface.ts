import { Types } from "mongoose";

export type SubscriptionStatus =
    | "pending"
    | "active"
    | "past_due"
    | "canceling"
    | "canceled"
    | "expired"
    | "incomplete"
    | "failed";

export interface ISubscription {
    userId: Types.ObjectId;
    planId: Types.ObjectId;
    pendingPlanId?: Types.ObjectId;

    provider: "stripe";

    stripeCustomerId: string;
    stripeSubscriptionId?: string;
    stripeSubscriptionItemId?: string;
    stripeCheckoutSessionId?: string;
    stripePriceId: string;
    latestInvoiceId?: string;

    status: SubscriptionStatus;

    priceAtPurchase: number;
    currency: string;
    interval: "month" | "year";

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