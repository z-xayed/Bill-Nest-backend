# Bill-Nest API Documentation

Base URL: `/api/v1`

Response format:

- Success

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

- Error

```json
{
  "success": false,
  "statusCode": 401,
  "message": "...",
  "error": {
    "code": "ERROR_CODE",
    "details": null
  },
  "requestId": "..."
}
```

## Health

### GET `/api/v1/health`

- Auth: No
- Role: None
- Body: None
- Query: None

Response example:

```json
{
  "success": true,
  "message": "Bill-Nest API is running",
  "data": {
    "status": "ok"
  }
}
```

Main error codes: `INTERNAL_SERVER_ERROR`

## Auth

### POST `/api/v1/auth/register`

- Auth: No
- Role: None

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123"
}
```

Response example:

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {},
    "dev": {
      "emailVerificationOtp": "only in development"
    }
  }
}
```

Main error codes: `VALIDATION_ERROR`, `EMAIL_ALREADY_EXISTS`

### POST `/api/v1/auth/login`

- Auth: No
- Role: None

Body:

```json
{
  "email": "john@example.com",
  "password": "StrongPass123"
}
```

Response example:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {},
    "tokens": {
      "accessToken": "..."
    }
  }
}
```

Notes:

- `refreshToken` is set as an `httpOnly` cookie by the server.
- `refreshToken` is not returned in response JSON.

Main error codes: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `USER_NOT_ACTIVE`, `EMAIL_NOT_VERIFIED`

### POST `/api/v1/auth/refresh-token`

- Auth: No
- Role: None

Body:

```json
{}
```

Response example:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "..."
    }
  }
}
```

Notes:

- Refresh token is read from `refreshToken` cookie (body fallback is supported).
- A new `refreshToken` cookie is rotated on success.

Main error codes: `VALIDATION_ERROR`, `INVALID_REFRESH_TOKEN`, `USER_NOT_ACTIVE`

### POST `/api/v1/auth/logout`

- Auth: Yes (`Bearer accessToken`)
- Role: Any authenticated user

Body:

```json
{}
```

Response example:

```json
{
  "success": true,
  "message": "Logout successful",
  "data": {}
}
```

Notes:

- Access token is taken from `Authorization: Bearer <accessToken>`.
- All active sessions for the user are revoked.
- `refreshToken` cookie is cleared on logout.

Main error codes: `VALIDATION_ERROR`

### GET `/api/v1/auth/me`

- Auth: Yes (`Bearer accessToken`)
- Role: Any authenticated user
- Body: None

Response example:

```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "user": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `USER_NOT_ACTIVE`, `USER_NOT_FOUND`

### POST `/api/v1/auth/verify-email`

- Auth: No
- Role: None

Body:

```json
{
  "otp": "123456"
}
```

Response example:

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {}
  }
}
```

Main error codes: `VALIDATION_ERROR`, `INVALID_EMAIL_VERIFICATION_TOKEN`

### POST `/api/v1/auth/resend-verification`

- Auth: No
- Role: None

Body:

```json
{
  "email": "john@example.com"
}
```

Response example:

```json
{
  "success": true,
  "message": "A verification code has been sent to the email address.",
  "data": {
    "message": "A verification code has been sent to the email address.",
    "dev": {
      "emailVerificationOtp": "only in development"
    }
  }
}
```

Main error codes: `VALIDATION_ERROR`, `EMAIL_ALREADY_VERIFIED`

### POST `/api/v1/auth/forgot-password`

- Auth: No
- Role: None

Body:

```json
{
  "email": "john@example.com"
}
```

Response example:

```json
{
  "success": true,
  "message": "A password reset link has been sent to the email address.",
  "data": {
    "message": "A password reset link has been sent to the email address.",
    "dev": {
      "passwordResetToken": "only in development"
    }
  }
}
```

Main error codes: `VALIDATION_ERROR`

### POST `/api/v1/auth/reset-password`

- Auth: No
- Role: None

Body:

```json
{
  "token": "...",
  "newPassword": "NewStrongPass123"
}
```

Response example:

```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {}
}
```

Main error codes: `VALIDATION_ERROR`, `INVALID_PASSWORD_RESET_TOKEN`

### PATCH `/api/v1/auth/change-password`

- Auth: Yes (`Bearer accessToken`)
- Role: Any authenticated user

Body:

```json
{
  "currentPassword": "CurrentStrongPass123",
  "newPassword": "NewStrongPass123"
}
```

Response example:

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {}
}
```

Main error codes: `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `USER_NOT_ACTIVE`, `USER_NOT_FOUND`, `INVALID_CURRENT_PASSWORD`

## Plans

### GET `/api/v1/plans`

- Auth: No
- Role: None

Query params:

- `page` (number, optional)
- `limit` (number, optional)
- `search` (string, optional)
- `interval` (`month | year`, optional)
- `currency` (`usd | eur | bdt`, optional)
- `isActive` (`true | false`, optional)
- `minPrice` (number, optional)
- `maxPrice` (number, optional)
- `sortBy` (`price | createdAt | sortOrder | name`, optional)
- `sortOrder` (`asc | desc`, optional)

Response example:

```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "plans": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Main error codes: `VALIDATION_ERROR`

### GET `/api/v1/plans/:idOrSlug`

- Auth: No
- Role: None

Path params:

- `idOrSlug` (Mongo ObjectId or slug)

Response example:

```json
{
  "success": true,
  "message": "Plan retrieved successfully",
  "data": {
    "plan": {}
  }
}
```

Main error codes: `VALIDATION_ERROR`, `PLAN_NOT_FOUND`

### POST `/api/v1/plans`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Body:

```json
{
  "name": "Growth",
  "description": "Growth plan",
  "price": 49.99,
  "currency": "usd",
  "interval": "month",
  "features": ["Priority support"],
  "trialDays": 14,
  "isPopular": true,
  "sortOrder": 4
}
```

Response example:

```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "plan": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `PLAN_ALREADY_EXISTS`, `STRIPE_PLAN_SYNC_FAILED`

