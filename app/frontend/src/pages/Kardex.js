import React, { useState, useEffect, useMemo } from "react";
import axiosInstance from "../axiosConfig";
import { useToast } from "../context/ToastContext";
import { 
  BookOpen, 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Sparkles, 
  RefreshCw, 
  Coffee, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Tag
} from "lucide-react";

export default function Kardex() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const { showToast } = useToast();

  const [form, setForm] = useState({
    product: "",
    movement_type: "RESTOCK",
    quantity: "",
    unit_cost: "",
    new_sale_price: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setFeedback({ type: "", text: "" });
    try {
      const [movementsRes, productsRes] = await Promise.all([
        axiosInstance.get("kardex/"),
        axiosInstance.get("products/"),
      ]);
      setMovements(movementsRes.data);
      // Solo productos físicos de reventa tienen trazabilidad en Kardex
      const physicalOnly = productsRes.data.filter((p) => (p.item_type || "PRODUCT") === "PRODUCT");
      setProducts(physicalOnly);
    } catch (err) {
      console.error("Error al cargar datos de Kardex:", err);
      setFeedback({ type: "error", text: "No se pudieron cargar los registros del Kardex." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado reactivo de movimientos
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesSearch = 
        m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.username && m.username.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesProduct = selectedProduct === "all" || String(m.product) === String(selectedProduct);
      const matchesType = selectedType === "all" || m.movement_type === selectedType;

      return matchesSearch && matchesProduct && matchesType;
    });
  }, [movements, searchTerm, selectedProduct, selectedType]);

  // Métricas calculadas del Kardex
  const metrics = useMemo(() => {
    const totalMovements = movements.length;
    const salesMovements = movements.filter((m) => m.movement_type === "SALE");
    const restockMovements = movements.filter((m) => m.movement_type === "RESTOCK");
    const adjustmentMovements = movements.filter((m) => m.movement_type === "ADJUSTMENT");

    const totalSoldUnits = Math.abs(salesMovements.reduce((acc, m) => acc + (parseInt(m.quantity, 10) || 0), 0));
    const totalAddedUnits = restockMovements.reduce((acc, m) => acc + (parseInt(m.quantity, 10) || 0), 0);

    return {
      totalMovements,
      salesCount: salesMovements.length,
      totalSoldUnits,
      restockCount: restockMovements.length,
      totalAddedUnits,
      adjustmentsCount: adjustmentMovements.length,
    };
  }, [movements]);

  // Manejar cambio de producto en formulario
  const handleFormProductChange = (productId) => {
    const selected = products.find((p) => String(p.id) === String(productId));
    if (selected) {
      setForm((prev) => ({
        ...prev,
        product: String(productId),
        unit_cost: selected.cost_price || "0.00",
        new_sale_price: selected.price || "",
      }));
    } else {
      setForm((prev) => ({ ...prev, product: String(productId) }));
    }
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!form.product) {
      setFeedback({ type: "error", text: "Debes seleccionar un producto físico." });
      return;
    }
    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty === 0) {
      setFeedback({ type: "error", text: "Ingresa una cantidad numérica válida distinta de cero." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const payload = {
        product: parseInt(form.product, 10),
        movement_type: form.movement_type,
        quantity: qty,
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : undefined,
        new_sale_price: form.new_sale_price ? parseFloat(form.new_sale_price) : undefined,
        notes: form.notes,
      };

      await axiosInstance.post("kardex/", payload);

      showToast("Movimiento de stock registrado correctamente en Kardex.", "success");
      setShowModal(false);
      setForm({ product: "", movement_type: "RESTOCK", quantity: "", unit_cost: "", new_sale_price: "", notes: "" });
      fetchData();
    } catch (err) {
      console.error("Error al registrar movimiento:", err);
      const msg = err.response?.data?.error || "Error al registrar el movimiento en Kardex.";
      setFeedback({ type: "error", text: msg });
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderMovementBadge = (type) => {
    switch (type) {
      case "SALE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
            <ArrowDownLeft className="w-3 h-3 text-red-600" />
            Venta POS
          </span>
        );
      case "RESTOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            Entrada / Compra
          </span>
        );
      case "ADJUSTMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            Ajuste Manual
          </span>
        );
      case "INITIAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Stock Inicial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full font-sans animate-fade-in pb-12">
      
      {/* ==================================================== */}
      {/* ENCABEZADO Y BOTÓN DE ACCIÓN                         */}
      {/* ==================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Auditoría, CPP & Trazabilidad de Inventario Físico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1708]">
            Kardex de Inventario Físico
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro cronológico valorizado bajo la metodología de Costo Promedio Ponderado (CPP)
          </p>
        </div>

        <button
          onClick={() => {
            const firstP = products[0];
            setForm({
              product: firstP ? String(firstP.id) : "",
              movement_type: "RESTOCK",
              quantity: "",
              unit_cost: firstP ? firstP.cost_price || "0.00" : "",
              new_sale_price: firstP ? firstP.price || "" : "",
              notes: "",
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-900/20 hover:from-amber-800 hover:to-amber-950 transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Movimiento / Entrada</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TARJETAS DE MÉTRICAS RÁPIDAS                         */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total Registros
              </p>
              <p className="text-xl font-black text-slate-800">{metrics.totalMovements}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Unidades Vendidas
              </p>
              <p className="text-xl font-black text-red-600">-{metrics.totalSoldUnits}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Unidades Ingresadas
              </p>
              <p className="text-xl font-black text-emerald-700">+{metrics.totalAddedUnits}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ajustes Manuales
              </p>
              <p className="text-xl font-black text-amber-800">{metrics.adjustmentsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback.text && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs sm:text-sm animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: "", text: "" })}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* TABLA PRINCIPAL Y BARRA DE FILTROS                  */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200/80 space-y-4 w-full">
        {/* Barra de Filtros */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, categoría o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Producto */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-600"
            >
              <option value="all">Todos los productos físicos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category || "General"})
                </option>
              ))}
            </select>

            {/* Filtro por Tipo */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-600"
            >
              <option value="all">Todos los tipos</option>
              <option value="SALE">Ventas POS</option>
              <option value="RESTOCK">Entradas / Compra</option>
              <option value="ADJUSTMENT">Ajustes Manuales</option>
              <option value="INITIAL">Stock Inicial</option>
            </select>

            <button
              onClick={fetchData}
              title="Recargar datos"
              className="rounded-2xl bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200/80 p-2.5 text-slate-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenedor de la Tabla con metodología CPP */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200/80">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#5F3B1A] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Producto & Departamento</th>
                <th className="py-3.5 px-4">Tipo Movimiento</th>
                <th className="py-3.5 px-4 text-center">Cantidad (+/-)</th>
                <th className="py-3.5 px-4 text-right">Costo Unit. (CPP)</th>
                <th className="py-3.5 px-4 text-right">Total Movimiento</th>
                <th className="py-3.5 px-4 text-center">Stock Resultante</th>
                <th className="py-3.5 px-4 text-right">Saldo Monetario</th>
                <th className="py-3.5 px-4">Responsable & Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-700" />
                      <span className="text-xs font-medium">Cargando registros valorizados de Kardex...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <Coffee className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No hay movimientos registrados</p>
                    <p className="text-xs text-slate-400 mt-0.5">Las ventas de productos físicos y compras aparecerán aquí automáticamente.</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((item) => {
                  const isPositive = item.quantity > 0;
                  const dateObj = new Date(item.created_at);
                  const formattedDate = dateObj.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const unitCostVal = parseFloat(item.unit_cost || 0);
                  const totalCostVal = parseFloat(item.total_cost || 0);
                  const resultingBalanceVal = parseFloat(item.resulting_balance || 0);

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition-colors text-xs">
                      {/* Fecha & Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formattedDate}</div>
                        <div className="text-[10px] text-slate-400">{formattedTime}</div>
                      </td>

                      {/* Producto & Categoría */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.product_name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3 text-stone-400" />
                          <span className="text-[10px] text-stone-500 font-medium">
                            {item.category || "General"}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderMovementBadge(item.movement_type)}
                      </td>

                      {/* Cantidad (+/-) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-black px-2.5 py-1 rounded-lg ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-red-50 text-red-700 border border-red-200/60"
                          }`}
                        >
                          {isPositive ? `+${item.quantity}` : item.quantity}
                        </span>
                      </td>

                      {/* Costo Unitario Aplicado */}
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        C$ {unitCostVal.toFixed(2)}
                      </td>

                      {/* Monto Total Movimiento */}
                      <td className="py-3 px-4 text-right font-black">
                        <span className={totalCostVal >= 0 ? "text-emerald-700" : "text-red-600"}>
                          {totalCostVal >= 0 ? `+C$ ${totalCostVal.toFixed(2)}` : `-C$ ${Math.abs(totalCostVal).toFixed(2)}`}
                        </span>
                      </td>

                      {/* Stock Resultante */}
                      <td className="py-3 px-4 text-center font-extrabold text-slate-900">
                        {item.resulting_stock} uds
                      </td>

                      {/* Saldo Monetario */}
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        C$ {resultingBalanceVal.toFixed(2)}
                      </td>

                      {/* Responsable & Notas */}
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-amber-950 flex items-center gap-1">
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                            {item.username}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {item.notes || "—"}
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
      {/* MODAL DE ENTRADA / AJUSTE MANUAL (ESPACIOSO)         */}
      {/* ==================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-800" />
                  <span>Registrar Movimiento en Kardex</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reabastecimiento con costo de compra o ajuste administrativo
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Producto Físico *
                  </label>
                  <select
                    value={form.product}
                    onChange={(e) => handleFormProductChange(e.target.value)}
                    required
                    className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-3 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Selecciona un producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock actual: {p.stock} | CPP: C$ {parseFloat(p.cost_price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Tipo de Operación *
                    </label>
                    <select
                      value={form.movement_type}
                      onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
                      className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="RESTOCK">Reabastecimiento / Compra (+)</option>
                      <option value="ADJUSTMENT">Ajuste de Stock (±)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Cantidad {form.movement_type === "RESTOCK" ? "(Positiva)" : "(Ajuste)"} *
                    </label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      placeholder={form.movement_type === "RESTOCK" ? "Ej. 24" : "Ej. 5 ó -3"}
                      required
                      className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                {form.movement_type === "RESTOCK" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Costo Unitario de Compra (C$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.unit_cost}
                        onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                        placeholder="0.00"
                        className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Costo de factura para recalcular CPP</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nuevo Precio de Venta (C$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.new_sale_price}
                        onChange={(e) => setForm({ ...form, new_sale_price: e.target.value })}
                        placeholder="Dejar vacío para conservar actual"
                        className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Motivo / Observaciones / N° Factura
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ej. Factura proveedor #4092 o merma por caducidad"
                    className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 flex-shrink-0 mt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-amber-950/20 hover:from-amber-800 hover:to-amber-950 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Confirmar Movimiento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

