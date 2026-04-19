"use client";

import { useEffect } from "react";
import { migrateLegacyKeys } from "@/lib/user-scoped-storage";
import { track } from "@/lib/analytics";

/**
 * One-shot bootstrap component that migrates pre-hotfix global localStorage
 * keys (`healthos.onboarding.draft.v1`, `healthos.offline-queue.v1`,
 * `healthos:chat-draft:v1:*`) into per-user namespaced keys for the currently
 * logged-in user. Runs once per device, gated by the
 * `healthos.storage-migration.v2` flag so reload doesn't re-process.
 *
 * Renders nothing. Mounted once at the root of the authenticated layout.
 */
export function ClientStorageMigration() {
  useEffect(() => {
    void migrateLegacyKeys()
      .then((outcome) => {
        if (outcome.migrated.length === 0 && outcome.skipped.length === 0) return;
        track("storage.migration.complete", {
          migrated: outcome.migrated.length,
          skipped: outcome.skipped.length,
        });
      })
      .catch(() => {
        /* ignore — migration can re-run next session */
      });
  }, []);

  return null;
}
