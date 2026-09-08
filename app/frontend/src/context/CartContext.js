import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Error al cargar carrito desde localStorage:", e);
      return [];
    }
  });

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Error al guardar carrito en localStorage:", e);
    }
  }, [cartItems]);

  /**
   * Agrega un producto al carrito respetando el stock disponible
   */
  const addToCart = (product, quantityToAdd = 1) => {
    const qty = parseInt(quantityToAdd, 10) || 1;
    if (qty <= 0) return { success: false, message: "La cantidad debe ser mayor a 0." };

    if (product.stock <= 0) {
      return { success: false, message: `El producto "${product.name}" está agotado.` };
    }

    let message = "";
    let success = true;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        const newTotalQty = existingItem.quantity + qty;
        if (newTotalQty > product.stock) {
          success = false;
          message = `Solo hay ${product.stock} unidades disponibles de "${product.name}".`;
          return prevItems.map((item) =>
            item.id === product.id ? { ...item, quantity: product.stock } : item
          );
        }

        message = `Se agregaron ${qty} unidades de "${product.name}".`;
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: newTotalQty } : item
        );
      } else {
        const initialQty = Math.min(qty, product.stock);
        if (qty > product.stock) {
          message = `Se agregaron solo ${product.stock} unidades (máximo disponible).`;
        } else {
          message = `"${product.name}" agregado al pedido.`;
        }
        return [...prevItems, { ...product, quantity: initialQty }];
      }
    });

    return { success, message };
  };

  /**
   * Actualiza la cantidad exacta de un producto
   */
  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === productId) {
          const maxStock = item.stock || 9999;
          const finalQty = Math.min(qty, maxStock);
          return { ...item, quantity: finalQty };
        }
        return item;
      })
    );
  };

  /**
   * Incrementa en 1 unidad el producto
   */
  const incrementQuantity = (productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === productId) {
          if (item.quantity < item.stock) {
            return { ...item, quantity: item.quantity + 1 };
          }
        }
        return item;
      })
    );
  };

  /**
   * Decrementa en 1 unidad el producto (o elimina si llega a 0)
   */
  const decrementQuantity = (productId) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.id === productId) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  /**
   * Elimina un producto del carrito
   */
  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  /**
   * Limpia todo el carrito
   */
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cart");
  };

  // Totales computados
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser utilizado dentro de un CartProvider");
  }
  return context;
};

export default CartContext;
