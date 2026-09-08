import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, isAdmin } from "../auth";

/**
 * Route guard exclusivo para Administradores.
 * Redirige a /login si no está autenticado, o a /home si es cajero sin privilegios.
 */
export default function AdminRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/home" state={{ unauthorized: true }} replace />;
  }

  return children;
}
