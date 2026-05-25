// Vitest setup file — mocks for jsdom environment
import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import enMessages from "../../messages/en.json";

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no IntersectionObserver — stub it so components using scroll-shadow work
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;

// Resolve a dotted key path into nested message object
function resolveKey(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

// Module-level messages store — NextIntlClientProvider sets this per render;
// afterEach resets it so tests are isolated.
let _providerMessages: Record<string, unknown> | null = null;

afterEach(() => {
  _providerMessages = null;
});

function activeMessages(): Record<string, unknown> {
  return _providerMessages ?? (enMessages as Record<string, unknown>);
}

// Global next-intl mock — returns actual message text so component structure tests pass.
// Tests that wrap with IntlWrapper (NextIntlClientProvider + locale messages) get the
// locale-specific text; unwrapped tests get English.
vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let msg = resolveKey(activeMessages(), fullKey);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return msg;
  },
  getTranslations: async (namespace?: string) => (key: string, params?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let msg = resolveKey(activeMessages(), fullKey);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return msg;
  },
  // NextIntlClientProvider: store messages so useTranslations can see them
  NextIntlClientProvider: ({ children, messages }: { children: unknown; messages?: Record<string, unknown> }) => {
    if (messages) _providerMessages = messages;
    return children;
  },
}));
