import mongoose, { Schema } from "mongoose";
import { IPlan } from "./plans.interface";



const planSchema = new Schema<IPlan>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        description: String,
        price: {
            type: Number,
            required: true,
            min: 0,
            index: true,
        },
        currency: {
            type: String,
            required: true,
            lowercase: true,
            default: "usd",
        },
        interval: {
            type: String,
            enum: ["month", "year"],
            required: true,
        },
        features: {
            type: [String],
            default: [],
        },
        stripeProductId: {
            type: String,
            required: true,
            index: true,
        },
        stripePriceId: {
            type: String,
            required: true,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isPopular: {
            type: Boolean,
            default: false,
        },
        trialDays: {
            type: Number,
            min: 0,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true, versionKey: false }
);

planSchema.index({ isActive: 1, sortOrder: 1 });
planSchema.index({ stripeProductId: 1 }, { unique: true });
planSchema.index({ stripePriceId: 1 }, { unique: true });

export const Plan = mongoose.model<IPlan>("Plan", planSchema);
