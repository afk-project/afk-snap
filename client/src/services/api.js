import axios from "axios";

export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.dispatchEvent(new Event("afksnap:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export const assetUrl = (url) => (url?.startsWith("http") ? url : `${serverUrl}${url || ""}`);
export default api;
