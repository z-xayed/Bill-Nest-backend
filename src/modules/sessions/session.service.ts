import { Types } from 'mongoose';
import { SessionMeta } from './session.interface';
import { Session } from './session.model';

export const createSession = async (
  userId: Types.ObjectId,
  refreshTokenHash: string,
  expiresAt: Date,
  meta?: SessionMeta,
) => {
  return Session.create({
    userId,
    refreshTokenHash,
    expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress,
  });
};

export const revokeSessionByHash = async (refreshTokenHash: string) => {
  return Session.updateOne(
    { refreshTokenHash, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date() } },
  );
};

export const revokeAllUserSessions = async (userId: string) => {
  return Session.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date() } },
  );
};
