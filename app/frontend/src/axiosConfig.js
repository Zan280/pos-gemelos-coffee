import axios from 'axios';

// Obtiene la URL base desde las variables de entorno
const rawBaseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

// Crea una instancia de axios para la configuración global
const axiosInstance = axios.create({
    baseURL: baseURL,
});

// Interceptar todas las solicitudes para agregar el token JWT en las cabeceras
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;