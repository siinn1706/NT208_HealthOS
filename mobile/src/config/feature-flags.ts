type MobileRuntimeEnv = 'development' | 'test' | 'staging' | 'production';

export type MobileFeatureFlag =
  | 'labReports'
  | 'genericAppointmentAttachments'
  | 'healthConnectNativeSync'
  | 'missingApiDiagnostics';

function normalizeRuntimeEnv(value: string | undefined): MobileRuntimeEnv {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'prod') return 'production';
  if (normalized === 'staging' || normalized === 'stage') return 'staging';
  if (normalized === 'test') return 'test';
  return 'development';
}

export function getMobileRuntimeEnv(): MobileRuntimeEnv {
  return normalizeRuntimeEnv(
    process.env.APP_ENV
    ?? process.env.EXPO_PUBLIC_APP_ENV
    ?? process.env.NODE_ENV,
  );
}

export function isMobileProduction(): boolean {
  return getMobileRuntimeEnv() === 'production';
}

export function isMobileFeatureEnabled(flag: MobileFeatureFlag): boolean {
  if (flag === 'labReports' || flag === 'genericAppointmentAttachments') return true;
  if (flag === 'healthConnectNativeSync') return true;
  if (flag === 'missingApiDiagnostics') return !isMobileProduction();
  return !isMobileProduction();
}
