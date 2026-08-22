import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const TOKEN_KEY = "token";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getToken() {
  return isBrowser() ? localStorage.getItem(TOKEN_KEY) : null;
}

export function clearSession() {
  if (!isBrowser()) return;

  ["token", "user", "roles", "permissions", "refresh_token"].forEach((key) =>
    localStorage.removeItem(key)
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT ?? 15000),
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();

  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    const message =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(", ") : null) ||
      error.message ||
      "Request failed";

    if (status === 401) {
      clearSession();
      if (isBrowser() && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(message));
  }
);

export function unwrap<T>(response: any): T {
  const body = response?.data;

  if (!body) {
    throw new Error("Invalid API response");
  }

  if (body.success === false) {
    throw new Error(body.message || "Request failed");
  }

  return body as T;
}

export default api;