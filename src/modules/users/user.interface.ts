import { Types } from 'mongoose';

export type UserRole = 'admin' | 'client';
export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  emailVerificationTokenHash?: string;
  emailVerificationTokenExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  passwordChangedAt?: Date;
  stripeCustomerId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
