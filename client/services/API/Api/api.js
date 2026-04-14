import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://vems-pgtl.online/api",
  withCredentials: true, // IMPORTANT for cookies
});

export default api;