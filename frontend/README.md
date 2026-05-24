# HealthOS Frontend + BFF

This is the HealthOS web application and Backend-for-Frontend (BFF). It renders the browser UI, owns localized routes, and proxies browser API traffic to the Core backend.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- `next-intl` for routing/localization
- Vitest, Playwright, and ESLint for frontend verification

## BFF Rule

Browser code must call the BFF route surface under `/api/v1/**`. The browser must not call Core `/v1/**` directly.

```
Browser -> Next.js BFF (/api/v1/**) -> Core BE (/v1/**)
```

- BFF route handlers live in `src/app/api/v1/**/route.ts`.
- Shared proxy behavior lives in `src/lib/core-api-proxy.ts`.
- Core base URL is read server-side from `CORE_API_URL`.
- `CORE_API_URL`, `BFF_SHARED_SECRET`, refresh tokens, and session cookies must stay server-side. Do not expose them through `NEXT_PUBLIC_*`.

## Run Locally

From the repository root, the normal setup script copies `infra/env/frontend.env.example` to `frontend/.env.local`.

Manual frontend-only setup:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

The Core backend must be running at `CORE_API_URL` for BFF-backed pages and routes to work.

## Environment Variables

Set these in `frontend/.env.local` for local development:

```bash
CORE_API_URL=http://localhost:8000
BFF_SHARED_SECRET=dev-bff-secret-change-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CORE_WS_URL=ws://localhost:8000
```

Optional or environment-specific variables:

| Variable | Purpose |
|---|---|
| `COOKIE_NAME`, `COOKIE_MAX_AGE`, `COOKIE_SECURE` | Session cookie settings |
| `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_MAX_AGE` | Refresh-token cookie settings |
| `REDIS_URL` | BFF rate-limit store; production should provide Redis |
| `TRUST_PROXY` | Enables forwarded IP headers behind a trusted proxy |
| `ALLOWED_DEV_ORIGINS` | Hostnames allowed by Next.js dev origin checks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `OAUTH_GOOGLE_CALLBACK_URL`, `OAUTH_GITHUB_CALLBACK_URL` | Local OAuth fallback callbacks |

`infra/env/frontend.env.example` is the source of truth for example values and tunnel/OAuth notes.

## Main Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Build the production app |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with coverage |
| `npm run test:e2e` | Run Playwright tests |
| `npm run i18n:check` | Check locale parity |
| `npm run optimize:assets` | Optimize frontend assets |

## Common Issues

- Browser network calls show `http://localhost:8000/v1/**`: update the caller to use `/api/v1/**`; direct browser-to-Core calls are not supported.
- Login, OAuth callback, or refresh returns 401: confirm `BFF_SHARED_SECRET` matches the backend and cookies are being set for the current origin.
- BFF route returns an upstream error: confirm Core is running and `CORE_API_URL` points to it from the frontend process.
- OAuth through a public tunnel redirects to the wrong host: register the exact provider callback URL and keep `ALLOWED_DEV_ORIGINS` to hostnames or wildcard hostnames, not full URLs.
- WebSocket chat cannot connect: check `NEXT_PUBLIC_CORE_WS_URL` and confirm Core `/ws` is reachable.
- Production auth rate limiting returns 503: provide `REDIS_URL`; development falls back to in-memory rate limiting.
