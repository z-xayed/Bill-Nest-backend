import { Request, Response } from 'express';
import { processWebhook } from './stripeWebhook.service';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  await processWebhook({
    rawBody: req.body as Buffer,
    signature: typeof signature === 'string' ? signature : undefined,
  });

  return res.status(200).json({ received: true });
};
