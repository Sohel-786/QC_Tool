import axios, { AxiosInstance } from "axios";

// Following e-tutor pattern - simple and clean
const api: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl: string | undefined = error.config?.url;

      // For login itself, just bubble the error (no full page reload)
      const isLoginRequest =
        requestUrl?.includes("/auth/login") || requestUrl?.endsWith("/auth/login");

      if (!isLoginRequest && typeof window !== "undefined") {
        // Redirect to login on unauthorized for protected API calls
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
