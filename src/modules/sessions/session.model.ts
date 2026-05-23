import mongoose, { Schema } from 'mongoose';
import { ISession } from './session.interface';

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: String,
    ipAddress: String,
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false, index: true },
    revokedAt: Date,
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isRevoked: 1, expiresAt: 1 });
sessionSchema.index({ refreshTokenHash: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
