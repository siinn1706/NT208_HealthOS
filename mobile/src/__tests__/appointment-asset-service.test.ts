/* eslint-env jest */
import { appointmentAssetService } from '../api/services/appointment-asset-service';
import { apiRequest, createUploadFormData } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  createUploadFormData: jest.fn(),
  buildQuery: (params: Record<string, string | number | boolean | null | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
    });
    const text = qs.toString();
    return text ? `?${text}` : '';
  },
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockCreateUploadFormData = createUploadFormData as jest.MockedFunction<typeof createUploadFormData>;

beforeEach(() => jest.clearAllMocks());

describe('appointmentAssetService', () => {
  it('uploads appointment assets as multipart file payloads', async () => {
    const form = { _parts: [] } as unknown as FormData;
    const asset = {
      id: 'asset-1',
      appointment_id: 'apt-1',
      kind: 'attachment' as const,
      mime_type: 'application/pdf',
      size_bytes: 1234,
      sha256: 'abc',
      original_filename: 'note.pdf',
      uploaded_at: '2026-06-01T12:00:00.000Z',
    };
    const file = { uri: 'file:///note.pdf', name: 'note.pdf', type: 'application/pdf' };
    mockCreateUploadFormData.mockReturnValueOnce(form);
    mockApiRequest.mockResolvedValueOnce({ data: asset });

    const result = await appointmentAssetService.upload('apt/1', file, 'attachment');

    expect(mockCreateUploadFormData).toHaveBeenCalledWith(
      { kind: 'attachment' },
      { fieldName: 'file', ...file },
    );
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt%2F1/assets', {
      method: 'POST',
      body: form,
    });
    expect(result).toEqual(asset);
  });

  it('lists appointment asset metadata by kind', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] });

    await expect(appointmentAssetService.list('apt-1', { kind: 'lab_report' })).resolves.toEqual([]);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/assets?kind=lab_report');
  });

  it('lists current user assets by kind', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] });

    await appointmentAssetService.listUser({ kind: 'lab_report', limit: 50 });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointment-assets?kind=lab_report&limit=50');
  });

  it('mints signed urls per asset', async () => {
    const url = { url: 'https://signed.example/note.pdf', expires_in_s: 300, mime_type: 'application/pdf', original_filename: 'note.pdf' };
    mockApiRequest.mockResolvedValueOnce({ data: url });

    await expect(appointmentAssetService.signedUrl('apt-1', 'asset-1')).resolves.toEqual(url);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/assets/asset-1/url');
  });

  it('deletes an appointment asset', async () => {
    mockApiRequest.mockResolvedValueOnce(undefined);

    await appointmentAssetService.remove('apt-1', 'asset-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/assets/asset-1', {
      method: 'DELETE',
    });
  });
});
