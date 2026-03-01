# HealthOS — Async Event Contracts

## Mục đích

Tất cả event truyền qua Queue (Celery/Redis pub-sub) và WebSocket phải có schema được định nghĩa ở đây. Đây là "nguồn sự thật" để FE, Core BE, và Workers đồng bộ về format message.

## Quy tắc đặt tên event

```
<domain>.<action>

domain: meal | health | alert | notification | device | user
action: created | updated | deleted | analyzed | triggered | synced | sent | failed

Examples:
  meal.analyzed
  health.synced
  alert.triggered
  notification.sent
  device.connected
```

## Danh sách events

| Event | Producer | Consumer | File schema |
|-------|----------|----------|-------------|
| `meal.analyzed` | AI Worker | Core BE, FE (via WS) | [meal-analyzed.json](./meal-analyzed.json) |
| `health.synced` | Queue Worker | Core BE | [health-synced.json](./health-synced.json) |
| `alert.triggered` | Core BE | Queue Worker (notify) | [alert-triggered.json](./alert-triggered.json) |
| `notification.requested` | Core BE | Notification Worker | [notification-requested.json](./notification-requested.json) |

## Envelope chuẩn cho mọi event

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "required": ["event", "version", "payload", "metadata"],
  "properties": {
    "event": { "type": "string" },
    "version": { "type": "string", "example": "1.0" },
    "payload": { "type": "object" },
    "metadata": {
      "type": "object",
      "required": ["event_id", "timestamp", "user_id"],
      "properties": {
        "event_id": { "type": "string", "format": "uuid" },
        "timestamp": { "type": "string", "format": "date-time" },
        "user_id": { "type": "string", "format": "uuid" },
        "correlation_id": { "type": "string", "format": "uuid" }
      }
    }
  }
}
```
