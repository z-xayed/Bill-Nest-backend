import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["admin", "client"],
            default: "client",
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "blocked", "deleted"],
            default: "active",
            index: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        stripeCustomerId: {
            type: String,
            index: true,
            sparse: true,
        },
        lastLoginAt: Date,
        passwordChangedAt: Date,
    },
    { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
    { stripeCustomerId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { stripeCustomerId: { $type: "string" } } }
);

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
