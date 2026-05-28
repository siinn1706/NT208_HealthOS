# Final Demo Script

## Opening

"HealthOS routes browser API traffic through the Next.js BFF under `/api/v1/**`, with Core FastAPI behind it at `/v1/**`. Today's demo covers the implemented patient workflows, admin seed/cleanup, notification demo behavior, AI meal analysis, and the mobile login/API path. Wearable sync is owned separately and is not claimed as complete."

## Service Bring-Up

1. Start infra, Core, frontend, AI worker, and notification service.
2. Open health checks:
   - `http://localhost:8000/health/ready`
   - `http://localhost:8001/health`
   - `http://localhost:8002/health`
   - `http://localhost:3000`
3. Seed the demo account with `backend/seed_admin.py`.

## Web Login

1. Open `http://localhost:3000`.
2. Sign in with the seeded account.
3. If demonstrating MFA, use an MFA-enabled user and show that password login returns a challenge before session issuance.
4. Navigate dashboard, profile, meals, reminders, and notifications.
5. Point out that network calls are BFF `/api/v1/**`, not browser direct `/v1/**`.

## Notification Demo

1. For in-app persistence, dispatch a Core backend notification task with channel `in_app` and then show it in the notification list.
2. For standalone notification service, send:

```json
{
  "event_id": "00000000-0000-4000-8000-000000000001",
  "recipient_id": "00000000-0000-4000-8000-000000000002",
  "email": "demo@example.com",
  "title": "Demo notification",
  "body": "Your demo notification is ready.",
  "channel": "email"
}
```

3. If SMTP is configured, show `status: delivered`. If not, show the honest `skipped` reason.
4. Show unsupported channels return `skipped` with `reason: unsupported_channel`.

## AI Meal/Photo Demo

1. Confirm Core, MinIO, and AI worker health.
2. Upload a meal photo from the supported meal scan/upload flow.
3. Show pending/status progression and analyzed nutrition output.
4. If the local YOLO model/class db is unavailable, state that image analysis is unavailable rather than claiming completed analysis.

## Mobile Demo

1. Start Expo from `mobile/`.
2. Log in against Core using `EXPO_PUBLIC_CORE_API_URL`.
3. Show API-backed profile/dashboard data.
4. Mention SecureStore-backed session persistence, refresh handling, and session clearing on unauthorized refresh failure.
5. Do not demo wearable sync as completed.

## Cleanup

1. Delete the seeded account with `backend/delete_seed_admin.py --confirm`.
2. Stop services or `docker compose -f infra/docker/docker-compose.dev.yml down`.
3. Keep logs available for review if a flow failed.
