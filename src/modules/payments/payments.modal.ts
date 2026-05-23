import mongoose, { Schema } from "mongoose";
import { IPaymentEvent } from "./payments.interface";


const paymentEventSchema = new Schema<IPaymentEvent>(
    {
        provider: {
            type: String,
            enum: ["stripe"],
            required: true,
        },
        eventId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            index: true,
        },
        processed: {
            type: Boolean,
            default: false,
            index: true,
        },
        processedAt: Date,
        errorMessage: String,
        rawPayload: Schema.Types.Mixed,
    },
    { timestamps: true, versionKey: false }
);

paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
paymentEventSchema.index({ processed: 1, createdAt: 1 });

export const PaymentEvent = mongoose.model<IPaymentEvent>(
    "PaymentEvent",
    paymentEventSchema
);
