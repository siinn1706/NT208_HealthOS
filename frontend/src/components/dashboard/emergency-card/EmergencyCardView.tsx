/**
 * EmergencyCardView — pure visual rendering of a public emergency card.
 *
 * Used by BOTH the owner-side dashboard preview and the un-authenticated
 * public `/e/<token>` page so what the owner sees is exactly what
 * paramedics will see. The component:
 *
 *   * Renders only sections that have data — empty sections are omitted
 *     (not "None") so the card stays readable on a small screen.
 *   * Uses tappable `tel:` links on emergency contacts so the dialer
 *     opens immediately on a responder's phone.
 *   * Includes a print stylesheet matching CR80 wallet-card aspect so
 *     `window.print()` produces a usable laminated card.
 *   * Has high-contrast typography (≥16pt body, ≥24pt blood type) and
 *     no animations — readable one-handed on a cracked screen.
 */
import {
  Activity,
  AlertTriangle,
  Droplet,
  HeartPulse,
  Languages,
  Phone,
  Pill,
  Shield,
  Stethoscope,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import type {
  PublicEmergencyCard,
  PublicEmergencyContact,
} from "@/lib/emergency-card-types";

interface EmergencyCardViewProps {
  card: PublicEmergencyCard;
  /** Compact preview rendering (smaller paddings, used in dashboard side panel). */
  compact?: boolean;
  /** Override label for the top banner. Defaults to "EMERGENCY HEALTH CARD". */
  bannerLabel?: string;
  /** When true, renders the print-only @media block so window.print() works. */
  enablePrintLayout?: boolean;
  /** Provenance line — e.g. "Updated 2 days ago — Card #abc12345". */
  provenanceLine?: string | null;
  /** Locale for assistance / language label rendering. */
  locale?: string;
}

const ASSISTANCE_LABELS: Record<string, { en: string; vi: string }> = {
  walking: { en: "Walking assistance", vi: "Hỗ trợ di chuyển" },
  communication: { en: "Communication aid", vi: "Hỗ trợ giao tiếp" },
  dietary: { en: "Dietary needs", vi: "Chế độ ăn đặc biệt" },
  hearing: { en: "Hearing impaired", vi: "Khiếm thính" },
  vision: { en: "Vision impaired", vi: "Khiếm thị" },
  cognitive: { en: "Cognitive support", vi: "Hỗ trợ nhận thức" },
};

function bloodTypeColor(bt?: string | null): string {
  // Color-coded chip for at-a-glance recognition. Negative types get a
  // crimson ring; O-negative (universal donor) gets a special amber ring.
  if (!bt) return "bg-muted text-muted-foreground";
  const upper = bt.trim().toUpperCase();
  if (upper === "O-") return "bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-100";
  if (upper.endsWith("-")) return "bg-red-50 text-red-900 ring-red-300 dark:bg-red-950 dark:text-red-100";
  return "bg-blue-50 text-blue-900 ring-blue-300 dark:bg-blue-950 dark:text-blue-100";
}

function CardSection({
  icon: Icon,
  title,
  children,
  emphasis,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  emphasis?: "danger" | "warning";
}) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-3.5 print:break-inside-avoid",
        emphasis === "danger" && "border-red-300 bg-red-50/60 dark:bg-red-950/30",
        emphasis === "warning" && "border-amber-300 bg-amber-50/60 dark:bg-amber-950/30",
        !emphasis && "border-border"
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <Icon
          className={cn(
            "size-4 shrink-0",
            emphasis === "danger"
              ? "text-red-700 dark:text-red-400"
              : emphasis === "warning"
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
          )}
          aria-hidden
        />
        <h2
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            emphasis === "danger"
              ? "text-red-800 dark:text-red-300"
              : emphasis === "warning"
                ? "text-amber-800 dark:text-amber-300"
                : "text-muted-foreground"
          )}
        >
          {title}
        </h2>
      </header>
      <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.map((item, i) => (
        <li key={`${i}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

// U6 — strict tel: normalization. Strips every char except `+` and digits
// so the dialer receives a clean RFC 3966 URI; pre-existing impl only
// stripped whitespace and would leave parens / dashes that some Android
// dialers reject.
function _normalizeTel(raw: string): string {
  return raw.replace(/[^+\d]/g, "");
}

function ContactRow({ c }: { c: PublicEmergencyContact }) {
  const telHref = `tel:${_normalizeTel(c.phone)}`;
  return (
    <a
      href={telHref}
      className="-mx-1.5 flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Call ${c.name} at ${c.phone}`}
    >
      <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 truncate font-medium">{c.name}</span>
      {c.relationship && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {c.relationship}
        </span>
      )}
      <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
        {c.phone}
      </span>
    </a>
  );
}

