import type { CurrentUser } from '../types/api';

export const AUTH_WELCOME_ROUTE = '/auth/welcome';
export const HOME_ROUTE = '/home';
export const ONBOARDING_SETUP_ROUTE = '/onboarding/setup';

const PUBLIC_ROUTES = new Set([
  'auth/welcome',
  'auth/sign-in',
  'auth/sign-up',
  'auth/otp',
  'auth/mfa',
  'auth/forgot',
  'auth/oauth/callback',
]);

export function isPublicAuthRoute(segments: readonly string[], devMode = __DEV__): boolean {
  const route = segments.join('/');
  if (devMode && segments[0] === 'dev') return true;
  return PUBLIC_ROUTES.has(route);
}

export function getPostAuthRoute(onboardingStatus: CurrentUser['onboarding_status'] | null | undefined) {
  return onboardingStatus === 'completed' ? HOME_ROUTE : ONBOARDING_SETUP_ROUTE;
}

export function getAuthGateRedirect({
  authenticated,
  segments,
  onboardingStatus,
  devMode = __DEV__,
}: {
  authenticated: boolean;
  segments: readonly string[];
  onboardingStatus?: CurrentUser['onboarding_status'] | null;
  devMode?: boolean;
}) {
  const root = segments[0] ?? '';
  const isPublic = isPublicAuthRoute(segments, devMode);

  if (!authenticated && !isPublic) {
    return AUTH_WELCOME_ROUTE;
  }

  if (!authenticated) return null;
  if (devMode && root === 'dev') return null;

  const postAuthRoute = getPostAuthRoute(onboardingStatus);
  if (root === 'auth') {
    return postAuthRoute;
  }
  if (postAuthRoute === ONBOARDING_SETUP_ROUTE && root !== 'onboarding') {
    return ONBOARDING_SETUP_ROUTE;
  }
  if (postAuthRoute === HOME_ROUTE && root === 'onboarding') {
    return HOME_ROUTE;
  }
  return null;
}
