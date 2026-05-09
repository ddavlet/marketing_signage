import axios from "axios";
import { useAuthStore } from "./auth-store";

const api = axios.create({ baseURL: "/" });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    try {
      if (!refreshing) {
        refreshing = axios
          .post("/api/auth/refresh/", { refresh: refreshToken })
          .then((r) => r.data.access as string)
          .finally(() => {
            refreshing = null;
          });
      }
      const newAccess = await refreshing;
      setAccessToken(newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      logout();
      return Promise.reject(error);
    }
  }
);

export default api;
