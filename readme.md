# Bill-Nest Backend

Bill-Nest is a secure subscription and billing backend API built with Node.js, Express, TypeScript, MongoDB, Mongoose, JWT authentication, and Stripe. It supports client authentication, subscription plans, subscription purchase, upgrade, cancellation, and webhook-based payment updates.
Postman collection/docs: https://documenter.getpostman.com/view/55148439/2sBXwjwuCR
Live backend URL: https://bill-nest-backend.onrender.com

## Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB + Mongoose
- JWT + bcryptjs
- Stripe
- Zod
- Winston + Morgan
- Helmet + CORS + Compression + Rate Limit
- uuid v7

## Features

- Auth with access/refresh tokens
- Email verification and password reset token flows (dev token return supported)
- Session persistence with hashed refresh tokens
- Admin plan CRUD
- Plan <-> Stripe Product/Price sync
- Subscription purchase with Stripe Checkout
- Subscription upgrade to higher priced plans
- Cancel at period end flow
- Stripe webhook processing with signature verification
- Webhook idempotency via PaymentEvent
- Centralized error handling and request tracing

## Business Rules

- Public registration creates `client` users only.
- Admin users can create/update/delete plans.
- Plan creation creates Stripe Product and Stripe Price.
- Purchase API creates a pending local subscription and Stripe Checkout session.
- Subscription becomes active only after Stripe webhook confirms payment/state.
- A user cannot purchase the same active plan again.
- A user cannot downgrade to a lower/equal-priced plan.
- A user can upgrade only to a higher-priced plan.
- Upgrade updates the existing Stripe subscription item (not a new subscription).
- Cancel is scheduled at period end only in current implementation.
- User keeps access until `expiresAt` after cancellation.
- Webhook signature is verified using `STRIPE_WEBHOOK_SECRET`.
- Webhook events are idempotent using `PaymentEvent`.
- Expired subscription handling is applied in current subscription retrieval flow.

## Architecture Overview

- Layered module design: routes -> controller -> service -> model
- Shared middlewares/utilities in `src/common`
- Environment/config bootstrap in `src/config`
- Stripe access centralized under `src/services/stripe`
- App entrypoint: `src/main.ts`

## Folder Structure

```text
src/
  main.ts
  app.ts
  seed.ts
  app/
    routes.ts
  common/
    errors/
    middlewares/
    utils/
  config/
    db.ts
    env.ts
    logger.ts
    stripe.ts
  modules/
    auth/
    users/
    sessions/
    plans/
    subscriptions/
    payments/
    webhooks/
  services/
    stripe/
  types/
```

## Environment Variables

Use `.env.example` as the source of truth.

Required variables:

- `NODE_ENV`
- `PORT`
- `CLIENT_URL`
- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `EMAIL_VERIFICATION_TOKEN_SECRET`
- `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN`
- `PASSWORD_RESET_TOKEN_SECRET`
- `PASSWORD_RESET_TOKEN_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLIENT_SUCCESS_URL`
- `CLIENT_CANCEL_URL`

For local MongoDB:

- `MONGO_URI=mongodb://127.0.0.1:27017/bill_nest`

For Docker Compose:

- `MONGO_URI=mongodb://mongo:27017/bill_nest`

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

API default base URL:

- `http://localhost:5000/api/v1`

## Seed Data

Run seed:

```bash
npm run seed
```

Reset and re-seed only seeded records:

```bash
npm run seed:reset
```

Seed behavior:

- Creates/updates seeded admin and client users.
- Creates/updates seeded plans by slug.
- Ensures each seeded plan has Stripe Product + Stripe Price.
- Saves `stripeProductId` and `stripePriceId` in MongoDB.
- Uses idempotent upsert flow.

Seeded credentials:

Admin:

- email: `admin@billnest.dev`
- password: `AdminPass123`

Client:

- email: `client@billnest.dev`
- password: `ClientPass123`

## Stripe Setup

1. Create a Stripe test account and get `STRIPE_SECRET_KEY`.
2. Put it in `.env`.
3. Run plan sync/create endpoints or run seed to generate products/prices.

## Stripe CLI Webhook Setup

```bash
stripe login
stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
```

Windows manual CLI command:

```bash
C:/stripe/stripe.exe listen --forward-to localhost:5000/api/v1/webhooks/stripe
```

Copy the emitted webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`.

## Docker Setup

Build and start API + MongoDB:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Notes:

- API exposed on `5000`
- MongoDB exposed on `27017`
- Mongo data persisted in `mongo_data` volume

## API Documentation

Detailed API reference:

- [docs/API.md](./docs/API.md)

## Postman Usage

If you use Postman, import your collection and set:

- base URL: `http://localhost:5000/api/v1`
- Bearer token from login for protected routes
- Live documentation: `https://documenter.getpostman.com/view/55148439/2sBXwjwuCR`

## Evaluation Checklist

- [ ] `.env` configured from `.env.example`
- [ ] MongoDB running (local or Docker)
- [ ] `npm run dev` starts cleanly
- [ ] `npm run seed` creates users and plans in MongoDB
- [ ] Seeded plans appear in Stripe Product catalog
- [ ] Webhook forwarding configured and secret set
- [ ] Auth, plans, subscriptions, and webhook routes reachable
