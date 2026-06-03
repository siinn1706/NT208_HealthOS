import { apiRequest, buildQuery } from '../client';
import type { DataResponse, HealthReport, ReportExportDownload, ReportExportRequest, TrendAnalysis } from '../../../../shared/api-contracts';

export const reportService = {
  async get(period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<HealthReport>>(`/api/v1/reports${buildQuery({ period })}`);
    return response.data;
  },

  async generate(period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<HealthReport>>(`/api/v1/reports${buildQuery({ period })}`, {
      method: 'POST',
      timeoutMs: 60000,
    });
    return response.data;
  },

  async trends(metric: string, period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<TrendAnalysis>>(`/api/v1/reports/trends${buildQuery({ metric, period })}`);
    return response.data;
  },

  async trendsBatch(metrics: string[], period: '7d' | '30d' | '90d' = '7d') {
    const response = await apiRequest<DataResponse<Record<string, TrendAnalysis>>>(
      `/api/v1/reports/trends/batch${buildQuery({ metrics: metrics.join(','), period })}`,
    );
    return response.data;
  },

  async requestPdf(body: {
    period: '7d' | '30d' | '90d';
    sections: string[];
    locale?: 'en' | 'vi';
    include_sensitive?: boolean;
  }) {
    const response = await apiRequest<DataResponse<ReportExportRequest>>('/api/v1/reports/export-pdf', {
      method: 'POST',
      json: body,
      timeoutMs: 60000,
    });
    return response.data;
  },

  async pdfStatus(requestId: string) {
    const response = await apiRequest<DataResponse<ReportExportRequest>>(`/api/v1/reports/export-pdf/${requestId}`);
    return response.data;
  },

  async pdfDownload(requestId: string) {
    const response = await apiRequest<DataResponse<ReportExportDownload>>(`/api/v1/reports/export-pdf/${requestId}/download`);
    return response.data;
  },
};
