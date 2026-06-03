import { apiRequest, createUploadFormData } from '../client';
import type { DataResponse } from '../../../../shared/api-contracts';
import type { MobileUploadFile } from './meal-service';

export interface PrescriptionAsset {
  id: string;
  appointment_id: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  original_filename: string | null;
  uploaded_at: string;
}

export interface PrescriptionAssetSignedUrl {
  url: string;
  expires_in_s: number;
  mime_type: string;
  original_filename: string | null;
}

function prescriptionAssetsPath(appointmentId: string) {
  return `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescription/assets`;
}

export const prescriptionAssetService = {
  async upload(appointmentId: string, file: MobileUploadFile) {
    const form = createUploadFormData({}, { fieldName: 'file', ...file });
    const response = await apiRequest<DataResponse<PrescriptionAsset>>(prescriptionAssetsPath(appointmentId), {
      method: 'POST',
      body: form,
    });
    return response.data;
  },

  async list(appointmentId: string) {
    const response = await apiRequest<DataResponse<PrescriptionAsset[]>>(prescriptionAssetsPath(appointmentId));
    return response.data;
  },

  async signedUrl(appointmentId: string, assetId: string) {
    const response = await apiRequest<DataResponse<PrescriptionAssetSignedUrl>>(
      `${prescriptionAssetsPath(appointmentId)}/${encodeURIComponent(assetId)}/url`,
    );
    return response.data;
  },

  async remove(appointmentId: string, assetId: string) {
    return apiRequest<void>(`${prescriptionAssetsPath(appointmentId)}/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
    });
  },
};
