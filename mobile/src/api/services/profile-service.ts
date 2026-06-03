import { apiRequest } from '../client';
import { BOOTSTRAP_PROFILE_TIMEOUT_MS } from '../core-reachability';
import type {
  AccountDeletionRequestBody,
  AccountDeletionResult,
  AccountRestoreResult,
  CurrentUser,
  DataResponse,
  UserProfileUpdate,
} from '../../types/api';

interface ProfileRequestOptions {
  timeoutMs?: number;
}

export const profileService = {
  async me(options: ProfileRequestOptions = {}) {
    const response = await apiRequest<DataResponse<CurrentUser>>('/api/v1/users/me', options);
    return response.data;
  },

  async meForBootstrap() {
    return profileService.me({ timeoutMs: BOOTSTRAP_PROFILE_TIMEOUT_MS });
  },

  async updateMe(body: UserProfileUpdate) {
    const response = await apiRequest<DataResponse<CurrentUser>>('/api/v1/users/me', {
      method: 'PATCH',
      json: body,
    });
    return response.data;
  },

  async requestAccountDeletion(body: AccountDeletionRequestBody) {
    const response = await apiRequest<DataResponse<AccountDeletionResult>>('/api/v1/users/me', {
      method: 'DELETE',
      json: body,
    });
    return response.data;
  },

  async restoreAccount() {
    const response = await apiRequest<DataResponse<AccountRestoreResult>>('/api/v1/users/me/restore', {
      method: 'POST',
    });
    return response.data;
  },
};
