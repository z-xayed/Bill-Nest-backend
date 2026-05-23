import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { sendSuccess } from '../../common/utils/apiResponse';
import {
  cancelSubscription,
  getCurrentSubscription,
  purchaseSubscription,
  upgradeSubscription,
} from './subscription.service';

export const purchaseSubscriptionController = async (req: Request, res: Response) => {
  const result = await purchaseSubscription(req.user!.userId, req.body);
  return sendSuccess(
    res,
    httpStatus.OK,
    'Subscription checkout session created successfully',
    result,
  );
};

export const getCurrentSubscriptionController = async (req: Request, res: Response) => {
  const result = await getCurrentSubscription(req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'Current subscription retrieved successfully', result);
};

export const upgradeSubscriptionController = async (req: Request, res: Response) => {
  const result = await upgradeSubscription(req.user!.userId, req.body);
  return sendSuccess(
    res,
    httpStatus.OK,
    'Subscription upgrade initiated successfully',
    result,
  );
};

export const cancelSubscriptionController = async (req: Request, res: Response) => {
  const result = await cancelSubscription(req.user!.userId, req.body);
  return sendSuccess(res, httpStatus.OK, result.message, {
    subscription: result.subscription,
  });
};
