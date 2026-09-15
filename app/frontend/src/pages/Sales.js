import React, { useState, useEffect, useMemo } from "react";
import axiosInstance from "../axiosConfig";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Coffee, 
  RefreshCw, 
  Sparkles,
  X,
  CreditCard,
  Banknote
} from "lucide-react";
import { getUser } from "../auth";

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // all, available, low_stock
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successModalData, setSuccessModalData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mobileTab, setMobileTab] = useState("catalog"); // 'catalog' | 'cart'

  const { showToast } = useToast();

  const {
    cartItems,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart();


  const user = getUser() || { username: "Cajero" };

  // Cargar catálogo de productos
  const fetchProducts = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await axiosInstance.get("products/");
      setProducts(response.data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setErrorMessage("No se pudo cargar el catálogo de productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Helper para resolver URL de imágenes
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    const mediaBase = process.env.REACT_APP_MEDIA_BASE_URL || "http://localhost:8000";
    const cleanMediaBase = mediaBase.endsWith("/") ? mediaBase.slice(0, -1) : mediaBase;
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${cleanMediaBase}${cleanPath}`;
  };

  // Filtrado de productos en tiempo real
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const isService = product.item_type === "SERVICE";
      if (selectedFilter === "available") return isService || product.stock > 0;
      if (selectedFilter === "low_stock") return !isService && product.stock > 0 && product.stock <= 5;
      return true;
    });
  }, [products, searchTerm, selectedFilter]);

  // Manejar cobro y confirmación de venta
  const handleProcessSale = async () => {
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    setErrorMessage("");

    const salePayload = {
      items: cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      total: totalPrice,
      payment_method: paymentMethod,
    };

    try {
      const response = await axiosInstance.post("sales/", salePayload);
      const saleData = response.data;

      // Abrir modal de ticket de venta
      setSuccessModalData({
        saleId: saleData.sale_id || saleData.sale?.id || "N/A",
        date: new Date().toLocaleString("es-ES"),
        cashier: user.username,
        items: [...cartItems],
        total: totalPrice,
        paymentMethod: paymentMethod === "cash" ? "Efectivo" : paymentMethod === "card" ? "Tarjeta" : "Transferencia",
      });

      // Limpiar carrito y refrescar inventario de productos
      clearCart();
      setShowConfirmModal(false);
      showToast(`¡Venta #${saleData.sale_id || saleData.sale?.id || ""} registrada con éxito!`, "success");
      fetchProducts();
    } catch (err) {
      console.error("Error al procesar la venta:", err);
      const backendError = err.response?.data?.error || err.response?.data?.detail;
      const finalMsg = backendError || "Ocurrió un error al procesar la venta.";
      setErrorMessage(finalMsg);
      showToast(finalMsg, "error");
      setShowConfirmModal(false);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 h-full w-full font-sans animate-fade-in relative">
      
      {/* ==================================================== */}
      {/* SWITCHER TÁCTIL MÓVIL (< xl)                         */}
      {/* ==================================================== */}
      <div className="flex xl:hidden gap-2 bg-stone-200/80 p-1 rounded-2xl shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            mobileTab === "catalog"
              ? "bg-white text-amber-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Catálogo ({products.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            mobileTab === "cart"
              ? "bg-white text-amber-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orden ({totalItems})</span>
          {totalItems > 0 && (
            <span className="bg-amber-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none shadow-xs">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* PANEL IZQUIERDO: CATÁLOGO DE PRODUCTOS              */}
      {/* ==================================================== */}
      <div className={`flex-1 flex-col min-w-0 bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200/80 overflow-hidden ${
        mobileTab === "catalog" ? "flex" : "hidden xl:flex"
      }`}>
        
        {/* Barra superior de herramientas y filtros */}
        <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200/60 overflow-x-auto">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFilter === "all"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setSelectedFilter("available")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFilter === "available"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              En Stock
            </button>
            <button
              onClick={() => setSelectedFilter("low_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFilter === "low_stock"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Stock Bajo
            </button>
          </div>
        </div>

        {/* Mensaje de Error en Catálogo */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid de Productos */}
        <div className={`flex-1 overflow-y-auto pr-1 ${totalItems > 0 ? "pb-24 xl:pb-0" : ""}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mb-3" />
              <p className="text-sm font-medium">Cargando catálogo de cafetería...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Coffee className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-base font-semibold text-slate-600">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando el término de búsqueda o filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const isService = product.item_type === "SERVICE";
                const isOutOfStock = !isService && product.stock <= 0;
                const isLowStock = !isService && product.stock > 0 && product.stock <= 5;
                const inCart = cartItems.find((item) => item.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product, 1)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3 sm:p-3.5 transition-all duration-200 select-none ${
                      isOutOfStock
                        ? "bg-stone-50 border-stone-200/60 opacity-60 cursor-not-allowed"
                        : "bg-white hover:bg-amber-50/40 border-stone-200/80 hover:border-amber-400 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
                    }`}
                  >
                    {/* Badge de cantidad ya en carrito */}
                    {inCart && (
                      <span className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shadow-md">
                        {inCart.quantity}
                      </span>
                    )}

                    {/* Imagen del producto */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-100 mb-2.5 sm:mb-3 flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Coffee className="w-10 h-10 text-amber-800/30" />
                      )}

                      {/* Badge de Stock / Tipo */}
                      <div className="absolute bottom-2 left-2">
                        {isService ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-800/90 text-amber-100 text-[10px] font-bold shadow-sm backdrop-blur-xs">
                            Preparado
                          </span>
                        ) : isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold shadow-sm">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-amber-950 text-[10px] font-bold shadow-sm">
                            Últimas {product.stock}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold shadow-sm">
                            Stock: {product.stock}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Datos del producto */}
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-1 group-hover:text-amber-900 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-[#5F3B1A]">
                          C$ {parseFloat(product.price).toFixed(2)}
                        </span>
                        {!isOutOfStock && (
                          <button
                            type="button"
                            className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-colors shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* BARRA FLOTANTE INFERIOR MÓVIL (< xl)                */}
      {/* ==================================================== */}
      {mobileTab === "catalog" && totalItems > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 xl:hidden animate-fade-in">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1A0F07] via-[#2D180B] to-[#452712] p-3 pl-4 rounded-2xl shadow-2xl border border-amber-900/40 text-white backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-amber-950 shadow">
                  {totalItems}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                  Total Orden
                </p>
                <p className="text-base font-black text-white truncate">
                  C$ {totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileTab("cart")}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-600 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Ver Orden</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PANEL DERECHO: CARRITO / TERMINAL DE VENTA           */}
      {/* ==================================================== */}
      <div className={`w-full xl:w-[400px] 2xl:w-[440px] shrink-0 flex-col bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200/80 ${
        mobileTab === "cart" ? "flex" : "hidden xl:flex"
      }`}>

        {/* Botón rápido para volver al catálogo en móvil */}
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className="xl:hidden w-full py-2.5 px-4 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-4 h-4" />
          <span>Volver al Catálogo / Agregar más</span>
        </button>

        {/* Cabecera del Carrito */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Orden Actual</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
              </p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Lista de Ítems en el Carrito */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[200px]">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs font-semibold text-slate-600">El carrito está vacío</p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                Haz clic en cualquier producto del catálogo para agregarlo al pedido
              </p>
              <button
                type="button"
                onClick={() => setMobileTab("catalog")}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-700 transition-colors"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemSubtotal = (parseFloat(item.price) || 0) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-amber-300 transition-colors"
                >
                  {/* Imagen y descripción */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center">
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Coffee className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-amber-900">
                        C$ {parseFloat(item.price).toFixed(2)} <span className="text-slate-400 font-normal">· Subtotal: C$ {itemSubtotal.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-xs">
                      <button
                        onClick={() => decrementQuantity(item.id)}
                        className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-slate-100 rounded-l-xl transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => incrementQuantity(item.id)}
                        disabled={item.quantity >= item.stock}
                        className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-slate-100 rounded-r-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen Total y Cobro */}
        <div className="pt-4 border-t border-slate-200/80 mt-auto space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">C$ {totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuestos / IVA</span>
              <span className="text-emerald-600 font-semibold">Incluido</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#2A1708] to-[#5F3B1A] text-white flex items-center justify-between shadow-lg shadow-amber-950/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Total a Pagar
              </span>
              <p className="text-2xl font-black text-amber-100 leading-tight">
                C$ {totalPrice.toFixed(2)}
              </p>
            </div>
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={cartItems.length === 0 || isProcessing}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 font-bold text-sm text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Cobrar / Procesar Venta</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL DE CONFIRMACIÓN DE PAGO                        */}
      {/* ==================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 p-1.5 border border-amber-200/80 flex items-center justify-center shadow-sm">
                  <img
                    src={`${process.env.PUBLIC_URL || ""}/logo.png`}
                    alt="Gemelos Coffee"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                    Confirmar Cobro
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Gemelos Coffee POS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <div className="text-center py-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Monto Total del Pedido
                </span>
                <p className="text-3xl font-black text-[#5F3B1A]">
                  C$ {totalPrice.toFixed(2)}
                </p>
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      paymentMethod === "cash"
                        ? "bg-amber-50 border-amber-600 text-amber-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-amber-700" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      paymentMethod === "card"
                        ? "bg-amber-50 border-amber-600 text-amber-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-700" />
                    <span>Tarjeta / POS</span>
                  </button>
                </div>
              </div>

              {/* Resumen rápido de productos */}
              <div className="bg-slate-50 rounded-2xl p-3 max-h-32 overflow-y-auto text-xs space-y-1.5">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-slate-700">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-semibold">C$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 flex-shrink-0 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessSale}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <span>Confirmar y Cobrar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL DE TICKET / RECIBO DE VENTA EXITOSA           */}
      {/* ==================================================== */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto relative">
            {/* Botón de Cierre X */}
            <button
              type="button"
              onClick={() => setSuccessModalData(null)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
              title="Cerrar ticket"
              aria-label="Cerrar ticket"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header del Ticket */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300 flex-shrink-0">
              <div className="flex justify-center mb-2">
                <div className="h-14 w-14 rounded-2xl bg-amber-50/90 p-1.5 border border-amber-200/80 flex items-center justify-center shadow-sm">
                  <img
                    src={`${process.env.PUBLIC_URL || ""}/logo.png`}
                    alt="Gemelos Coffee Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>¡Venta Exitosa!</span>
              </div>
              <h3 className="text-lg font-extrabold text-[#2A1708] tracking-tight">Gemelos Coffee</h3>
              <p className="text-[11px] text-slate-500 font-medium">Ticket de Venta #{successModalData.saleId}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{successModalData.date}</p>
              <p className="text-[10px] text-slate-400">Atendido por: {successModalData.cashier}</p>
            </div>

            {/* Lista de productos en Ticket */}
            <div className="py-4 space-y-2 border-b border-dashed border-slate-300 flex-1 overflow-y-auto text-xs pr-1">
              {successModalData.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-slate-800">
                  <div className="truncate pr-2">
                    <span className="font-bold">{item.quantity}x </span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold shrink-0">
                    C$ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total e Info de Pago */}
            <div className="py-3 space-y-1.5 text-xs flex-shrink-0">
              <div className="flex justify-between text-slate-500">
                <span>Forma de Pago:</span>
                <span className="font-medium text-slate-800">{successModalData.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#2A1708] pt-1">
                <span>TOTAL:</span>
                <span>C$ {successModalData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2.5 pt-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="flex-1 py-2.5 rounded-2xl bg-amber-800 hover:bg-amber-900 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
