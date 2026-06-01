/* eslint-env jest */
import {
  AUTH_WELCOME_ROUTE,
  getAuthGateRedirect,
  getPostAuthRoute,
  HOME_ROUTE,
  isPublicAuthRoute,
  ONBOARDING_SETUP_ROUTE,
} from '../auth/auth-route-policy';

describe('auth route policy', () => {
  it('keeps the intended auth entry routes public', () => {
    expect(isPublicAuthRoute(['auth', 'welcome'], false)).toBe(true);
    expect(isPublicAuthRoute(['auth', 'sign-in'], false)).toBe(true);
    expect(isPublicAuthRoute(['auth', 'sign-up'], false)).toBe(true);
    expect(isPublicAuthRoute(['auth', 'otp'], false)).toBe(true);
  });

  it('does not make protected onboarding routes public', () => {
    expect(isPublicAuthRoute(['onboarding', 'setup'], false)).toBe(false);
    expect(isPublicAuthRoute(['onboarding', 'permissions', 'camera'], false)).toBe(false);
    expect(isPublicAuthRoute(['auth', 'setup'], false)).toBe(false);
  });

  it('keeps dev routes public only in development', () => {
    expect(isPublicAuthRoute(['dev', 'primitives'], true)).toBe(true);
    expect(isPublicAuthRoute(['dev', 'primitives'], false)).toBe(false);
  });

  it('routes only completed users to the main app after auth', () => {
    expect(getPostAuthRoute('completed')).toBe(HOME_ROUTE);
    expect(getPostAuthRoute('pending')).toBe(ONBOARDING_SETUP_ROUTE);
    expect(getPostAuthRoute('in_progress')).toBe(ONBOARDING_SETUP_ROUTE);
    expect(getPostAuthRoute('complete')).toBe(ONBOARDING_SETUP_ROUTE);
    expect(getPostAuthRoute(null)).toBe(ONBOARDING_SETUP_ROUTE);
  });

  it('uses onboarding-aware redirects from the root auth gate', () => {
    expect(getAuthGateRedirect({
      authenticated: false,
      segments: ['home'],
      devMode: false,
    })).toBe(AUTH_WELCOME_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['auth', 'sign-in'],
      onboardingStatus: 'pending',
      devMode: false,
    })).toBe(ONBOARDING_SETUP_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['auth', 'sign-in'],
      onboardingStatus: 'completed',
      devMode: false,
    })).toBe(HOME_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['auth', 'setup'],
      onboardingStatus: 'pending',
      devMode: false,
    })).toBe(ONBOARDING_SETUP_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['auth', 'setup'],
      onboardingStatus: 'completed',
      devMode: false,
    })).toBe(HOME_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['home'],
      onboardingStatus: 'in_progress',
      devMode: false,
    })).toBe(ONBOARDING_SETUP_ROUTE);

    expect(getAuthGateRedirect({
      authenticated: true,
      segments: ['onboarding', 'setup'],
      onboardingStatus: 'completed',
      devMode: false,
    })).toBe(HOME_ROUTE);
  });
});
