import { IUser } from './user.interface';

export const sanitizeUser = (user: IUser) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  stripeCustomerId: user.stripeCustomerId,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
