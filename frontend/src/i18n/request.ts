import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const MESSAGE_LOADERS = {
  en: () => import("../../messages/en.json"),
  vi: () => import("../../messages/vi.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "vi" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await MESSAGE_LOADERS[locale as keyof typeof MESSAGE_LOADERS]()).default,
  };
});
