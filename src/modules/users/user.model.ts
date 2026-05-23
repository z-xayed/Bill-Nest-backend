import mongoose, { Model, Schema } from 'mongoose';
import { IUser } from './user.interface';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'client'], default: 'client', index: true },
    status: { type: String, enum: ['active', 'blocked', 'deleted'], default: 'active', index: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    emailVerificationTokenHash: { type: String, select: false, sparse: true },
    emailVerificationTokenExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false, sparse: true },
    passwordResetTokenExpiresAt: { type: Date, select: false },
    passwordChangedAt: Date,
    stripeCustomerId: { type: String, sparse: true },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationTokenExpiresAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetTokenExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
