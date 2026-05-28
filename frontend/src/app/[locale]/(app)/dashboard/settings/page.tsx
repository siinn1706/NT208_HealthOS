"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  User,
  Bell,
  Lock,
  Globe,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Shield,
  LogOut,
  Smartphone,
  Download,
  Trash2,
  Palette,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AccentColorSetting = dynamic(
  () => import("@/components/settings/accent-color-setting"),
  {
    ssr: false,
    loading: () => <div className="h-8 animate-pulse rounded-lg bg-muted/40" />,
  }
);

type ThemeOption = "system" | "light" | "dark";

const NOTIF_DEFAULTS = {
  healthAlerts: true,
  reminders: true,
  weeklyReports: false,
  promotions: false,
  chatMessages: true,
} as const;

type NotificationPrefs = typeof NOTIF_DEFAULTS;
type NotificationKey = keyof NotificationPrefs;

function pushThemeModeToBackend(value: ThemeOption): void {
  void fetch("/api/v1/preferences/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme_mode: value }),
  });
}

async function fetchNotificationPrefs(): Promise<NotificationPrefs | null> {
  try {
    const res = await fetch("/api/v1/preferences/me");
    if (!res.ok) return null;
    const parsed = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const directNotif = parsed?.notifications;
    const nestedNotif =
      parsed?.data && typeof parsed.data === "object"
        ? (parsed.data as Record<string, unknown>).notifications
        : undefined;
    const raw = directNotif ?? nestedNotif;
    if (!raw || typeof raw !== "object") return null;
    return { ...NOTIF_DEFAULTS, ...(raw as Partial<NotificationPrefs>) };
  } catch {
    return null;
  }
}

async function pushNotificationPrefs(value: NotificationPrefs): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/preferences/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications: value }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingRow({ icon: Icon, label, description, children, onClick, danger }: SettingRowProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-5 py-4 w-full text-left transition-colors",
        onClick &&
          (danger
            ? "hover:bg-destructive/10 cursor-pointer"
            : "hover:bg-muted cursor-pointer")
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          danger ? "bg-destructive/10" : "bg-muted"
        )}
      >
        <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger ? "text-destructive" : "text-foreground")}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />)}
    </Wrapper>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-3 border-b border-border bg-muted/30 rounded-tl-xl rounded-tr-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border [&>*:last-child]:rounded-b-xl">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function subscribeMounted(): () => void {
  return () => undefined;
}

function getMountedClientSnapshot(): boolean {
  return true;
}

