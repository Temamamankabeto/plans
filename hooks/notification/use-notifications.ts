"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

const QUERY_KEY = ["notifications"];

export function useNotificationsQuery(params?: {
  page?: number;
  per_page?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await api.get("/notifications", {
        params,
      });

      return data;
    },
  });
}

export function useUnreadNotificationsQuery() {
  return useQuery({
    queryKey: [...QUERY_KEY, "unread-count"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/unread-count");
      return data?.data ?? data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data } = await api.post(
        `/notifications/${id}/mark-read`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        "/notifications/mark-all-read"
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const { data } = await api.delete(
        `/notifications/${id}`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