function GenderLabel({
  gender,
  locale,
}: {
  gender?: string | null;
  locale: string;
}) {
  if (!gender) return null;
  const label =
    locale === "vi"
      ? { male: "Nam", female: "Nữ", other: "Khác" }[gender] ?? gender
      : { male: "Male", female: "Female", other: "Other" }[gender] ?? gender;
  return <span>{label}</span>;
}

export function EmergencyCardView({
  card,
  compact = false,
  bannerLabel,
  enablePrintLayout = false,
  provenanceLine,
  locale = "en",
}: EmergencyCardViewProps) {
  const banner = bannerLabel ?? (locale === "vi" ? "THẺ Y TẾ KHẨN CẤP" : "EMERGENCY HEALTH CARD");

  const ageGenderParts: React.ReactNode[] = [];
  if (typeof card.age_years === "number") {
    ageGenderParts.push(
      <span key="age">
        {locale === "vi" ? `${card.age_years} tuổi` : `Age ${card.age_years}`}
      </span>
    );
  }
  if (card.gender) {
    ageGenderParts.push(<GenderLabel key="g" gender={card.gender} locale={locale} />);
  }

  const showAllergies = card.nkda_confirmed || card.allergies.length > 0;
  const allergiesEmphasis: "danger" | undefined =
    card.allergies.length > 0 ? "danger" : undefined;
  const conditionsEmphasis: "warning" | undefined =
    card.chronic_conditions.length > 0 ? "warning" : undefined;

  return (
    <article
      className={cn(
        "mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        compact ? "text-sm" : "text-base",
        "print:max-w-none print:rounded-none print:border-0 print:shadow-none print:bg-white print:text-black"
      )}
      aria-label={banner}
    >
      {enablePrintLayout && (
        // CR80 (credit-card) print layout — landscape 85.6×54mm, no margins.
        // The screen rendering above is unaffected; only `@media print`
        // applies the wallet-card geometry.
        <style>{`
          @media print {
            @page { size: 85.6mm 53.98mm landscape; margin: 0; }
            html, body { background: white !important; }
            .ec-print-hide { display: none !important; }
          }
        `}</style>
      )}

      {/* Top banner */}
      <header className="border-b border-border bg-gradient-to-b from-red-600 to-red-700 px-4 py-2.5 text-white print:bg-red-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">
              {banner}
            </span>
          </div>
          {card.preferred_language && (
            <span
              className="flex items-center gap-1 text-[11px] uppercase opacity-90"
              title={locale === "vi" ? "Ngôn ngữ ưa thích" : "Preferred language"}
            >
              <Languages className="size-3" aria-hidden />
              {card.preferred_language}
            </span>
          )}
        </div>
      </header>

      {/* Identity + blood type hero */}
      <section className="flex items-start gap-3 border-b border-border px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <UserIcon className="size-3.5 text-muted-foreground" aria-hidden />
            <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {locale === "vi" ? "Bệnh nhân" : "Patient"}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xl font-bold leading-tight text-foreground">
            {card.full_name ??
              (locale === "vi" ? "Không có tên" : "Name not provided")}
          </p>
          {ageGenderParts.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {ageGenderParts.reduce<React.ReactNode[]>((acc, part, i) => {
                if (i > 0) acc.push(<span key={`s${i}`}> · </span>);
                acc.push(part);
                return acc;
              }, [])}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {card.blood_type ? (
            <div
              className={cn(
                "inline-flex flex-col items-center justify-center rounded-xl px-3 py-1.5 ring-2",
                bloodTypeColor(card.blood_type)
              )}
              aria-label={`Blood type ${card.blood_type}`}
            >
              {/* L6 — droplet icon supplements the color cue for */}
              {/* color-blind responders. */}
              <span className="flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-70">
                <Droplet className="size-2.5" aria-hidden />
                {locale === "vi" ? "Nhóm máu" : "Blood"}
              </span>
              <span className="text-2xl font-black leading-none">{card.blood_type}</span>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center rounded-xl border border-dashed border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              {locale === "vi" ? "Chưa cung cấp nhóm máu" : "Blood type N/A"}
            </div>
          )}
        </div>
      </section>

      {/* Body sections */}
      <div className="space-y-2.5 px-4 py-3.5">
        {showAllergies && (
          <CardSection
            icon={AlertTriangle}
            title={locale === "vi" ? "Dị ứng" : "Allergies"}
            emphasis={allergiesEmphasis}
          >
            {card.allergies.length > 0 ? (
              <BulletList items={card.allergies} />
            ) : (
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                {locale === "vi"
                  ? "Không có dị ứng thuốc đã biết (NKDA)"
                  : "NKDA — No known drug allergies"}
              </p>
            )}
          </CardSection>
        )}

        {card.chronic_conditions.length > 0 && (
          <CardSection
            icon={Stethoscope}
            title={locale === "vi" ? "Bệnh mạn tính" : "Chronic conditions"}
            emphasis={conditionsEmphasis}
          >
            <BulletList items={card.chronic_conditions} />
          </CardSection>
        )}

        {card.medications.length > 0 && (
          <CardSection
            icon={Pill}
            title={locale === "vi" ? "Thuốc đang dùng" : "Current medications"}
          >
            <ul className="list-disc space-y-0.5 pl-4">
              {card.medications.map((m, i) => (
                <li key={`${i}-${m.name}`}>
                  <span className="font-medium">{m.name}</span>
                  {m.strength && (
                    <span className="ml-1 text-muted-foreground">{m.strength}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardSection>
        )}

        {card.assistance_needed.length > 0 && (
          <CardSection
            icon={Activity}
            title={locale === "vi" ? "Hỗ trợ cần thiết" : "Assistance needed"}
          >
            <div className="flex flex-wrap gap-1.5">
              {card.assistance_needed.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
                >
                  {ASSISTANCE_LABELS[a]?.[locale === "vi" ? "vi" : "en"] ?? a}
                </span>
              ))}
            </div>
          </CardSection>
        )}

        {card.equipment_notes && (
          <CardSection
            icon={Wrench}
            title={locale === "vi" ? "Thiết bị y tế" : "Medical equipment"}
          >
            <p className="whitespace-pre-line">{card.equipment_notes}</p>
          </CardSection>
        )}

        {card.communication_notes && (
          <CardSection
            icon={Languages}
            title={locale === "vi" ? "Giao tiếp" : "Communication"}
          >
            <p className="whitespace-pre-line">{card.communication_notes}</p>
          </CardSection>
        )}

        {card.emergency_contacts.length > 0 && (
          <CardSection
            icon={Phone}
            title={locale === "vi" ? "Liên hệ khẩn cấp (ICE)" : "Emergency contacts (ICE)"}
          >
            <div className="space-y-0.5">
              {card.emergency_contacts.map((c, i) => (
                <ContactRow key={`${i}-${c.phone}`} c={c} />
              ))}
            </div>
          </CardSection>
        )}
      </div>

      {/* Footer — provenance + privacy disclaimer */}
      <footer className="space-y-1 border-t border-border bg-muted/40 px-4 py-2.5 text-center text-[11px] leading-snug text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <Shield className="size-3" aria-hidden />
          <span>HealthOS</span>
          {provenanceLine && (
            <>
              <span aria-hidden>·</span>
              <span>{provenanceLine}</span>
            </>
          )}
        </div>
        <p className="leading-snug">
          {locale === "vi"
            ? "Thông tin chỉ dùng cho cấp cứu. Không thay thế tư vấn y khoa chuyên nghiệp."
            : "For emergency reference only. Not a substitute for professional medical advice."}
        </p>
      </footer>
    </article>
  );
}
