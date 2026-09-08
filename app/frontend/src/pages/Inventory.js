import React, { useState, useEffect, useMemo, useRef } from "react";
import axiosInstance from "../axiosConfig";
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
  AlertTriangle
} from "lucide-react";

const emptyProductForm = {
  name: "",
  price: "",
  stock: "",
  image: null,
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: "", text: "" });

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
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === "in_stock") return p.stock > 5;
      if (statusFilter === "low_stock") return p.stock > 0 && p.stock <= 5;
      if (statusFilter === "out_of_stock") return p.stock <= 0;
      return true;
    });
  }, [products, searchTerm, statusFilter]);

  // Métricas de inventario
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const totalValue = products.reduce(
      (sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.stock, 10) || 0),
      0
    );
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;

    return { totalCount, totalValue, lowStockCount, outOfStockCount };
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
      price: product.price,
      stock: product.stock,
      image: null,
    });
    setImagePreview(getImageUrl(product.image));
    setShowModal(true);
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
    formData.append("price", parseFloat(form.price) || 0);
    formData.append("stock", parseInt(form.stock, 10) || 0);
    
    if (form.image instanceof File) {
      formData.append("image", form.image);
    }

    try {
      if (editingProduct) {
        await axiosInstance.patch(`products/${editingProduct.id}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedbackMsg({ type: "success", text: `Producto "${form.name}" actualizado correctamente.` });
      } else {
        await axiosInstance.post("products/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedbackMsg({ type: "success", text: `Producto "${form.name}" creado con éxito.` });
      }

      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      const errDetail = error.response?.data?.error || error.response?.data?.name?.[0] || "Error al guardar el producto.";
      setFeedbackMsg({ type: "error", text: errDetail });
    } finally {
      setSaving(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteProduct = async () => {
    if (!deleteModalProduct) return;

    try {
      await axiosInstance.delete(`products/${deleteModalProduct.id}/`);
      setFeedbackMsg({ type: "success", text: `Producto "${deleteModalProduct.name}" eliminado.` });
      setDeleteModalProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      setFeedbackMsg({ type: "error", text: "No se pudo eliminar el producto." });
    }
  };

  return (
    <div className="space-y-6 w-full font-sans animate-fade-in pb-8">
      
      {/* ==================================================== */}
      {/* CABECERA Y MÉTRICAS SUPERIORES                      */}
      {/* ==================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2A1708]">
              Inventario de Cafetería
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Control de existencias, precios y catálogo de productos
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-amber-900/20 hover:from-amber-800 hover:to-amber-950 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Productos
                </p>
                <p className="text-xl font-black text-slate-800">{metrics.totalCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Valor Inventario
                </p>
                <p className="text-xl font-black text-slate-800">
                  C$ {metrics.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
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

          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Agotados
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
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>


          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "all"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter("in_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "in_stock"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              En Stock
            </button>
            <button
              onClick={() => setStatusFilter("low_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "low_stock"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Stock Bajo
            </button>
            <button
              onClick={() => setStatusFilter("out_of_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "out_of_stock"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agotados
            </button>
          </div>
        </div>

        {/* Contenedor de Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#5F3B1A] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Producto</th>
                <th className="py-3.5 px-4">Precio Unitario</th>
                <th className="py-3.5 px-4">Stock Actual</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-700 mb-2" />
                    <span>Cargando existencias...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-semibold text-slate-600">No hay productos que coincidan</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Imagen y Nombre */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                            {p.image ? (
                              <img
                                src={getImageUrl(p.image)}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Coffee className="w-5 h-5 text-slate-400" />
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

                      {/* Precio */}
                      <td className="py-3.5 px-4 font-bold text-[#5F3B1A]">
                        C$ {parseFloat(p.price).toFixed(2)}
                      </td>

                      {/* Existencias */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {p.stock} unidades
                      </td>

                      {/* Badge de Estado */}
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                            Stock Bajo ({p.stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Óptimo
                          </span>
                        )}
                      </td>

                      {/* Botones de Acción */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar Producto"
                            className="p-2 rounded-xl text-slate-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModalProduct(p)}
                            title="Eliminar Producto"
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
      </div>

      {/* ==================================================== */}
      {/* MODAL CREAR / EDITAR PRODUCTO                        */}
      {/* ==================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#2A1708] flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-700" />
                <span>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="py-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Café Espresso Doble, Panini de Pollo..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Precio y Stock en 2 columnas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Precio (C$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Existencias Iniciales *
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
                </div>
              </div>

              {/* Subida de Imagen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fotografía del Producto
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

              {/* Botones */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 text-xs font-bold text-white shadow-md hover:from-amber-800 hover:to-amber-950 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? "Guardar Cambios" : "Crear Producto"}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Eliminar producto?</h3>
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