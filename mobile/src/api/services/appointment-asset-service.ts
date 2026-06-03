import { apiRequest, buildQuery, createUploadFormData } from '../client';
import type {
  AppointmentAsset,
  AppointmentAssetKind,
  AppointmentAssetSignedUrl,
  DataResponse,
} from '../../../../shared/api-contracts';
import type { MobileUploadFile } from './meal-service';

interface AssetListParams {
  kind?: AppointmentAssetKind;
  limit?: number;
}

function appointmentAssetsPath(appointmentId: string) {
  return `/api/v1/appointments/${encodeURIComponent(appointmentId)}/assets`;
}

export const appointmentAssetService = {
  async upload(appointmentId: string, file: MobileUploadFile, kind: AppointmentAssetKind = 'attachment') {
    const form = createUploadFormData({ kind }, { fieldName: 'file', ...file });
    const response = await apiRequest<DataResponse<AppointmentAsset>>(appointmentAssetsPath(appointmentId), {
      method: 'POST',
      body: form,
    });
    return response.data;
  },

  async list(appointmentId: string, params: AssetListParams = {}) {
    const response = await apiRequest<DataResponse<AppointmentAsset[]>>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/assets${buildQuery({ kind: params.kind })}`,
    );
    return response.data;
  },

  async listUser(params: AssetListParams = {}) {
    const response = await apiRequest<DataResponse<AppointmentAsset[]>>(
      `/api/v1/appointment-assets${buildQuery({ kind: params.kind, limit: params.limit })}`,
    );
    return response.data;
  },

  async signedUrl(appointmentId: string, assetId: string) {
    const response = await apiRequest<DataResponse<AppointmentAssetSignedUrl>>(
      `${appointmentAssetsPath(appointmentId)}/${encodeURIComponent(assetId)}/url`,
    );
    return response.data;
  },

  async remove(appointmentId: string, assetId: string) {
    return apiRequest<void>(`${appointmentAssetsPath(appointmentId)}/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
    });
  },
};
