import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { sendSuccess } from '../../common/utils/apiResponse';
import {
  createPlan,
  deletePlan,
  getPlanByIdOrSlug,
  getPlans,
  restorePlan,
  updatePlan,
} from './plan.service';

export const createPlanController = async (req: Request, res: Response) => {
  const result = await createPlan(req.body, req.user!.userId);
  return sendSuccess(res, httpStatus.CREATED, 'Plan created successfully', result);
};

export const getPlansController = async (req: Request, res: Response) => {
  const result = await getPlans(req.query as never);
  return sendSuccess(res, httpStatus.OK, 'Plans retrieved successfully', result);
};

export const getPlanByIdOrSlugController = async (req: Request, res: Response) => {
  const result = await getPlanByIdOrSlug(String(req.params.idOrSlug));
  return sendSuccess(res, httpStatus.OK, 'Plan retrieved successfully', result);
};

export const updatePlanController = async (req: Request, res: Response) => {
  const result = await updatePlan(String(req.params.id), req.body, req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'Plan updated successfully', result);
};

export const deletePlanController = async (req: Request, res: Response) => {
  await deletePlan(String(req.params.id), req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'Plan deleted successfully', {});
};

export const restorePlanController = async (req: Request, res: Response) => {
  const result = await restorePlan(String(req.params.id), req.user!.userId);
  return sendSuccess(res, httpStatus.OK, 'Plan restored successfully', result);
};
