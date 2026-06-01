/* eslint-env jest */
import { getMobileRuntimeEnv, isMobileFeatureEnabled, isMobileProduction } from '../config/feature-flags';

const ORIGINAL_ENV = process.env;

describe('mobile feature flags', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('treats APP_ENV=production as production in Node tooling', () => {
    process.env.APP_ENV = 'production';

    expect(getMobileRuntimeEnv()).toBe('production');
    expect(isMobileProduction()).toBe(true);
    expect(isMobileFeatureEnabled('labReports')).toBe(true);
    expect(isMobileFeatureEnabled('genericAppointmentAttachments')).toBe(true);
    expect(isMobileFeatureEnabled('healthConnectNativeSync')).toBe(true);
    expect(isMobileFeatureEnabled('missingApiDiagnostics')).toBe(false);
  });

  it('keeps diagnostics available outside production', () => {
    process.env.APP_ENV = 'staging';

    expect(getMobileRuntimeEnv()).toBe('staging');
    expect(isMobileFeatureEnabled('labReports')).toBe(true);
    expect(isMobileFeatureEnabled('missingApiDiagnostics')).toBe(true);
  });
});
