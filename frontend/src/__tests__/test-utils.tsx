/**
 * Shared test utilities — i18n wrapper for components using next-intl.
 */
import React from "react";
import { NextIntlClientProvider } from "next-intl";
import viMessages from "../../messages/vi.json";

export function IntlWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="vi" messages={viMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
