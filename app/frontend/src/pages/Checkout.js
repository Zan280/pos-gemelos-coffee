import React from "react";
import axiosInstance from "../axiosConfig";
import { useLocation, useNavigate } from "react-router-dom";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, total } = location.state || {};

  // Obtener URL completa de imagen
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "/logo.png";
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    const mediaBase = process.env.REACT_APP_MEDIA_BASE_URL || "http://localhost:8000";
    const cleanMediaBase = mediaBase.endsWith("/") ? mediaBase.slice(0, -1) : mediaBase;
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${cleanMediaBase}${cleanPath}`;
  };

  // Verifica que cartItems y total existan
  if (!cartItems || !total) {
    return (
      <div className="checkout-container">
        <p>No hay artículos seleccionados para procesar la venta.</p>
        <button onClick={() => navigate("/sales")}>Volver a Ventas</button>
      </div>
    );
  }

  const finalizeSale = () => {
    if (cartItems.length === 0) {
      alert("El carrito está vacío. Agrega productos antes de finalizar la venta.");
      return;
    }

    const saleData = {
      items: cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      total: total,
    };

    // Usamos AxiosInstance para enviar los datos al backend con autenticación
    axiosInstance
      .post('sales/', saleData)
      .then((response) => {
        console.log("Server response:", response.data);
        alert(`Venta #${response.data.sale_id} completada con éxito!`);
        
        // Limpiar el carrito si hubiera
        localStorage.removeItem("cart");

        // Redirigir a la página de éxito usando router
        navigate("/success");
      })
      .catch((error) => {
        console.error("Error completing the sale:", error);
        if (error.response && error.response.data) {
          alert(`Error: ${error.response.data.error || error.response.data.detail || "Error al procesar la venta"}`);
        } else {
          alert("Hubo un error al completar la venta. Por favor intenta de nuevo.");
        }
      });
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      <div className="cart-summary">
        <h2>Items in Cart</h2>
        <ul>
          {cartItems.map((item) => (
            <li key={item.id}>
              <div className="cart-item">
                <img
                  src={getImageUrl(item.image)}
                  alt={item.name}
                  className="cart-image"
                />
                <div>
                  <h3>{item.name}</h3>
                  <p>Quantity: {item.quantity}</p>
                  <p>Total Price: C${item.price * item.quantity}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <h3>Total: C${total}</h3>
      </div>
      <button className="finalize-sale-button" onClick={finalizeSale}>
        Finalize Sale
      </button>
    </div>
  );
};

export default Checkout;
