import { apiRequest } from '../client';
import type { AccountDataExportDownload, AccountDataExportRequest, DataResponse } from '../../../../shared/api-contracts';

export const accountExportService = {
  async requestExport() {
    const response = await apiRequest<DataResponse<AccountDataExportRequest>>('/v1/users/me/export', {
      method: 'POST',
      timeoutMs: 60000,
    });
    return response.data;
  },

  async exportStatus(requestId: string) {
    const response = await apiRequest<DataResponse<AccountDataExportRequest>>(
      `/v1/users/me/export/${encodeURIComponent(requestId)}`,
    );
    return response.data;
  },

  async exportDownload(requestId: string) {
    const response = await apiRequest<DataResponse<AccountDataExportDownload>>(
      `/v1/users/me/export/${encodeURIComponent(requestId)}/download`,
    );
    return response.data;
  },
};
