# HealthOS E2E Smoke Checklist

Manual QA checklist covering critical user flows. Run against a live stack with
`BASE=http://localhost:8000` and a freshly seeded test user.

Variables used below:
- `$BASE` — Core API base URL (e.g. `http://localhost:8000`)
- `$ACCESS` — access_token from login response
- `$REFRESH` — refresh_token from login response
- `$MEAL_ID` — UUID from create-meal response
- `$REMINDER_ID` — UUID from create-reminder response
- `$APPT_ID` — UUID from create-appointment response
- `$NOTIF_ID` — UUID from list-notifications response

---

## 1. Register

```
POST $BASE/v1/auth/otp/request
Content-Type: application/json

{
  "email": "smoke-test@healthos.local",
  "purpose": "signup",
  "password": "SmokeTest@1234"
}
```

**Expected:** `200 OK`, body `{ "data": { "delivery": "email", "expires_in_seconds": 300 } }`

Then verify OTP:
```
POST $BASE/v1/auth/otp/verify
Content-Type: application/json

{
  "email": "smoke-test@healthos.local",
  "purpose": "signup",
  "code": "<6-digit OTP from email or dev log>"
}
```

**Expected:** `200 OK`, body contains `access_token`, `refresh_token`, `user_id`

---

## 2. Login

```
POST $BASE/v1/auth/login
Content-Type: application/json

{
  "identifier": "smoke-test@healthos.local",
  "password": "SmokeTest@1234"
}
```

**Expected:** `200 OK`, body `{ "data": { "access_token": "...", "refresh_token": "...", "user_id": "..." } }`
Store `$ACCESS` and `$REFRESH`.

---

## 3. Refresh Token

```
POST $BASE/v1/auth/refresh
Content-Type: application/json

{ "refresh_token": "$REFRESH" }
```

**Expected:** `200 OK`, new `access_token` (and optionally new `refresh_token`) returned.

---

## 4. Logout

```
POST $BASE/v1/auth/logout
Content-Type: application/json
Authorization: Bearer $ACCESS

{ "refresh_token": "$REFRESH" }
```

**Expected:** `200 OK` or `204 No Content`. Subsequent use of `$REFRESH` must fail.

---

## 5. Onboarding Draft Save

```
PUT $BASE/v1/users/me/onboarding-draft
Content-Type: application/json
Authorization: Bearer $ACCESS

{
  "step": 1,
  "data": { "full_name": "Smoke User", "date_of_birth": "1990-01-15" }
}
```

**Expected:** `200 OK`, body echoes saved draft.

---

## 6. Onboarding Draft Load

```
GET $BASE/v1/users/me/onboarding-draft
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": { "step": 1, "data": { ... } } }` matching what was saved in step 5.

---

## 7. Profile Fetch

```
GET $BASE/v1/users/me
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": { "id": "...", "email": "smoke-test@healthos.local", ... } }`

---

## 8. Profile Update

```
PATCH $BASE/v1/users/me
Content-Type: application/json
Authorization: Bearer $ACCESS

{
  "full_name": "Smoke QA User",
  "height_cm": 172,
  "weight_kg": 68
}
```

**Expected:** `200 OK`, body reflects updated `full_name`, `height_cm`, `weight_kg`.

---

## 9. Create Meal

```
POST $BASE/v1/meals
Content-Type: application/json
Authorization: Bearer $ACCESS

{
  "name": "Phở bò",
  "logged_at": "2026-05-23T08:00:00Z"
}
```

**Expected:** `201 Created`, body `{ "data": { "id": "...", "name": "Phở bò", "status": "pending" } }`
Store `$MEAL_ID`.

---

## 10. Upload Meal Image

```
POST $BASE/v1/meals/$MEAL_ID/image
Authorization: Bearer $ACCESS
Content-Type: multipart/form-data

file=<JPEG/PNG binary, ≤10 MiB>
```

**Expected:** `200 OK` or `202 Accepted`, body contains `job_id` and `status` = `"processing"`.
(Requires MinIO + Celery worker — mark `e2e_external` if running without full stack.)

---

## 11. Poll Analysis Job

```
GET $BASE/v1/meals/$MEAL_ID
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": { "id": "$MEAL_ID", "status": "pending|processing|done|failed", ... } }`

---

## 12. Create Reminder

```
POST $BASE/v1/reminders
Content-Type: application/json
Authorization: Bearer $ACCESS

{
  "type": "medicine",
  "title": "Morning vitamins",
  "time": "08:00",
  "repeat": "daily"
}
```

**Expected:** `201 Created`, body `{ "data": { "id": "...", "title": "Morning vitamins", "done": false } }`
Store `$REMINDER_ID`.

---

## 13. Mark Reminder Done

```
PATCH $BASE/v1/reminders/$REMINDER_ID
Content-Type: application/json
Authorization: Bearer $ACCESS

{ "done": true }
```

**Expected:** `200 OK`, body `{ "data": { "id": "$REMINDER_ID", "done": true } }`

---

## 14. Create Appointment

```
POST $BASE/v1/appointments
Content-Type: application/json
Authorization: Bearer $ACCESS

{
  "appointment_date": "2026-06-01T09:00:00Z",
  "doctor_name": "Dr. Nguyễn Văn A",
  "specialty": "General",
  "clinic": "HealthOS Clinic"
}
```

**Expected:** `201 Created`, body `{ "data": { "id": "...", "doctor_name": "Dr. Nguyễn Văn A", "status": "scheduled" } }`
Store `$APPT_ID`.

---

## 15. Notification Unread List

```
GET $BASE/v1/notifications?only_unread=true
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": [...], "meta": { "has_more": false, ... } }`
Store `$NOTIF_ID` from first item if list non-empty.

---

## 16. Mark Notification Read

```
POST $BASE/v1/notifications/$NOTIF_ID/read
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": { "id": "$NOTIF_ID", "read_at": "..." } }`
If no notification exists from step 15, skip and note "no unread notifications to mark".

---

## 17. Mark All Notifications Read

```
POST $BASE/v1/notifications/read-all
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body `{ "data": { "marked": <integer ≥ 0> } }`

---

## 18. Generate / Export Report

```
GET $BASE/v1/reports
Authorization: Bearer $ACCESS
```

**Expected:** `200 OK`, body contains health report data (summary, trends, etc.).

PDF export (requires Celery worker + MinIO):
```
POST $BASE/v1/reports/export-pdf
Content-Type: application/json
Authorization: Bearer $ACCESS

{ "sections": ["vitals", "meals", "appointments"] }
```

**Expected:** `202 Accepted`, body `{ "data": { "request_id": "...", "status": "pending" } }`

---

## Auth Guard Checks

For each protected endpoint, send without `Authorization` header and confirm `401 Unauthorized`.

| Method | Path |
|--------|------|
| GET | /v1/users/me |
| PATCH | /v1/users/me |
| GET | /v1/meals |
| POST | /v1/meals |
| GET | /v1/reminders |
| POST | /v1/reminders |
| GET | /v1/appointments |
| POST | /v1/appointments |
| GET | /v1/notifications |
| POST | /v1/notifications/read-all |
| GET | /v1/reports |
