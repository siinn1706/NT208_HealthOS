/* eslint-env jest */
import { accountExportService } from '../api/services/account-export-service';
import { apiRequest } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => jest.clearAllMocks());

describe('accountExportService', () => {
  it('requests an account data export', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'export-1', status: 'pending' } } as never);

    await expect(accountExportService.requestExport()).resolves.toEqual({ id: 'export-1', status: 'pending' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/export', {
      method: 'POST',
      timeoutMs: 60000,
    });
  });

  it('polls export status with an encoded request id', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { id: 'export/1', status: 'completed' } } as never);

    await expect(accountExportService.exportStatus('export/1')).resolves.toEqual({ id: 'export/1', status: 'completed' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/export/export%2F1');
  });

  it('gets the signed download URL for a completed export', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { url: 'https://example.test/export.zip' } } as never);

    await expect(accountExportService.exportDownload('export-1')).resolves.toEqual({ url: 'https://example.test/export.zip' });
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/users/me/export/export-1/download');
  });
});
