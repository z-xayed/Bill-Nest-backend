import mongoose, { Model, Schema } from 'mongoose';
import { IPaymentEvent } from './paymentEvent.interface';

const paymentEventSchema = new Schema<IPaymentEvent>(
  {
    provider: { type: String, enum: ['stripe'], required: true },
    eventId: { type: String, required: true },
    type: { type: String, required: true, index: true },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    errorMessage: { type: String },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
paymentEventSchema.index({ type: 1 });
paymentEventSchema.index({ processed: 1 });

export const PaymentEvent: Model<IPaymentEvent> = mongoose.model<IPaymentEvent>(
  'PaymentEvent',
  paymentEventSchema,
);
