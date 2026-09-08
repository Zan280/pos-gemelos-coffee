import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import { CartProvider } from "./context/CartContext";
import Layout from "./components/Layout";
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Home from "./pages/Home";
import Login from "./pages/Login";
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
    <CartProvider>
      <Router>
        <Routes>
          {/* Ruta pública para login */}
          <Route path="/login" element={<Login />} />

          {/* Redirección raíz a Home (protegido) */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Rutas privadas protegidas envueltas en Layout */}
          <Route 
            path="/home" 
            element={
              <PrivateRoute>
                <Layout>
                  <Home />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/inventory" 
            element={
              <PrivateRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/sales" 
            element={
              <PrivateRoute>
                <Layout>
                  <Sales />
                </Layout>
              </PrivateRoute>
            } 
          />

          {/* Redirecciones de compatibilidad */}
          <Route path="/checkout" element={<Navigate to="/sales" replace />} />
          <Route path="/success" element={<Navigate to="/sales" replace />} />

          {/* Ruta comodín para capturar 404 y redirigir a Home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
