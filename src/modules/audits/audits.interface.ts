import { Types } from "mongoose";

export interface IAuditLog {
    actorId?: Types.ObjectId;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: unknown;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
