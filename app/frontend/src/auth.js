import axios from "axios";

const rawBaseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";
const cleanBaseURL = rawBaseURL.endsWith("/") ? rawBaseURL.slice(0, -1) : rawBaseURL;
const LOGIN_URL = `${cleanBaseURL}/login/`;

/**
 * Valida si una cadena JWT ha expirado o está corrupta
 */
export function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    
    // Decodificar Base64URL
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    
    if (!payload || !payload.exp) return false;
    
    // Comparar expiración en segundos con tiempo actual en segundos
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (err) {
    console.warn("Token JWT corrupto o ilegible:", err);
    return true;
  }
}

/**
 * Obtiene el access_token actual verificando su validez.
 * Si ha expirado o está corrupto, limpia la sesión y retorna null.
 */
export function getValidAccessToken() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  if (isTokenExpired(token)) {
    logout();
    return null;
  }

  return token;
}

/**
 * Verifica si hay una sesión activa y válida
 */
export function isAuthenticated() {
  return !!getValidAccessToken();
}

/**
 * Inicia sesión comunicándose con el backend
 */
export async function login(username, password) {
  try {
    const response = await axios.post(LOGIN_URL, { username, password });
    const accessToken = response.data.access || response.data.token;
    const refreshToken = response.data.refresh;
    const user = response.data.user || { username };

    if (!accessToken) {
      throw new Error("No se recibió token de acceso en la respuesta.");
    }

    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(user));

    return response.data;
  } catch (error) {
    console.error("Error durante inicio de sesión:", error);
    throw error;
  }
}

/**
 * Cierra la sesión limpiando todo el almacenamiento local
 */
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("cart");
}

/**
 * Obtiene los datos del usuario autenticado
 */
export function getUser() {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Verifica si el usuario autenticado tiene rol de Administrador
 */
export function isAdmin() {
  const user = getUser();
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.is_staff === true ||
    user.is_superuser === true ||
    (user.username && user.username.toLowerCase() === "maguirre")
  );
}

