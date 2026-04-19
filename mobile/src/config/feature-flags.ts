import { env } from "./env";

export const featureFlags = {
  aiChat: env.aiFeaturesEnabled,
  oauth: false,
  pushNotifications: false,
  chatAttachments: false,
  achievements: false,
  accountExportDelete: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
