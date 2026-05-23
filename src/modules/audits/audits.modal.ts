import mongoose, { Schema } from "mongoose";
import { IAuditLog } from "./audits.interface";


const auditLogSchema = new Schema<IAuditLog>(
    {
        actorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        entity: {
            type: String,
            required: true,
            index: true,
        },
        entityId: String,
        metadata: Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
    },
    { timestamps: true, versionKey: false }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
