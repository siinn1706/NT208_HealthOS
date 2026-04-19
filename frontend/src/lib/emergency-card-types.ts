/**
 * Emergency Health Card — TypeScript types mirroring `app.schemas.emergency`.
 *
 * Keep in sync with the Pydantic DTOs. The single most important contract
 * is `PublicEmergencyCardDTO` — adding a field here without first adding
 * it to the BE schema risks shipping unsynchronized wire shapes.
 */

export type AssistanceNeed =
  | "walking"
  | "communication"
  | "dietary"
  | "hearing"
  | "vision"
  | "cognitive";

export const ASSISTANCE_NEEDS: readonly AssistanceNeed[] = [
  "walking",
  "communication",
  "dietary",
  "hearing",
  "vision",
  "cognitive",
] as const;

export type EmergencyCardField =
  | "blood_type"
  | "age"
  | "gender"
  | "allergies"
  | "conditions"
  | "medications"
  | "contacts"
  | "assistance"
  | "equipment"
  | "communication"
  | "preferred_language";

export const EMERGENCY_CARD_FIELDS: readonly EmergencyCardField[] = [
  "blood_type",
  "age",
  "gender",
  "allergies",
  "conditions",
  "medications",
  "contacts",
  "assistance",
  "equipment",
  "communication",
  "preferred_language",
] as const;

export interface PublicEmergencyContact {
  name: string;
  relationship?: string | null;
  phone: string;
}

export interface PublicEmergencyMedication {
  name: string;
  strength?: string | null;
}

export interface PublicEmergencyCard {
  full_name?: string | null;
  age_years?: number | null;
  gender?: "male" | "female" | "other" | null;
  preferred_language?: string | null;

  blood_type?: string | null;
  nkda_confirmed: boolean;
  allergies: string[];
  chronic_conditions: string[];
  medications: PublicEmergencyMedication[];

  assistance_needed: AssistanceNeed[];
  equipment_notes?: string | null;
  communication_notes?: string | null;

  emergency_contacts: PublicEmergencyContact[];

  last_updated_at?: string | null;
}

export interface EmergencyShareToken {
  id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  is_active: boolean;
}

export interface EmergencyShareTokenWithSecret {
  token_meta: EmergencyShareToken;
  token: string;
  share_url: string;
  qr_png_data_url: string;
  /** `null` when the WeasyPrint stack is unavailable on the BE worker. */
  wallet_pdf_data_url?: string | null;
}

export interface EmergencyAccessLog {
  id: string;
  token_id: string;
  ip_truncated?: string | null;
  user_agent?: string | null;
  accessed_at: string;
}

export interface CompletenessNudge {
  field: string;
  level: "critical" | "recommended";
  message_key: string;
  fix_path: string;
}

export interface EmergencyProfileOwnerView {
  is_published: boolean;
  assistance_needed: AssistanceNeed[];
  equipment_notes?: string | null;
  communication_notes?: string | null;
  field_visibility: Partial<Record<EmergencyCardField, boolean>>;
  nkda_confirmed: boolean;
  preferred_language?: string | null;
  last_published_at?: string | null;

  card: PublicEmergencyCard;
  completeness_score: number;
  missing_critical_fields: string[];
  nudges: CompletenessNudge[];

  tokens: EmergencyShareToken[];
  active_token_count: number;
  max_active_tokens: number;
}

export interface EmergencyProfileUpdate {
  is_published?: boolean;
  assistance_needed?: AssistanceNeed[];
  equipment_notes?: string | null;
  communication_notes?: string | null;
  field_visibility?: Partial<Record<EmergencyCardField, boolean>>;
  nkda_confirmed?: boolean;
  preferred_language?: string | null;
}

export interface EmergencyShareTokenCreateBody {
  label: string;
  acknowledge_low_completeness?: boolean;
}

/**
 * F1 — Local draft of the editable overrides used by the dashboard's
 * live preview. The parent (`EmergencyCardManager`) holds the draft and
 * passes it down to `EmergencyEditForm` (writes) and the preview overlay
 * (reads). Save reconciles draft -> server.
 */
export interface EmergencyEditDraft {
  field_visibility: Partial<Record<EmergencyCardField, boolean>>;
  nkda_confirmed: boolean;
  equipment_notes: string | null;
  communication_notes: string | null;
  assistance_needed: AssistanceNeed[];
  preferred_language: string | null;
}

export function draftFromView(view: EmergencyProfileOwnerView): EmergencyEditDraft {
  return {
    field_visibility: { ...view.field_visibility },
    nkda_confirmed: view.nkda_confirmed,
    equipment_notes: view.equipment_notes ?? null,
    communication_notes: view.communication_notes ?? null,
    assistance_needed: [...view.assistance_needed],
    preferred_language: view.preferred_language ?? null,
  };
}

/**
 * Overlay the draft on top of the server-derived `card` so the preview
 * reflects unsaved edits. Intentional limitation: a draft that *unhides*
 * a previously hidden field cannot show its value (the server filtered
 * it out before sending) — the unsaved unhide is silently a no-op until
 * the user clicks Save and the server re-derives the card.
 */
export function applyDraftToCard(
  baseCard: PublicEmergencyCard,
  draft: EmergencyEditDraft
): PublicEmergencyCard {
  const next: PublicEmergencyCard = {
    ...baseCard,
    allergies: [...baseCard.allergies],
    chronic_conditions: [...baseCard.chronic_conditions],
    medications: [...baseCard.medications],
    emergency_contacts: [...baseCard.emergency_contacts],
    assistance_needed: [...baseCard.assistance_needed],
  };

  const isHidden = (field: EmergencyCardField): boolean =>
    draft.field_visibility[field] === false;

  if (isHidden("blood_type")) next.blood_type = null;
  if (isHidden("age")) next.age_years = null;
  if (isHidden("gender")) next.gender = null;
  if (isHidden("allergies")) {
    next.allergies = [];
    next.nkda_confirmed = false;
  } else {
    next.nkda_confirmed = draft.nkda_confirmed && next.allergies.length === 0;
  }
  if (isHidden("conditions")) next.chronic_conditions = [];
  if (isHidden("medications")) next.medications = [];
  if (isHidden("contacts")) next.emergency_contacts = [];

  // Owner-controlled fields — drive the preview from the draft (these
  // values are not filtered server-side, only visibility-gated).
  next.assistance_needed = isHidden("assistance") ? [] : [...draft.assistance_needed];
  next.equipment_notes = isHidden("equipment") ? null : (draft.equipment_notes || null);
  next.communication_notes = isHidden("communication")
    ? null
    : (draft.communication_notes || null);
  next.preferred_language = isHidden("preferred_language")
    ? null
    : (draft.preferred_language || null);

  return next;
}
