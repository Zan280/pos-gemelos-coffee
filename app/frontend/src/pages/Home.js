import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { logout } from "../auth";

const Home = () => {
  const navigate = useNavigate();

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return(
    <div className="container">
      <div className="home-container">
        <img src="/logo.png" alt="Cafeteria Logo" className="logo" />
        <h1>Welcome to the POS System</h1>
        <p>Delicious coffee and snacks await you!</p>
      </div>

      {/* Usando Link en botones normales */}
      <div className="button-container">
        <Link to="/inventory">
          <button className="button">Go to Inventory</button>
        </Link>
        <Link to="/sales">
          <button className="button">Go to Sales</button>
        </Link>
      </div>

      <p>This is the home page of your Point of Sale System.</p>

      {/* Botón para cerrar sesión */}
      <div className="logout-container">
        <button className="button" onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </div>
  );
};

export default Home;