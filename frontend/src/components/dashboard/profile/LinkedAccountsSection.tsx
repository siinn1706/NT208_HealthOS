"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Github, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Provider = "google" | "github";

interface OAuthLink {
  id: string;
  provider: string;
  provider_account_id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  linked_at?: string | null;
  last_used_at?: string | null;
}

const PROVIDER_META: Record<Provider, { label: string; icon: React.ElementType }> = {
  google: { label: "Google", icon: GoogleIcon },
  github: { label: "GitHub", icon: Github },
};

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M21.6 12.227c0-.69-.062-1.36-.178-2H12v3.787h5.382a4.6 4.6 0 0 1-1.997 3.018v2.508h3.232c1.892-1.742 2.983-4.31 2.983-7.313z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.965-.895 6.617-2.46l-3.232-2.508c-.895.6-2.04.954-3.385.954-2.605 0-4.808-1.76-5.595-4.124H3.075v2.59A9.998 9.998 0 0 0 12 22z"
      />
      <path
        fill="currentColor"
        d="M6.405 13.862a6.005 6.005 0 0 1 0-3.724V7.548H3.075a10.002 10.002 0 0 0 0 8.904l3.33-2.59z"
      />
      <path
        fill="currentColor"
        d="M12 5.927c1.47 0 2.79.506 3.83 1.5l2.872-2.872C16.96 2.992 14.695 2 12 2A9.998 9.998 0 0 0 3.075 7.548l3.33 2.59C7.193 7.687 9.395 5.927 12 5.927z"
      />
    </svg>
  );
}

export function LinkedAccountsSection() {
  const t = useTranslations("dashboard.profile.linkedAccounts");
  const searchParams = useSearchParams();
  const [links, setLinks] = React.useState<OAuthLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<OAuthLink | null>(null);
  const [removing, setRemoving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/oauth/links", { cache: "no-store" });
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const json = await res.json().catch(() => null);
      const list = Array.isArray(json?.data) ? (json.data as OAuthLink[]) : [];
      setLinks(list);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Surface the redirect feedback from the link callback flow.
  React.useEffect(() => {
    const linked = searchParams.get("linked");
    const linkError = searchParams.get("link_error");
    const provider = searchParams.get("provider") ?? linked ?? "";
    if (linked) {
      const meta = PROVIDER_META[linked as Provider];
      toast.success(t("linkSuccess", { provider: meta?.label ?? linked }));
      void refresh();
    } else if (linkError === "already_linked") {
      const meta = PROVIDER_META[provider as Provider];
      toast.error(t("conflictError", { provider: meta?.label ?? provider }));
    } else if (linkError) {
      toast.error(t("linkError"));
    }
  }, [searchParams, refresh, t]);

  const handleAdd = (provider: Provider) => {
    window.location.assign(`/api/v1/auth/oauth/${provider}/link/init`);
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/v1/auth/oauth/links/${confirmRemove.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        toast.error(t("lastMethodError"));
        return;
      }
      if (!res.ok) {
        toast.error(t("removeError"));
        return;
      }
      toast.success(t("removeSuccess"));
      await refresh();
    } catch {
      toast.error(t("removeError"));
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  };

  const linkedProviderSet = new Set(links.map((l) => l.provider));
  const availableProviders: Provider[] = (["google", "github"] as Provider[]).filter(
    (p) => !linkedProviderSet.has(p),
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <header>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">{error}</div>
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            {t("retry")}
          </Button>
        </div>
      ) : links.length === 0 ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("none")}
        </p>
      ) : (
        <ul role="list" className="divide-y divide-border rounded-md border border-border">
          {links.map((link) => {
            const meta = PROVIDER_META[link.provider as Provider];
            const Icon = meta?.icon ?? CheckCircle2;
            return (
              <li key={link.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{meta?.label ?? link.provider}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.email ?? link.display_name ?? link.provider_account_id}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("removeAria", { provider: meta?.label ?? link.provider })}
                  onClick={() => setConfirmRemove(link)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && availableProviders.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {availableProviders.map((provider) => {
            const meta = PROVIDER_META[provider];
            const Icon = meta.icon;
            return (
              <Button
                key={provider}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAdd(provider)}
                className="gap-2"
              >
                <Icon className={cn("size-4", provider === "google" && "")} aria-hidden="true" />
                {t("addProvider", { provider: meta.label })}
              </Button>
            );
          })}
        </div>
      )}

      <AlertDialog open={confirmRemove !== null} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeConfirmBody", {
                provider: PROVIDER_META[confirmRemove?.provider as Provider]?.label ?? confirmRemove?.provider ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removing}>
              {removing ? t("removing") : t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
