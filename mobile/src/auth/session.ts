import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const TOKEN_KEY = "healthos.session.token";
const IDENTIFIER_KEY = "healthos.session.identifier";
const MFA_PENDING_KEY = "healthos.session.mfaPending";

/**
 * Mirrors backend `app/schemas/auth.py:CurrentUser`. Both `/v1/auth/me` and
 * `/v1/users/me` return this same shape (the latter populates the optional
 * profile fields). Mobile MUST read `display_name` (not `name`) and
 * `onboarding_status` (string enum, not boolean).
 */
export interface SessionUser {
  id: string;
  email: string;
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  onboarding_status: string;
  onboarding_completed_at?: string | null;
  created_at?: string | null;

  /** Populated by GET /v1/users/me */
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | null;
  blood_type?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  phone?: string | null;
  address?: string | null;
  emergency_contacts?: Array<{
    name: string;
    phone: string;
    relationship?: string;
    email?: string;
  }> | null;
  medical_info?: {
    allergies?: string | null;
    chronic_conditions?: string | null;
    current_medications?: string | null;
    notes?: string | null;
  } | null;
}

export function isOnboardingComplete(user: SessionUser | null | undefined): boolean {
  return user?.onboarding_status === "completed";
}

/**
 * Pick the first non-empty label from the user's profile fields. Empty strings
 * from the backend should NOT render as blank — fall through to the next field.
 */
export function displayLabel(user: SessionUser | null | undefined): string {
  if (!user) return "";
  const candidates = [user.full_name, user.display_name, user.username, user.email];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return "";
}

interface SessionState {
  ready: boolean;
  token: string | null;
  user: SessionUser | null;
  mfaPending: boolean;
  /**
   * Persists the MFA-required state across cold starts. Without this, killing
   * the app on the challenge screen would let the next launch jump straight
   * to /(tabs)/home using the SecureStore-backed access token.
   */
  setToken: (token: string | null, opts?: { mfaPending?: boolean }) => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  setMfaPending: (pending: boolean) => Promise<void>;
  bootstrap: () => Promise<string | null>;
  clear: () => Promise<void>;
  rememberIdentifier: (id: string) => Promise<void>;
  getRememberedIdentifier: () => Promise<string | null>;
}

export const sessionStore = create<SessionState>((set) => ({
  ready: false,
  token: null,
  user: null,
  mfaPending: false,

  async setToken(token, opts) {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    }
    const mfaPending = opts?.mfaPending === true;
    if (mfaPending) {
      await SecureStore.setItemAsync(MFA_PENDING_KEY, "1");
    } else {
      await SecureStore.deleteItemAsync(MFA_PENDING_KEY).catch(() => undefined);
    }
    set({ token, mfaPending });
  },

  setUser(user) {
    set({ user });
  },

  async setMfaPending(pending) {
    if (pending) {
      await SecureStore.setItemAsync(MFA_PENDING_KEY, "1");
    } else {
      await SecureStore.deleteItemAsync(MFA_PENDING_KEY).catch(() => undefined);
    }
    set({ mfaPending: pending });
  },

  async bootstrap() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const mfaFlag = token
        ? await SecureStore.getItemAsync(MFA_PENDING_KEY).catch(() => null)
        : null;
      set({
        token: token ?? null,
        mfaPending: mfaFlag === "1",
        ready: true,
      });
      return token;
    } catch {
      set({ ready: true });
      return null;
    }
  },

  async clear() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(MFA_PENDING_KEY).catch(() => undefined);
    set({ token: null, user: null, mfaPending: false });
  },

  async rememberIdentifier(id) {
    await SecureStore.setItemAsync(IDENTIFIER_KEY, id);
  },

  async getRememberedIdentifier() {
    try {
      return await SecureStore.getItemAsync(IDENTIFIER_KEY);
    } catch {
      return null;
    }
  },
}));

export function useSession() {
  return sessionStore();
}
