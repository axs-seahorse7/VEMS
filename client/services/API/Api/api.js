import axios from "axios";

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://vems-pgtl.online/api",
  withCredentials: true,
  headers: {
    "x-app-version": CURRENT_VERSION,
    "x-app-platform": "web",
  },
});

export default api;