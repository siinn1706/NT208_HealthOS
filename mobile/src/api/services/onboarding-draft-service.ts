import { apiRequest } from '../client';
import type {
  OnboardingDraftPayload,
  OnboardingDraftResponse,
} from '../../types/api';

export const onboardingDraftService = {
  async getDraft() {
    const response = await apiRequest<OnboardingDraftResponse>('/api/v1/users/me/onboarding-draft');
    return response.data;
  },

  async saveDraft(body: OnboardingDraftPayload) {
    const response = await apiRequest<OnboardingDraftResponse>('/api/v1/users/me/onboarding-draft', {
      method: 'PUT',
      json: body,
    });
    return response.data;
  },

  async clearDraft() {
    return apiRequest<void>('/api/v1/users/me/onboarding-draft', { method: 'DELETE' });
  },
};
