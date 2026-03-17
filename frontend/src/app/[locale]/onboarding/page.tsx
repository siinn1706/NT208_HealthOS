import OnboardingPageClient from "./OnboardingPageClient";

export default async function OnboardingPage() {
  // This page should only be accessible to authenticated users
  // The middleware will handle protection

  return <OnboardingPageClient />;
}
