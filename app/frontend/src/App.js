import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import './App.css';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Home from "./pages/Home";
import Login from "./pages/Login";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import PrivateRoute from "./PrivateRoute";
import { logout } from "./auth";

function LogoutButton() {
  const location = useLocation();

  // Ocultar el botón si el usuario está en /login
  if (location.pathname === "/login") return null;

  return (
    <button
      onClick={() => {
        logout();
        window.location.href = "/login";
      }}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "10px 15px",
        backgroundColor: "#d9534f",
        color: "white",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px"
      }}
    >
      Cerrar Sesión
    </button>
  );
}

function App() {
  // Cierre de sesión automático tras 30 minutos de inactividad
  useEffect(() => {
    let timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, 30 * 60 * 1000); // 30 minutos
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearTimeout(timeout);
    };
  }, []);


  return (
    <Router>
      <LogoutButton /> {/* Botón de logout, oculto en /login */}


      <Routes>
        {/* Ruta pública para login */}
        <Route path="/login" element={<Login />} />

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
      </Routes>
    </Router>
  );
}

export default App;
