import React, { useState, useEffect, useMemo, useRef } from "react";
import axiosInstance from "../axiosConfig";
import { useToast } from "../context/ToastContext";
import ProductCombobox from "../components/ProductCombobox";
import Pagination from "../components/Pagination";
import { 
  Package, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Coffee, 
  UploadCloud, 
  X, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Layers,
  Sparkles,
  Info,
  ArrowUpRight,
  Calculator,
  Tag
} from "lucide-react";

const CATEGORIES = [
  "Café en Grano",
  "Bebidas Calientes",
  "Bebidas Frías",
  "Repostería & Snacks",
  "Accesorios & Métodos",
  "General"
];

const emptyProductForm = {
  name: "",
  category: "General",
  item_type: "PRODUCT",
  cost_price: "0.00",
  price: "",
  stock: "0",
  image: null,
};

const emptyRestockForm = {
  product_id: "",
  quantity: "",
  unit_cost: "",
  new_sale_price: "",
  notes: "",
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, product, service, low_stock, out_of_stock
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  
  // Modal de Crear / Editar Ítem
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal de Entrada de Stock (CPP)
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockForm, setRestockForm] = useState(emptyRestockForm);
  const [savingRestock, setSavingRestock] = useState(false);

  // Modal de Eliminación
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: "", text: "" });

  const { showToast } = useToast();
  const fileInputRef = useRef(null);

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

  // Cargar lista de productos
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("products/");
      setProducts(response.data);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      setFeedbackMsg({ type: "error", text: "No se pudo cargar el inventario." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (selectedCategoryFilter !== "all" && p.category !== selectedCategoryFilter) {
        return false;
      }

      const isService = p.item_type === "SERVICE";

      if (activeFilter === "product") return !isService;
      if (activeFilter === "service") return isService;
      if (activeFilter === "low_stock") return !isService && p.stock > 0 && p.stock <= 5;
      if (activeFilter === "out_of_stock") return !isService && p.stock <= 0;
      return true;
    });
  }, [products, searchTerm, activeFilter, selectedCategoryFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Resetear página al filtrar o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, selectedCategoryFilter]);

  // Ítems de la página actual
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Lista de productos físicos disponibles para entradas de inventario
  const physicalProducts = useMemo(() => {
    return products.filter((p) => (p.item_type || "PRODUCT") === "PRODUCT");
  }, [products]);

  // Métricas de inventario (Calculando valorización únicamente sobre productos físicos x costo CPP)
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const physicalList = products.filter((p) => (p.item_type || "PRODUCT") === "PRODUCT");
    const servicesCount = products.filter((p) => p.item_type === "SERVICE").length;

    // Valorización del inventario basada en el Costo Promedio Ponderado de productos físicos
    const totalCostValuation = physicalList.reduce(
      (sum, p) => sum + (parseFloat(p.cost_price) || 0) * (parseInt(p.stock, 10) || 0),
      0
    );

    const lowStockCount = physicalList.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStockCount = physicalList.filter((p) => p.stock <= 0).length;

    return { 
      totalCount, 
      physicalCount: physicalList.length, 
      servicesCount, 
      totalCostValuation, 
      lowStockCount, 
      outOfStockCount 
    };
  }, [products]);

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyProductForm);
    setImagePreview(null);
    setShowModal(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category || "General",
      item_type: product.item_type || "PRODUCT",
      cost_price: product.cost_price !== undefined && product.cost_price !== null ? product.cost_price : "0.00",
      price: product.price,
      stock: product.stock !== undefined && product.stock !== null ? product.stock : "0",
      image: null,
    });
    setImagePreview(getImageUrl(product.image));
    setShowModal(true);
  };

  // Abrir modal de Entrada de Stock (Restock)
  const handleOpenRestockModal = (product = null) => {
    if (product) {
      setRestockForm({
        product_id: String(product.id),
        quantity: "",
        unit_cost: product.cost_price || "0.00",
        new_sale_price: product.price || "",
        notes: "",
      });
    } else {
      const firstProd = physicalProducts[0];
      setRestockForm({
        product_id: firstProd ? String(firstProd.id) : "",
        quantity: "",
        unit_cost: firstProd ? firstProd.cost_price || "0.00" : "",
        new_sale_price: firstProd ? firstProd.price || "" : "",
        notes: "",
      });
    }
    setShowRestockModal(true);
  };

  // Manejar cambio de producto seleccionado en el modal de entrada de stock
  const handleRestockProductChange = (productId) => {
    const selected = physicalProducts.find((p) => String(p.id) === String(productId));
    if (selected) {
      setRestockForm((prev) => ({
        ...prev,
        product_id: String(productId),
        unit_cost: selected.cost_price || "0.00",
        new_sale_price: selected.price || "",
      }));
    } else {
      setRestockForm((prev) => ({ ...prev, product_id: String(productId) }));
    }
  };

  // Manejar cambio de archivo de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Guardar producto (Crear o Editar con FormData)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg({ type: "", text: "" });

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("category", form.category || "General");
    formData.append("item_type", form.item_type);
    formData.append("cost_price", parseFloat(form.cost_price) || 0);
    formData.append("price", parseFloat(form.price) || 0);
    formData.append("stock", form.item_type === "SERVICE" ? 0 : (parseInt(form.stock, 10) || 0));
    
    if (form.image instanceof File) {
      formData.append("image", form.image);
    }

    try {
      if (editingProduct) {
        await axiosInstance.patch(`products/${editingProduct.id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast(`Ítem "${form.name}" actualizado correctamente.`, "success");
      } else {
        await axiosInstance.post("products/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast(`Ítem "${form.name}" creado con éxito.`, "success");
      }

      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      const errDetail = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.name?.[0] || "Error al guardar el producto.";
      setFeedbackMsg({ type: "error", text: errDetail });
      showToast(errDetail, "error");
    } finally {
      setSaving(false);
    }
  };

  // Guardar Entrada de Stock con recálculo de CPP
  const handleSubmitRestock = async (e) => {
    e.preventDefault();
    if (!restockForm.product_id) {
      showToast("Selecciona un producto para ingresar stock.", "warning");
      return;
    }
    const qty = parseInt(restockForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast("Ingresa una cantidad válida mayor a 0.", "warning");
      return;
    }
    const unitCost = parseFloat(restockForm.unit_cost);
    if (isNaN(unitCost) || unitCost < 0) {
      showToast("Ingresa un costo de compra válido.", "warning");
      return;
    }

    setSavingRestock(true);
    try {
      await axiosInstance.post("kardex/", {
        product: parseInt(restockForm.product_id, 10),
        movement_type: "RESTOCK",
        quantity: qty,
        unit_cost: unitCost,
        new_sale_price: restockForm.new_sale_price ? parseFloat(restockForm.new_sale_price) : undefined,
        notes: restockForm.notes || `Entrada de inventario (${qty} uds @ C$ ${unitCost.toFixed(2)})`,
      });

      showToast("Entrada de stock registrada exitosamente. CPP y existencias actualizados.", "success");
      setShowRestockModal(false);
      setRestockForm(emptyRestockForm);
      fetchProducts();
    } catch (error) {
      console.error("Error al registrar entrada de stock:", error);
      const errDetail = error.response?.data?.error || "Error al registrar la entrada de inventario.";
      showToast(errDetail, "error");
    } finally {
      setSavingRestock(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteProduct = async () => {
    if (!deleteModalProduct) return;

    try {
      await axiosInstance.delete(`products/${deleteModalProduct.id}/`);
      showToast(`Ítem "${deleteModalProduct.name}" eliminado correctamente.`, "success");
      setDeleteModalProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      showToast("No se pudo eliminar el producto.", "error");
    }
  };

  // Cálculos reactivos de margen para el formulario modal de ítem
  const formCalculations = useMemo(() => {
    const cost = parseFloat(form.cost_price) || 0;
    const price = parseFloat(form.price) || 0;
    const profit = price - cost;
    const profitPercent = price > 0 ? (profit / price) * 100 : 0;

    return { cost, price, profit, profitPercent };
  }, [form.cost_price, form.price]);

  // Cálculos reactivos de simulación de CPP para el modal de Entrada de Stock
  const restockSimulation = useMemo(() => {
    const product = physicalProducts.find((p) => String(p.id) === String(restockForm.product_id));
    if (!product) return null;

    const prevStock = parseInt(product.stock, 10) || 0;
    const prevCost = parseFloat(product.cost_price) || 0;
    const prevBalance = prevStock * prevCost;

    const inQty = parseInt(restockForm.quantity, 10) || 0;
    const inCost = parseFloat(restockForm.unit_cost) || 0;
    const inTotal = inQty * inCost;

    const newStock = prevStock + inQty;
    const newBalance = prevBalance + inTotal;
    const newCPP = newStock > 0 ? newBalance / newStock : inCost;

    const targetPrice = restockForm.new_sale_price ? parseFloat(restockForm.new_sale_price) : parseFloat(product.price) || 0;
    const projectedProfit = targetPrice - newCPP;
    const projectedMarginPercent = targetPrice > 0 ? (projectedProfit / targetPrice) * 100 : 0;

    return {
      product,
      prevStock,
      prevCost,
      prevBalance,
      inQty,
      inCost,
      inTotal,
      newStock,
      newBalance,
      newCPP,
      targetPrice,
      projectedProfit,
      projectedMarginPercent,
    };
  }, [physicalProducts, restockForm.product_id, restockForm.quantity, restockForm.unit_cost, restockForm.new_sale_price]);

  return (
    <div className="space-y-6 w-full font-sans animate-fade-in pb-12">
      
      {/* ==================================================== */}
      {/* CABECERA Y ACCIONES                                 */}
      {/* ==================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1708]">
              Inventario & Catálogo de Cafetería
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Gestión de productos de reventa, servicios preparados en barra, entradas de stock y Costo Promedio Ponderado (CPP)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenRestockModal()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-900/20 transition-all active:scale-[0.99]"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Entrada de Stock</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-amber-900/20 hover:from-amber-800 hover:to-amber-950 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ítem</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Total Ítems */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total en Catálogo
                </p>
                <p className="text-xl font-black text-slate-800">
                  {metrics.totalCount} <span className="text-xs font-normal text-slate-400">({metrics.physicalCount} prod · {metrics.servicesCount} serv)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Valorización del Inventario al CPP */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Valoración al Costo (CPP)
                </p>
                <p className="text-xl font-black text-emerald-700">
                  C$ {metrics.totalCostValuation.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Stock Bajo */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Stock Bajo (≤ 5)
                </p>
                <p className="text-xl font-black text-amber-700">{metrics.lowStockCount}</p>
              </div>
            </div>
          </div>

          {/* Agotados */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Productos Agotados
                </p>
                <p className="text-xl font-black text-red-600">{metrics.outOfStockCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg.text && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs sm:text-sm animate-fade-in ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg({ type: "", text: "" })}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* TABLA DE INVENTARIO Y FILTROS                       */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200/80 space-y-4 w-full">
        {/* Barra de Filtros */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Categoría */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-amber-600"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Píldoras de Filtro de Tipo y Estado */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/60 overflow-x-auto">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === "all"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setActiveFilter("product")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === "product"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Productos ({metrics.physicalCount})
              </button>
              <button
                onClick={() => setActiveFilter("service")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === "service"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Servicios ({metrics.servicesCount})
              </button>
              <button
                onClick={() => setActiveFilter("low_stock")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === "low_stock"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stock Bajo
              </button>
              <button
                onClick={() => setActiveFilter("out_of_stock")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === "out_of_stock"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Agotados
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor de Tabla con Scroll Desacoplado y Cabecera Fija */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200/80 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="sticky top-0 z-10 bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#5F3B1A] border-b border-slate-200 shadow-2xs">
              <tr>
                <th className="py-3.5 px-4">Ítem / Catálogo</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Costo Base / CPP</th>
                <th className="py-3.5 px-4">Precio Venta</th>
                <th className="py-3.5 px-4">Margen Unitario</th>
                <th className="py-3.5 px-4">Stock / Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-700 mb-2" />
                    <span>Cargando catálogo e inventario...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-slate-600">No hay productos o servicios que coincidan</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isService = p.item_type === "SERVICE";
                  const cost = parseFloat(p.cost_price || 0);
                  const price = parseFloat(p.price || 0);
                  const profit = price - cost;
                  const profitPercent = price > 0 ? (profit / price) * 100 : 0;
                  const isOutOfStock = !isService && p.stock <= 0;
                  const isLowStock = !isService && p.stock > 0 && p.stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Imagen y Nombre */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-slate-200 flex items-center justify-center shadow-xs">
                            {p.image ? (
                              <img
                                src={getImageUrl(p.image)}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : isService ? (
                              <Coffee className="w-5 h-5 text-amber-700" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              ID: #{p.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          <Tag className="w-3 h-3 text-stone-500" />
                          <span>{p.category || "General"}</span>
                        </span>
                      </td>

                      {/* Badge Tipo de Ítem */}
                      <td className="py-3.5 px-4">
                        {isService ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300/60">
                            <Coffee className="w-3 h-3 text-amber-700" />
                            <span>Servicio (Barra)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200/70">
                            <Layers className="w-3 h-3 text-blue-600" />
                            <span>Producto (Reventa)</span>
                          </span>
                        )}
                      </td>

                      {/* Costo Base / CPP */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        C$ {cost.toFixed(2)}
                      </td>

                      {/* Precio de Venta */}
                      <td className="py-3.5 px-4 font-bold text-[#5F3B1A]">
                        C$ {price.toFixed(2)}
                      </td>

                      {/* Margen de Utilidad */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className={`font-bold text-xs ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            +C$ {profit.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {profitPercent.toFixed(1)}% margen
                          </span>
                        </div>
                      </td>

                      {/* Existencias / Estado */}
                      <td className="py-3.5 px-4">
                        {isService ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Preparado en barra</span>
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            Agotado (0 uds)
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                            Stock Bajo ({p.stock} uds)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            {p.stock} unidades
                          </span>
                        )}
                      </td>

                      {/* Botones de Acción */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isService && (
                            <button
                              onClick={() => handleOpenRestockModal(p)}
                              title="Ingresar Stock (CPP)"
                              className="p-2 rounded-xl text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar Ítem"
                            className="p-2 rounded-xl text-slate-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModalProduct(p)}
                            title="Eliminar Ítem"
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginación */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="productos / servicios"
        />
      </div>

      {/* ==================================================== */}
      {/* MODAL CREAR / EDITAR PRODUCTO O SERVICIO (ESPACIOSO) */}
      {/* ==================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto">
            {/* Header Fijo */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#2A1708] flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-700" />
                  <span>{editingProduct ? "Editar Ítem del Catálogo" : "Nuevo Ítem del Catálogo"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configuración completa de catálogo, categoría, costos y modo de inventario
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y pie fijo */}
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                
                {/* 1. Selector de Tipo de Ítem */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Tipo de Ítem *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, item_type: "PRODUCT" })}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        form.item_type === "PRODUCT"
                          ? "bg-amber-50/80 border-amber-600 text-amber-950 shadow-sm ring-1 ring-amber-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${form.item_type === "PRODUCT" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold leading-tight">Producto (Reventa)</span>
                        <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                          Control de stock físico, entradas de compra y cálculo de Costo Promedio (CPP).
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, item_type: "SERVICE", stock: "0" })}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                        form.item_type === "SERVICE"
                          ? "bg-amber-50/80 border-amber-600 text-amber-950 shadow-sm ring-1 ring-amber-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${form.item_type === "SERVICE" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        <Coffee className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold leading-tight">Servicio (Preparado)</span>
                        <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                          Elaborado al momento en barra. No requiere existencias en catálogo.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Nombre del Ítem y Categoría (2 columnas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nombre del Ítem *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Café Espresso Doble, Bolsa 500g..."
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Departamento / Categoría *
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      required
                      placeholder="Selecciona o escribe..."
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <datalist id="category-suggestions">
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 3. Costo y Precio de Venta (2 columnas) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      {form.item_type === "PRODUCT" ? "Precio de Costo / CPP Base (C$)" : "Costo Referencial de Insumos (C$)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {form.item_type === "PRODUCT" ? "Para productos físicos se recalcula dinámicamente con cada Entrada." : "Estimación de insumos o materia prima por porción."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Precio de Venta al Público (C$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 font-semibold text-[#5F3B1A]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Precio final al cliente en caja POS</p>
                  </div>
                </div>

                {/* 4. Tarjeta Reactiva de Margen y Ganancia Estimada */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50/60 border border-amber-200/80 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-700 text-white">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Margen de Ganancia Proyectado
                      </span>
                      <p className="text-base font-extrabold text-slate-900">
                        +C$ {formCalculations.profit.toFixed(2)} por unidad
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rentabilidad
                    </span>
                    <p className={`text-base font-black ${formCalculations.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {formCalculations.profitPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* 5. Existencias / Stock (Reactivo al Tipo de Ítem) */}
                {form.item_type === "PRODUCT" ? (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Existencias Iniciales en Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cantidad física en catálogo. Puedes reabastecer existencias en cualquier momento con el botón "Entrada de Stock".
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3 animate-fade-in">
                    <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <p className="leading-snug text-xs">
                      <strong>Servicio preparado en barra:</strong> No requiere inventario físico directo en catálogo. Las ventas se procesan libremente en la terminal POS y los insumos se ajustan periódicamente.
                    </p>
                  </div>
                )}

                {/* 6. Subida de Imagen */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fotografía del Ítem
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-amber-600 rounded-2xl bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative h-28 w-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={imagePreview} alt="Vista previa" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-slate-600">Haz clic para subir una foto</p>
                        <p className="text-[10px] text-slate-400">PNG, JPG o WEBP</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer Fijo de Acciones */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 flex-shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 text-xs font-bold text-white shadow-md hover:from-amber-800 hover:to-amber-950 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? "Guardar Cambios" : "Crear Ítem"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL ENTRADA DE STOCK (CPP SIMULATOR - ESPACIOSO)   */}
      {/* ==================================================== */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto">
            {/* Header Fijo */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-emerald-700" />
                  <span>Entrada de Inventario & Costo Promedio Ponderado (CPP)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registra compras de mercadería física, actualiza el precio de venta y recalcula el CPP automáticamente.
                </p>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y pie fijo */}
            <form onSubmit={handleSubmitRestock} className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                
                {/* Selector Reactivo con Combobox y Búsqueda en Vivo */}
                <ProductCombobox
                  label="Producto de Reventa (Físico)"
                  required
                  theme="emerald"
                  products={physicalProducts}
                  value={restockForm.product_id}
                  onChange={(productId) => handleRestockProductChange(productId)}
                  placeholder="Escribe o busca el producto físico por nombre o categoría..."
                  helperText="Solo se listan ítems tipo Producto físico con trazabilidad de stock y CPP"
                />

                {/* Cantidad y Costo Unitario de Compra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cantidad a Ingresar *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Ej. 24"
                      value={restockForm.quantity}
                      onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Unidades físicas recibidas del proveedor</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Costo Unitario de Compra (C$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={restockForm.unit_cost}
                      onChange={(e) => setRestockForm({ ...restockForm, unit_cost: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Costo de compra en factura para esta entrada</p>
                  </div>
                </div>

                {/* Nuevo Precio de Venta Sugerido & Notas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nuevo Precio de Venta al Público (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio vigente si se deja en blanco"
                      value={restockForm.new_sale_price}
                      onChange={(e) => setRestockForm({ ...restockForm, new_sale_price: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-[#5F3B1A]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Actualiza el precio de venta en caja si el costo cambió</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      N° Factura / Proveedor / Notas
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Factura #5892 Proveedor Café Matagalpa"
                      value={restockForm.notes}
                      onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Tarjeta de Simulación en Vivo de CPP */}
                {restockSimulation && (
                  <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-emerald-700" />
                        <span>Simulador de Costo Promedio Ponderado (CPP)</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Inversión Entrada: C$ {restockSimulation.inTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-white p-3 rounded-2xl border border-emerald-100">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Stock Previo</span>
                        <span className="text-sm font-black text-slate-800">{restockSimulation.prevStock} uds</span>
                        <span className="block text-[10px] text-slate-500">CPP: C$ {restockSimulation.prevCost.toFixed(2)}</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-emerald-100">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Ingreso Nuevo</span>
                        <span className="text-sm font-black text-emerald-700">+{restockSimulation.inQty} uds</span>
                        <span className="block text-[10px] text-emerald-600">@ C$ {restockSimulation.inCost.toFixed(2)}</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-emerald-100">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Stock Resultante</span>
                        <span className="text-base font-black text-slate-900">{restockSimulation.newStock} uds</span>
                        <span className="block text-[10px] text-slate-500">Saldo: C$ {restockSimulation.newBalance.toFixed(2)}</span>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-3 rounded-2xl text-white shadow-sm">
                        <span className="block text-[10px] font-bold uppercase text-emerald-100">Nuevo CPP</span>
                        <span className="text-base font-black">C$ {restockSimulation.newCPP.toFixed(2)}</span>
                        <span className="block text-[10px] text-emerald-100">Margen: {restockSimulation.projectedMarginPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Fijo de Acciones */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 flex-shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRestock || !restockForm.product_id}
                  className="flex-1 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {savingRestock ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Procesando Entrada...</span>
                    </>
                  ) : (
                    <span>Registrar Entrada & Actualizar CPP</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL CONFIRMAR ELIMINACIÓN                          */}
      {/* ==================================================== */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Eliminar ítem?</h3>
            <p className="text-xs text-slate-500 mt-1">
              ¿Estás seguro de que deseas eliminar <strong className="text-slate-800">"{deleteModalProduct.name}"</strong>? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setDeleteModalProduct(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-sm"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}