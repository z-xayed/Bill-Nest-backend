import { Types } from "mongoose";

export interface ISession {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
    isRevoked: boolean;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}