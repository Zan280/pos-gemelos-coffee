import axios from "axios";

const rawBaseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";
const cleanBaseURL = rawBaseURL.endsWith("/") ? rawBaseURL.slice(0, -1) : rawBaseURL;
const LOGIN_URL = `${cleanBaseURL}/login/`;

export async function login(username, password) {
  try {
    const response = await axios.post(LOGIN_URL, { username, password });
    const accessToken = response.data.access || response.data.token;
    const refreshToken = response.data.refresh;

    if (accessToken) {
      localStorage.setItem("access_token", accessToken);
    }
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    return response.data;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated() {
  return !!localStorage.getItem("access_token");
}

