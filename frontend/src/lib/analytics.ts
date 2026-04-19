/**
 * Lightweight analytics façade. The current implementation is a no-op so we
 * can sprinkle `track()` calls across the auth/onboarding/shell surface today
 * and swap in a real provider (Segment, PostHog, etc.) without touching call
 * sites later. Events are mirrored to `console.debug` in development only.
 *
 * Naming convention (enforced via the `AnalyticsEvent` union):
 *   `<area>.<noun>.<verb>` — e.g. `auth.login.submitted`, `onboarding.draft.saved`.
 */

export type AnalyticsEvent =
  | "auth.login.viewed"
  | "auth.login.submitted"
  | "auth.login.succeeded"
  | "auth.login.failed"
  | "auth.login.validation_failed"
  | "auth.login.errored"
  | "auth.register.viewed"
  | "auth.register.submitted"
  | "auth.register.succeeded"
  | "auth.register.failed"
  | "auth.register.validation_failed"
  | "auth.register.errored"
  | "auth.register.password_breached"
  | "auth.verify_otp.viewed"
  | "auth.verify_otp.submitted"
  | "auth.verify_otp.succeeded"
  | "auth.verify_otp.failed"
  | "auth.verify_otp.errored"
  | "auth.verify_otp.resend_clicked"
  | "auth.otp.requested"
  | "auth.otp.resent"
  | "auth.otp.verified"
  | "auth.otp.failed"
  | "auth.forgot_password.viewed"
  | "auth.forgot_password.send_code_submitted"
  | "auth.forgot_password.send_code_succeeded"
  | "auth.forgot_password.send_code_failed"
  | "auth.forgot_password.send_code_errored"
  | "auth.forgot_password.otp_submitted"
  | "auth.forgot_password.otp_succeeded"
  | "auth.forgot_password.otp_failed"
  | "auth.forgot_password.resend_clicked"
  | "auth.forgot_password.reset_submitted"
  | "auth.forgot_password.reset_succeeded"
  | "auth.forgot_password.reset_failed"
  | "auth.password_reset.requested"
  | "auth.password_reset.completed"
  | "auth.password_reset.failed"
  | "auth.oauth.started"
  | "auth.logout.completed"
  | "onboarding.viewed"
  | "onboarding.step_advanced"
  | "onboarding.step_back"
  | "onboarding.draft.saved"
  | "onboarding.draft.failed"
  | "onboarding.completed"
  | "shell.command_palette.opened"
  | "shell.notifications.opened"
  | "shell.mobile_drawer.opened"
  | "shell.theme.changed"
  | "shell.connection.offline"
  | "shell.connection.online"
  | "shell.offline_queue.enqueued"
  | "shell.offline_queue.flushed"
  | "shell.offline_queue.dropped"
  | "chat.message.sent"
  | "chat.message.failed"
  | "chat.message.retried"
  | "chat.message.discarded"
  | "chat.message.queued"
  | "chat.queue.flushed"
  | "chat.connection.degraded"
  | "chat.connection.session_expired"
  | "chat.connection.reconnect_clicked"
  | "chat.attachment.error"
  | "chat.draft.saved"
  | "progress.insight_card.viewed"
  | "progress.insight_card.action_clicked"
  | "progress.period.changed"
  | "achievements.milestone.viewed"
  | "achievements.milestone.unlocked"
  | "achievements.tab.changed"
  | "leaderboard.viewed"
  | "leaderboard.scope_changed"
  | "leaderboard.fairness_note_opened"
  | "shell.notifications.unsafe_href_blocked"
  | "storage.migration.complete";

export type AnalyticsProperties = Record<string, unknown>;

const isDev = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

export function track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (isDev && typeof console !== "undefined") {
    console.debug(`[analytics] ${event}`, properties ?? {});
  }
}

export function identify(userId: string | null, traits?: AnalyticsProperties): void {
  if (isDev && typeof console !== "undefined") {
    console.debug(`[analytics] identify`, { userId, traits });
  }
}
