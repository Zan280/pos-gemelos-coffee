import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Home from "./pages/Home";
import Login from "./pages/Login";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import PrivateRoute from "./PrivateRoute";
import { logout } from "./auth";

function App() {
  // Cierre de sesión automático tras 30 minutos de inactividad
  useEffect(() => {
    let timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 30 * 60 * 1000); // 30 minutos
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Ruta pública para login */}
        <Route path="/login" element={<Login />} />

        {/* Redirección raíz a Home (protegido) */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Rutas privadas protegidas */}
        <Route 
          path="/home" 
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <PrivateRoute>
              <Inventory />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/sales" 
          element={
            <PrivateRoute>
              <Sales />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/checkout" 
          element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/success" 
          element={
            <PrivateRoute>
              <Success />
            </PrivateRoute>
          } 
        />

        {/* Ruta comodín para capturar 404 y redirigir a Home */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
