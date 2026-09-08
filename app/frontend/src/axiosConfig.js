import axios from 'axios';
import { getValidAccessToken, logout } from './auth';

// En producción relativa usa '/api', o la variable de entorno si existe
const baseURL = process.env.REACT_APP_API_BASE_URL || '/api';

// Crea una instancia de axios para la configuración global
const axiosInstance = axios.create({
    baseURL: baseURL,
});

// Interceptor de peticiones: inyecta el token de acceso si es válido
axiosInstance.interceptors.request.use(
    (config) => {
        const token = getValidAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de respuestas: captura 401 y expulsa al login si la sesión caducó
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            logout();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
