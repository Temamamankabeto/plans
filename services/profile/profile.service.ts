import api, { unwrap } from "@/lib/api";
import type { AuthUser } from "@/services/auth/auth.service";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: unknown;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export const profileService = {
  async getProfile() {
    const response = await api.get("/auth/me");
    return unwrap<ApiEnvelope<AuthUser>>(response).data;
  },

  async changePassword(payload: ChangePasswordPayload) {
    const response = await api.post("/profile/change-password", payload);
    return unwrap<ApiEnvelope<null>>(response);
  },
};

export default profileService;