### PATCH `/api/v1/plans/:id`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Path params:

- `id` (Mongo ObjectId)

Body (all optional, at least one required):

```json
{
  "name": "Growth Plus",
  "description": "Updated description",
  "price": 59.99,
  "currency": "usd",
  "interval": "month",
  "features": ["Priority support", "Advanced analytics"],
  "trialDays": 14,
  "isPopular": true,
  "sortOrder": 5,
  "isActive": true
}
```

Response example:

```json
{
  "success": true,
  "message": "Plan updated successfully",
  "data": {
    "plan": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_PLAN_ID`, `PLAN_NOT_FOUND`, `PLAN_ALREADY_EXISTS`, `STRIPE_PLAN_SYNC_FAILED`

### DELETE `/api/v1/plans/:id`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Path params:

- `id` (Mongo ObjectId)

Response example:

```json
{
  "success": true,
  "message": "Plan deleted successfully",
  "data": {}
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_PLAN_ID`, `PLAN_NOT_FOUND`

### PATCH `/api/v1/plans/:id/restore`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Path params:

- `id` (Mongo ObjectId)

Response example:

```json
{
  "success": true,
  "message": "Plan restored successfully",
  "data": {
    "plan": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_PLAN_ID`, `PLAN_NOT_FOUND`, `STRIPE_PLAN_SYNC_FAILED`

### POST `/api/v1/plans/sync-stripe`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Body: None

Response example:

```json
{
  "success": true,
  "message": "Plans synced with Stripe successfully",
  "data": {
    "syncedCount": 2,
    "plans": []
  }
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `STRIPE_PLAN_SYNC_FAILED`

### POST `/api/v1/plans/:id/sync-stripe`

- Auth: Yes (`Bearer accessToken`)
- Role: `admin`

Path params:

- `id` (Mongo ObjectId)

Body: None

Response example:

```json
{
  "success": true,
  "message": "Plan synced with Stripe successfully",
  "data": {
    "plan": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_PLAN_ID`, `PLAN_NOT_FOUND`, `STRIPE_PLAN_SYNC_FAILED`

## Subscriptions

### POST `/api/v1/subscriptions/purchase`

- Auth: Yes (`Bearer accessToken`)
- Role: authenticated user

Body:

```json
{
  "planId": "665fa8b2719f6f6df3a8d671",
  "autoRenew": true
}
```

Response example:

```json
{
  "success": true,
  "message": "Subscription checkout session created successfully",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "subscription": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `VALIDATION_ERROR`, `PLAN_NOT_FOUND`, `PLAN_NOT_READY_FOR_PURCHASE`, `DUPLICATE_ACTIVE_SUBSCRIPTION`, `UPGRADE_REQUIRED`, `DOWNGRADE_NOT_ALLOWED`, `STRIPE_CHECKOUT_FAILED`

### GET `/api/v1/subscriptions/current`

- Auth: Yes (`Bearer accessToken`)
- Role: authenticated user
- Body: None

Response example:

```json
{
  "success": true,
  "message": "Current subscription retrieved successfully",
  "data": {
    "subscription": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `USER_NOT_ACTIVE`

### POST `/api/v1/subscriptions/upgrade`

- Auth: Yes (`Bearer accessToken`)
- Role: authenticated user

Body:

```json
{
  "planId": "665fa8b2719f6f6df3a8d671"
}
```

Response example:

```json
{
  "success": true,
  "message": "Subscription upgrade initiated successfully",
  "data": {
    "subscription": {},
    "stripeStatus": "active"
  }
}
```

Main error codes: `AUTH_REQUIRED`, `VALIDATION_ERROR`, `PLAN_NOT_FOUND`, `PLAN_NOT_READY_FOR_PURCHASE`, `NO_ACTIVE_SUBSCRIPTION`, `DUPLICATE_ACTIVE_SUBSCRIPTION`, `INVALID_UPGRADE_PLAN`, `SUBSCRIPTION_NOT_ACTIVE`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_NOT_READY_FOR_UPGRADE`, `STRIPE_SUBSCRIPTION_UPDATE_FAILED`

### PATCH `/api/v1/subscriptions/cancel`

- Auth: Yes (`Bearer accessToken`)
- Role: authenticated user

Body:

```json
{
  "cancelAtPeriodEnd": true
}
```

Response example:

```json
{
  "success": true,
  "message": "Subscription cancellation scheduled successfully",
  "data": {
    "subscription": {}
  }
}
```

Main error codes: `AUTH_REQUIRED`, `VALIDATION_ERROR`, `NO_ACTIVE_SUBSCRIPTION`, `SUBSCRIPTION_NOT_ACTIVE`, `SUBSCRIPTION_EXPIRED`, `IMMEDIATE_CANCEL_NOT_ALLOWED`, `SUBSCRIPTION_NOT_READY_FOR_CANCEL`, `STRIPE_SUBSCRIPTION_CANCEL_FAILED`

## Webhooks

### POST `/api/v1/webhooks/stripe`

- Auth: No JWT
- Verification: Stripe signature (`stripe-signature` header)
- Body: raw Stripe event payload (`application/json`)

Response example:

```json
{
  "received": true
}
```

Main error codes: `STRIPE_SIGNATURE_MISSING`, `INVALID_STRIPE_SIGNATURE`, `INTERNAL_SERVER_ERROR`

Handled event types:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
