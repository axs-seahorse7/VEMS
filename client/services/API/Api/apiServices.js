import api from "./api";

// ✅ GET request
export const getData = async (url) => {
  const res = await api.get(url);
  return res.data;
};

// ✅ POST request
export const postData = async (url, data) => {
  const res = await api.post(url, data);
  return res.data;
};