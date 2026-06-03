/* eslint-env jest */
import { securityService } from '../api/services/security-service';
import { apiRequest, buildQuery } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  buildQuery: jest.fn((params: Record<string, unknown>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : '';
  }),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockBuildQuery = buildQuery as jest.MockedFunction<typeof buildQuery>;

beforeEach(() => jest.clearAllMocks());

describe('securityService', () => {
  it('fetches MFA status', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { enabled: true } } as never);

    await expect(securityService.mfaStatus()).resolves.toEqual({ enabled: true });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/status');
  });

  it('starts MFA setup', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { secret: 'abc', qr_code: '123', recovery_codes: ['x'] } } as never);

    await expect(securityService.mfaSetup()).resolves.toEqual({ secret: 'abc', qr_code: '123', recovery_codes: ['x'] });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/setup', { method: 'POST' });
  });

  it('verifies setup code', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { enabled: true } } as never);

    await expect(securityService.verifyMfaSetup('123456')).resolves.toEqual({ enabled: true });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/verify-setup', {
      method: 'POST',
      json: { code: '123456' },
    });
  });

  it('verifies MFA login code', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { verified: true, method: 'totp' } } as never);

    await expect(securityService.verifyMfa('123456')).resolves.toEqual({ verified: true, method: 'totp' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/verify', {
      method: 'POST',
      json: { code: '123456' },
    });
  });

  it('disables MFA with verification code', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { enabled: false } } as never);

    await expect(securityService.disableMfa('654321')).resolves.toEqual({ enabled: false });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/disable', {
      method: 'POST',
      json: { code: '654321' },
    });
  });

  it('regenerates recovery codes', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { enabled: true, recovery_codes: ['A', 'B'] } } as never);

    await expect(securityService.regenerateRecoveryCodes('654321')).resolves.toEqual({ enabled: true, recovery_codes: ['A', 'B'] });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/mfa/regenerate-recovery-codes', {
      method: 'POST',
      json: { code: '654321' },
    });
  });

  it('loads security logs with filter query', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [{ id: 'log-1', event_type: 'mfa_enabled' }] } as never);

    await expect(securityService.securityLogs({ event_type: 'mfa_enabled', limit: 10, offset: 0 })).resolves.toEqual([
      { id: 'log-1', event_type: 'mfa_enabled' },
    ]);
    expect(mockBuildQuery).toHaveBeenCalledWith({ event_type: 'mfa_enabled', limit: 10, offset: 0 });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/security-logs/?event_type=mfa_enabled&limit=10&offset=0');
  });
});
