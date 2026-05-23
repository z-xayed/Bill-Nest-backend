export interface IPaymentEvent {
  provider: 'stripe';
  eventId: string;
  type: string;
  processed: boolean;
  processedAt?: Date;
  errorMessage?: string;
  rawPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}
