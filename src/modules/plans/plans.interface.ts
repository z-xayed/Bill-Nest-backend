import { Types } from "mongoose";

export type BillingInterval = "month" | "year";

export interface IPlan {
    name: string;
    description?: string;
    price: number;
    currency: string;
    interval: BillingInterval;
    features: string[];
    stripeProductId: string;
    stripePriceId: string;
    isActive: boolean;
    isPopular: boolean;
    trialDays?: number;
    sortOrder: number;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}