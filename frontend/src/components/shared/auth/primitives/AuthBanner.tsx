"use client";

import * as React from "react";
import { Banner, type BannerProps } from "@/components/shared/state/Banner";

/**
 * Variant-aware banner used inside AuthShell. Defaults to the destructive
 * styling needed for OAuth/login failure announcements but supports info /
 * success / warning for breach notices and recovery flows.
 */
export type AuthBannerProps = BannerProps;

export function AuthBanner(props: AuthBannerProps) {
  return <Banner {...props} />;
}
