import React from "react";
import { useNavigate } from "react-router-dom";
import "../pages/Success.css"

const Success = () => {
  const navigate = useNavigate();

  const goBackToHome = () => {
    navigate("/home"); // Cambia "/" a la ruta de tu página principal si es diferente
  };

  return (
    <div className="success-container">
      <h1>🎉 Sale Completed Successfully! 🎉</h1>
      <p>Thank you for your purchase. Your sale has been processed successfully.</p>
      <button className="home-button" onClick={goBackToHome}>
        Go Back to Home
      </button>
    </div>
  );
};

export default Success;
