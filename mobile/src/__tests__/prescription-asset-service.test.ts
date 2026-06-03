/* eslint-env jest */
import { prescriptionAssetService } from '../api/services/prescription-asset-service';
import { apiRequest, createUploadFormData } from '../api/client';

jest.mock('../api/client', () => ({
  apiRequest: jest.fn(),
  createUploadFormData: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockCreateUploadFormData = createUploadFormData as jest.MockedFunction<typeof createUploadFormData>;

beforeEach(() => jest.clearAllMocks());

describe('prescriptionAssetService', () => {
  it('uploads prescription assets as multipart file payloads', async () => {
    const form = { _parts: [] } as unknown as FormData;
    const asset = {
      id: 'asset-1',
      appointment_id: 'apt-1',
      mime_type: 'application/pdf',
      size_bytes: 1234,
      sha256: 'abc',
      original_filename: 'rx.pdf',
      uploaded_at: '2026-05-20T12:00:00.000Z',
    };
    const file = { uri: 'file:///rx.pdf', name: 'rx.pdf', type: 'application/pdf' };
    mockCreateUploadFormData.mockReturnValueOnce(form);
    mockApiRequest.mockResolvedValueOnce({ data: asset });

    const result = await prescriptionAssetService.upload('apt/1', file);

    expect(mockCreateUploadFormData).toHaveBeenCalledWith(
      {},
      { fieldName: 'file', ...file },
    );
    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt%2F1/prescription/assets', {
      method: 'POST',
      body: form,
    });
    expect(result).toEqual(asset);
  });

  it('lists prescription asset metadata without signed urls', async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] });

    await expect(prescriptionAssetService.list('apt-1')).resolves.toEqual([]);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/prescription/assets');
  });

  it('mints signed urls per asset', async () => {
    const url = { url: 'https://signed.example/rx.pdf', expires_in_s: 300, mime_type: 'application/pdf', original_filename: 'rx.pdf' };
    mockApiRequest.mockResolvedValueOnce({ data: url });

    await expect(prescriptionAssetService.signedUrl('apt-1', 'asset-1')).resolves.toEqual(url);

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/prescription/assets/asset-1/url');
  });

  it('deletes a prescription asset', async () => {
    mockApiRequest.mockResolvedValueOnce(undefined);

    await prescriptionAssetService.remove('apt-1', 'asset-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/api/v1/appointments/apt-1/prescription/assets/asset-1', {
      method: 'DELETE',
    });
  });
});
