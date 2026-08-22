"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { profileService, type ChangePasswordPayload } from "@/services/profile/profile.service";

export function useChangePasswordMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => profileService.changePassword(payload),
    onSuccess,
  });
}
export function useProfileQuery() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileService.getProfile(),
  });
}
