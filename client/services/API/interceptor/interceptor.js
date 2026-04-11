import api from "../Api/api";

export const setupInterceptors = () => {
  // Request
  api.interceptors.request.use(
    (config) => {
      console.log("🚀", config.method?.toUpperCase(), config.url);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      if (status === 401) {
        console.warn("🔒 Not authenticated");
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  );
};