import { Router } from 'express';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validateRequest } from '../../common/middlewares/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
  changePasswordController,
  forgotPasswordController,
  handleRefreshToken,
  login,
  logout,
  me,
  register,
  resendEmailVerificationController,
  resetPasswordController,
  verifyEmailController,
} from './auth.controller';
import {
  changePasswordValidationSchema,
  forgotPasswordValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  registerValidationSchema,
  resendVerificationValidationSchema,
  resetPasswordValidationSchema,
  verifyEmailValidationSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validateRequest(registerValidationSchema), asyncHandler(register));
router.post('/login', validateRequest(loginValidationSchema), asyncHandler(login));
router.post('/refresh-token', validateRequest(refreshTokenValidationSchema), asyncHandler(handleRefreshToken));
router.post('/logout', authMiddleware, asyncHandler(logout));


router.get('/me', authMiddleware, asyncHandler(me));


router.post('/verify-email', validateRequest(verifyEmailValidationSchema), asyncHandler(verifyEmailController));
router.post('/resend-verification', validateRequest(resendVerificationValidationSchema), asyncHandler(resendEmailVerificationController));
router.post('/forgot-password', validateRequest(forgotPasswordValidationSchema), asyncHandler(forgotPasswordController));
router.post('/reset-password', validateRequest(resetPasswordValidationSchema), asyncHandler(resetPasswordController));


router.patch('/change-password', authMiddleware, validateRequest(changePasswordValidationSchema), asyncHandler(changePasswordController));

export const authRoutes = router;
