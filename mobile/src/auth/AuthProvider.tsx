import React, { useEffect, useRef } from "react";
import { useRouter, useSegments } from "expo-router";
import { sessionStore } from "./session";
import { appEvents } from "@/api/events";
import { fetchCurrentUser } from "@/api/endpoints/users";
import { ApiError } from "@/api/errors";
import { useNotificationDeepLinks } from "@/notifications/deep-link";
import { configureForegroundHandler } from "@/notifications/permissions";
import { setReporterUser } from "@/observability/reporter";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const ready = sessionStore((s) => s.ready);
  const token = sessionStore((s) => s.token);
  const user = sessionStore((s) => s.user);
  const mfaPending = sessionStore((s) => s.mfaPending);

  const router = useRouter();
  const segments = useSegments();
  const bootstrapped = useRef(false);

  useNotificationDeepLinks();

  useEffect(() => {
    configureForegroundHandler();
  }, []);

  useEffect(() => {
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      void sessionStore.getState().bootstrap();
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      sessionStore.getState().setUser(null);
      return;
    }
    // Don't fetch the user profile while MFA is still required — the access
    // token is technically usable, but we want to keep the post-MFA UI dark
    // until verifyMfa succeeds.
    if (mfaPending) return;
    if (user) return;
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchCurrentUser();
        if (!cancelled) {
          sessionStore.getState().setUser(fetched);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "AUTH_EXPIRED") {
          await sessionStore.getState().clear();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, token, user, mfaPending]);

  useEffect(() => {
    const off = appEvents.on("auth:expired", async () => {
      await sessionStore.getState().clear();
    });
    return off;
  }, []);

  useEffect(() => {
    setReporterUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!token) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (mfaPending) {
      if (segments.join("/") !== "(auth)/mfa-challenge") {
        router.replace("/(auth)/mfa-challenge");
      }
      return;
    }

    if (user && user.onboarding_status !== "completed") {
      if (!inOnboarding) {
        router.replace("/(onboarding)/0");
      }
      return;
    }

    if (inAuthGroup || inOnboarding) {
      router.replace("/(tabs)/home");
    }
  }, [ready, token, user, mfaPending, segments, router]);

  return <>{children}</>;
}
