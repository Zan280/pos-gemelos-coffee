# ==========================================
# Stage 1: Construcción de React App
# ==========================================
FROM node:18-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci || npm install

# Copiar código fuente y compilar bundle optimizado
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Servidor Nginx de Producción
# ==========================================
FROM nginx:alpine

# Copiar artefactos de build
COPY --from=build /app/build /usr/share/nginx/html

# Copiar configuración optimizada de Nginx con Reverse Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
