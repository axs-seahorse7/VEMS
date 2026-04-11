import api from "../Api/api";

export const getMe = async () => {
  try {
    const res = await api.get("/auth/me");
    return res.data; // { user }
  } catch (error) {
    const errData = error.response?.data;

    throw errData || { message: "Network error" };
  }
};