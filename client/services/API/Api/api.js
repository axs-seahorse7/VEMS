import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://vems-server-7pvo4bwxr-axs-seahorse7s-projects.vercel.app/api",
  withCredentials: true, // IMPORTANT for cookies
});

export default api;