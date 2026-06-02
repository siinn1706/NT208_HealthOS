import { Redirect } from 'expo-router';
import { ONBOARDING_SETUP_ROUTE } from '../../src/auth/auth-route-policy';

export default function OnboardingIndexRoute() {
  return <Redirect href={ONBOARDING_SETUP_ROUTE as never} />;
}
