import { render } from '@testing-library/react-native';
import OnboardingIndexRoute from '../../app/onboarding';
import { ONBOARDING_SETUP_ROUTE } from '../../src/auth/auth-route-policy';

const mockRedirectHrefs: string[] = [];

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirectHrefs.push(String(href));
    return null;
  },
}));

describe('OnboardingIndexRoute', () => {
  beforeEach(() => {
    mockRedirectHrefs.length = 0;
  });

  it('redirects /onboarding to the setup route', () => {
    render(<OnboardingIndexRoute />);

    expect(mockRedirectHrefs).toEqual([ONBOARDING_SETUP_ROUTE]);
  });
});
