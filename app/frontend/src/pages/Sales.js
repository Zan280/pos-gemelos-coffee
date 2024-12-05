import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Importar useNavigate
import axiosInstance from "../axiosConfig";
import "./Sales.css";

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const navigate = useNavigate(); // Inicializar useNavigate

  useEffect(() => {
    // Obtener productos del backend
    axiosInstance
      .get("products/")
      .then((response) => {
        console.log("Productos recibidos:", response.data);
        setProducts(response.data);
      })
      .catch((error) => {
        console.error("Hubo un error al obtener los productos:", error);
      });
  }, []);

  // Filtrar productos por barra de búsqueda
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar cambio en el campo de cantidad
  const handleQuantityChange = (productId, value) => {
    setQuantities({ ...quantities, [productId]: parseInt(value, 10) || 0 });
  };

  // Agregar producto al carrito
  const addToCart = (product) => {
    const quantity = quantities[product.id] || 1;
    if (quantity <= 0 || quantity > product.stock) {
      alert("Please, insert valid quantity.");
      return;
    }

    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity }]);
    }

    // Limpiar el campo de cantidad
    setQuantities({});
  };

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

  // Calcular total
  const calculateTotal = () =>
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Redirigir a Checkout
  const goToCheckout = () => {
    navigate("/checkout", {
      state: { cartItems, total: calculateTotal() }, // Pasar datos del carrito a Checkout
    });
  };

  return (
    <div className="sales-container">
      <h1>Sales</h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search Products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="product-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Price</th>
            <th>Available Quantity</th>
            <th>Quantity to Add</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <tr key={product.id}>
              <td>
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="product-image"
                />
              </td>
              <td>{product.name}</td>
              <td>C${product.price}</td>
              <td>{product.stock}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantities[product.id] || ""}
                  onChange={(e) =>
                    handleQuantityChange(product.id, e.target.value)
                  }
                  className="quantity-input"
                />
              </td>
              <td>
                <button
                  onClick={() => addToCart(product)}
                  className="add-to-cart-button"
                >
                  Add to Cart
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Carrito de compras */}
      <div className="cart">
        <h2>Shopping Cart</h2>
        {cartItems.length === 0 ? (
          <p>The Shopping Cart is empty</p>
        ) : (
          <>
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
            <h3>Total: C${calculateTotal()}</h3>
            <button className="checkout-button" onClick={goToCheckout}>
              Continue Sale
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sales;