function getMountedServerSnapshot(): boolean {
  return false;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const { theme: rawTheme, setTheme } = useTheme();
  const theme = (rawTheme ?? "system") as ThemeOption;
  const mounted = React.useSyncExternalStore(
    subscribeMounted,
    getMountedClientSnapshot,
    getMountedServerSnapshot,
  );
  const [notifications, setNotifications] = useState<NotificationPrefs>(NOTIF_DEFAULTS);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadSubmitting, setDownloadSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  // Identity-proof inputs for destructive account deletion.
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetchNotificationPrefs().then((prefs) => {
      if (prefs) setNotifications(prefs);
    });
  }, []);

  const handleNotificationToggle = async (key: NotificationKey, value: boolean) => {
    const previous = notifications;
    const next: NotificationPrefs = { ...notifications, [key]: value };
    setNotifications(next);
    const ok = await pushNotificationPrefs(next);
    if (!ok) {
      setNotifications(previous);
      toast.error(t("settingsPage.notifications.saveFailed"));
    }
  };

  const handleLogout = async () => {
    try {
      // Scrub queued mutations before clearing the session so nothing outlives
      // logout on a shared device.
      try {
        const { clearAllOfflineQueues } = await import("@/lib/offline-queue-clear");
        await clearAllOfflineQueues();
      } catch {
        /* IndexedDB may be locked in private mode — proceed with logout. */
      }
      await fetch("/api/v1/auth/session", { method: "DELETE" });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  const handleRequestExport = async () => {
    setDownloadSubmitting(true);
    try {
      const res = await fetch("/api/v1/users/me/export", { method: "POST" });
      if (res.status === 429) {
        toast.error(t("settingsPage.privacy.downloadDialog.rateLimited"));
        return;
      }
      if (!res.ok) throw new Error("export-failed");
      // Successful submission returns 202 + a job DTO. The Celery worker emits
      // an in-app notification ("Your data export is ready") with a deep link
      // when the tarball is uploaded; the user clicks that to download.
      toast.success(t("settingsPage.privacy.downloadDialog.requested"));
      setDownloadDialogOpen(false);
    } catch {
      toast.error(t("settingsPage.privacy.downloadDialog.requestFailed"));
    } finally {
      setDownloadSubmitting(false);
    }
  };

  // Triggered when the user clicks the in-app notification's deep link.
  // Reads `?export=<request_id>` and immediately navigates to the signed URL.
  // Track handled ids in a ref + scrub the query param after the download
  // triggers, so a refresh doesn't re-spam the toast.
  const handledExportsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const exportId = searchParams.get("export");
    if (!exportId || handledExportsRef.current.has(exportId)) return;
    handledExportsRef.current.add(exportId);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/users/me/export/${encodeURIComponent(exportId)}/download`);
        if (cancelled) return;
        if (res.status === 410) {
          toast.error(t("settingsPage.privacy.downloadDialog.expired"));
        } else if (!res.ok) {
          toast.error(t("settingsPage.privacy.downloadDialog.downloadFailed"));
        } else {
          const json = await res.json().catch(() => null);
          const url: string | undefined = json?.data?.url;
          if (url) window.location.assign(url);
        }
      } catch {
        toast.error(t("settingsPage.privacy.downloadDialog.downloadFailed"));
      } finally {
        // Scrub the deep-link query param so re-mounts don't re-fire.
        const next = new URLSearchParams(searchParams.toString());
        next.delete("export");
        const qs = next.toString();
        const target = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
        router.replace(target);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, t, router]);

  const handleRequestDelete = async () => {
    setDeleteSubmitting(true);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation_email: deleteEmail.trim(),
          password: deletePassword,
        }),
      });
      if (res.status === 422 || res.status === 409) {
        const json = await res.json().catch(() => null);
        const msg = json?.error?.message || t("settingsPage.privacy.deleteDialog.identityFailed");
        toast.error(msg);
        return;
      }
      if (!res.ok) throw new Error("delete-failed");
      toast.success(t("settingsPage.privacy.deleteDialog.requested"));
      setDeleteDialogOpen(false);
      setDeleteConfirm("");
      setDeleteEmail("");
      setDeletePassword("");
      // After soft-delete, the BFF cleared the cookie — kick the user back to login.
      router.push(`/${locale}/login?from=/dashboard/settings`);
    } catch {
      toast.error(t("settingsPage.privacy.deleteDialog.requestFailed"));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const deleteConfirmPhrase = t("settingsPage.privacy.deleteDialog.confirmPhrase");
  const deleteConfirmed =
    deleteConfirm.trim().toUpperCase() === deleteConfirmPhrase.toUpperCase();

  const LOCALE_LABELS: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

  return (
    <>
      <PageHeader
        title={t("settingsPage.pageTitle")}
        description={t("settingsPage.pageSubtitle")}
      />
      <div className="max-w-2xl mx-auto space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Account */}
      <SettingGroup title={t("settingsPage.sections.account")}>
        <SettingRow
          icon={User}
          label={t("settingsPage.account.profile")}
          description={t("settingsPage.account.profileDesc")}
          onClick={() => router.push(`/${locale}/dashboard/profile`)}
        />
        <SettingRow
          icon={Lock}
          label={t("settingsPage.account.security")}
          description={t("settingsPage.account.securityDesc")}
          onClick={() => router.push(`/${locale}/forgot-password`)}
        />
        <SettingRow
          icon={Smartphone}
          label={t("settingsPage.account.devices")}
          description={t("settingsPage.account.devicesDesc")}
          onClick={() => router.push(`/${locale}/dashboard/settings/devices`)}
        />
      </SettingGroup>

      {/* Appearance */}
      <SettingGroup title={t("settingsPage.sections.appearance")}>
        <SettingRow icon={Globe} label={t("settingsPage.appearance.language")} description={LOCALE_LABELS[locale] ?? locale}>
          <div className="flex items-center gap-1.5">
            {(["vi", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => router.push(`/${l}/dashboard/settings`)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer",
                  locale === l
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-muted"
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow
          icon={mounted ? (theme === "dark" ? Moon : theme === "light" ? Sun : Monitor) : Monitor}
          label={t("settingsPage.appearance.theme")}
        >
          <div className="flex items-center gap-1.5" suppressHydrationWarning>
            {([
              { value: "system", icon: Monitor, labelKey: "settingsPage.appearance.themeSystem" },
              { value: "light", icon: Sun, labelKey: "settingsPage.appearance.themeLight" },
              { value: "dark", icon: Moon, labelKey: "settingsPage.appearance.themeDark" },
            ] as { value: ThemeOption; icon: React.ElementType; labelKey: string }[]).map((opt) => {
              const Ic = opt.icon;
              const isSelected = mounted && theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    pushThemeModeToBackend(opt.value);
                  }}
                  title={t(opt.labelKey as Parameters<typeof t>[0])}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Ic className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </SettingRow>
        {/* Accent Color — full-width block so the two-column layout has room */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
              <Palette className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("settingsPage.appearance.accentColor")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settingsPage.appearance.accentColorDesc")}</p>
            </div>
          </div>
          <AccentColorSetting />
        </div>
      </SettingGroup>

      {/* Notifications */}
      <SettingGroup title={t("settingsPage.sections.notifications")}>
        {(
          [
            {
              key: "healthAlerts" as const,
              icon: Bell,
              label: t("settingsPage.notifications.healthAlerts"),
              description: t("settingsPage.notifications.healthAlertsDesc"),
            },
            {
              key: "reminders" as const,
              icon: Bell,
              label: t("settingsPage.notifications.reminders"),
              description: t("settingsPage.notifications.remindersDesc"),
            },
            {
              key: "weeklyReports" as const,
              icon: Bell,
              label: t("settingsPage.notifications.weeklyReports"),
              description: t("settingsPage.notifications.weeklyReportsDesc"),
            },
            {
              key: "chatMessages" as const,
              icon: Bell,
              label: t("settingsPage.notifications.chatMessages"),
              description: t("settingsPage.notifications.chatMessagesDesc"),
            },
            {
              key: "promotions" as const,
              icon: Bell,
              label: t("settingsPage.notifications.promotions"),
              description: t("settingsPage.notifications.promotionsDesc"),
            },
          ] as {
            key: keyof typeof notifications;
            icon: React.ElementType;
            label: string;
            description: string;
          }[]
        ).map(({ key, icon, label, description }) => (
          <SettingRow key={key} icon={icon} label={label} description={description}>
            <Toggle
              checked={notifications[key]}
              onChange={(v) => void handleNotificationToggle(key, v)}
            />
          </SettingRow>
        ))}
      </SettingGroup>

      {/* Privacy & Security */}
      <SettingGroup title={t("settingsPage.sections.privacy")}>
        <SettingRow
          icon={HeartPulse}
          label={t("settingsPage.privacy.emergencyCard")}
          description={t("settingsPage.privacy.emergencyCardDesc")}
          onClick={() => router.push(`/${locale}/dashboard/emergency-card`)}
        />
        <SettingRow
          icon={Shield}
          label={t("settingsPage.privacy.policy")}
          description={t("settingsPage.privacy.policyDesc")}
          onClick={() => router.push(`/${locale}/legal/privacy`)}
        />
        <SettingRow
          icon={Download}
          label={t("settingsPage.privacy.download")}
          description={t("settingsPage.privacy.downloadDesc")}
          onClick={() => setDownloadDialogOpen(true)}
        />
        <SettingRow
          icon={Trash2}
          label={t("settingsPage.privacy.delete")}
          description={t("settingsPage.privacy.deleteDesc")}
          danger
          onClick={() => setDeleteDialogOpen(true)}
        />
      </SettingGroup>

      {/* Sign out */}
      <SettingGroup title={t("settingsPage.sections.session")}>
        <SettingRow
          icon={LogOut}
          label={t("settingsPage.logout")}
          description={t("settingsPage.logoutDesc")}
          onClick={handleLogout}
          danger
        />
      </SettingGroup>
      </div>

      <AlertDialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settingsPage.privacy.downloadDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settingsPage.privacy.downloadDialog.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-foreground">
                {t("settingsPage.privacy.downloadDialog.contains")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("settingsPage.privacy.downloadDialog.containsList")}
              </p>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t("settingsPage.privacy.downloadDialog.secureNote")}</span>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("settingsPage.dialogClose")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleRequestExport}
                disabled={downloadSubmitting}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {t("settingsPage.privacy.downloadDialog.request")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(o) => {
          setDeleteDialogOpen(o);
          if (!o) setDeleteConfirm("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {t("settingsPage.privacy.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settingsPage.privacy.deleteDialog.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
              <p className="text-xs font-semibold">
                {t("settingsPage.privacy.deleteDialog.irreversible")}
              </p>
              <p className="mt-1 text-xs text-destructive/90">
                {t("settingsPage.privacy.deleteDialog.exportFirst")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-email" className="text-xs">
                {t("settingsPage.privacy.deleteDialog.emailPrompt")}
              </Label>
              <Input
                id="delete-email"
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={t("settingsPage.privacy.deleteDialog.emailPlaceholder")}
                autoComplete="email"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-password" className="text-xs">
                {t("settingsPage.privacy.deleteDialog.passwordPrompt")}
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" className="text-xs">
                {t("settingsPage.privacy.deleteDialog.confirmPrompt", {
                  phrase: deleteConfirmPhrase,
                })}
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={t("settingsPage.privacy.deleteDialog.confirmPlaceholder")}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("settingsPage.dialogClose")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleRequestDelete}
                disabled={
                  !deleteConfirmed ||
                  deleteSubmitting ||
                  deleteEmail.trim().length === 0 ||
                  deletePassword.length === 0
                }
                className="gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {deleteSubmitting
                  ? t("settingsPage.privacy.deleteDialog.deleting")
                  : t("settingsPage.privacy.deleteDialog.confirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
