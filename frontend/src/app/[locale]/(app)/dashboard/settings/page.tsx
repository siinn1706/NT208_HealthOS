"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BlossomColorPicker } from "@/components/blossom/BlossomColorPicker";
import { applyAccentColorToRoot } from "@/components/theme/UserAccentColorApplier";

type ThemeOption = "system" | "light" | "dark";

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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
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

export default function SettingsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const [theme, setTheme] = useState<ThemeOption>("system");
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [accentOriginal, setAccentOriginal] = useState<string | null>(null);
  const [accentLoading, setAccentLoading] = useState<boolean>(true);
  const [accentSaving, setAccentSaving] = useState<boolean>(false);
  const [accentError, setAccentError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    healthAlerts: true,
    reminders: true,
    weeklyReports: false,
    promotions: false,
    chatMessages: true,
  });

  const canSaveAccent = useMemo(
    () => !accentLoading && !accentSaving && accentColor !== accentOriginal,
    [accentLoading, accentSaving, accentColor, accentOriginal]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setAccentLoading(true);
        setAccentError(null);
        const res = await fetch("/api/v1/users/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { data?: { accent_color?: string | null } } | null;
        const serverColor = typeof json?.data?.accent_color === "string" ? json.data.accent_color : null;
        if (!alive) return;
        setAccentColor(serverColor);
        setAccentOriginal(serverColor);
        applyAccentColorToRoot(serverColor);
      } catch {
        if (!alive) return;
        setAccentError(t("settingsPage.appearance.accentColorLoadError"));
      } finally {
        if (!alive) return;
        setAccentLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => {
    // Immediate UI feedback while picking; persisted value is still Core-backed.
    applyAccentColorToRoot(accentColor);
  }, [accentColor]);

  const saveAccentColor = async () => {
    try {
      setAccentSaving(true);
      setAccentError(null);
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent_color: accentColor }),
      });
      if (!res.ok) throw new Error("save_failed");
      const json = (await res.json().catch(() => null)) as { data?: { accent_color?: string | null } } | null;
      const serverColor = typeof json?.data?.accent_color === "string" ? json.data.accent_color : null;
      setAccentColor(serverColor);
      setAccentOriginal(serverColor);
      applyAccentColorToRoot(serverColor);
    } catch {
      setAccentError(t("settingsPage.appearance.accentColorSaveError"));
    } finally {
      setAccentSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/session", { method: "DELETE" });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  const LOCALE_LABELS: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("settingsPage.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("settingsPage.pageSubtitle")}
        </p>
      </div>

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
        <SettingRow icon={theme === "dark" ? Moon : theme === "light" ? Sun : Monitor} label={t("settingsPage.appearance.theme")}>
          <div className="flex items-center gap-1.5">
            {([
              { value: "system", icon: Monitor, labelKey: "settingsPage.appearance.themeSystem" },
              { value: "light", icon: Sun, labelKey: "settingsPage.appearance.themeLight" },
              { value: "dark", icon: Moon, labelKey: "settingsPage.appearance.themeDark" },
            ] as { value: ThemeOption; icon: React.ElementType; labelKey: string }[]).map((opt) => {
              const Ic = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  title={t(opt.labelKey as Parameters<typeof t>[0])}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer",
                    theme === opt.value
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
        <SettingRow
          icon={Sun}
          label={t("settingsPage.appearance.accentColor")}
          description={t("settingsPage.appearance.accentColorDesc")}
        >
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className={cn("flex items-center gap-3", accentLoading && "opacity-70 pointer-events-none")}>
              <BlossomColorPicker
                value={accentColor}
                onChange={(hex) => setAccentColor(hex)}
                disabled={accentLoading || accentSaving}
                className="shrink-0"
              />
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: accentColor ?? "transparent" }}
                  aria-label={accentColor ? `Accent ${accentColor}` : "Accent default"}
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {accentColor ?? t("settingsPage.appearance.accentColorDefault")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAccentColor(null)}
                disabled={accentLoading || accentSaving}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                  "border-border text-foreground hover:bg-muted disabled:opacity-60 disabled:hover:bg-transparent"
                )}
              >
                {t("settingsPage.appearance.accentColorReset")}
              </button>
              <button
                onClick={saveAccentColor}
                disabled={!canSaveAccent}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                  canSaveAccent
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {accentSaving ? t("settingsPage.appearance.accentColorSaving") : t("settingsPage.appearance.accentColorSave")}
              </button>
            </div>
            {accentError && <p className="w-full text-xs text-destructive">{accentError}</p>}
          </div>
        </SettingRow>
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
              onChange={(v) =>
                setNotifications((prev) => ({ ...prev, [key]: v }))
              }
            />
          </SettingRow>
        ))}
      </SettingGroup>

      {/* Privacy & Security */}
      <SettingGroup title={t("settingsPage.sections.privacy")}>
        <SettingRow
          icon={Shield}
          label={t("settingsPage.privacy.policy")}
          description={t("settingsPage.privacy.policyDesc")}
          onClick={() => {}}
        />
        <SettingRow
          icon={Download}
          label={t("settingsPage.privacy.download")}
          description={t("settingsPage.privacy.downloadDesc")}
          onClick={() => {}}
        />
        <SettingRow
          icon={Trash2}
          label={t("settingsPage.privacy.delete")}
          description={t("settingsPage.privacy.deleteDesc")}
          onClick={() => {}}
          danger
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
  );
}
