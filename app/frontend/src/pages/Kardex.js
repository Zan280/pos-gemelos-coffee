import React, { useState, useEffect, useMemo } from "react";
import axiosInstance from "../axiosConfig";
import { useToast } from "../context/ToastContext";
import ProductCombobox from "../components/ProductCombobox";
import { 
  BookOpen, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Sparkles, 
  RefreshCw, 
  Coffee, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  SlidersHorizontal,
  MinusCircle,
  PlusCircle,
  AlertTriangle,
  FileText
} from "lucide-react";

const SUGGESTED_REASONS = [
  "Apertura de bolsa para barra",
  "Merma por derrame / daño",
  "Ajuste por conteo físico",
  "Consumo interno / Degustación",
  "Producto vencido / descarte",
  "Corrección administrativa"
];

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
    adjustment_type: "OUT", // "OUT" (Merma / Consumo Interno -) vs "IN" (Sobrante / Entrada por Ajuste +)
    quantity: "",
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

  // Producto seleccionado en el modal
  const selectedProductObj = useMemo(() => {
    return products.find((p) => String(p.id) === String(form.product)) || null;
  }, [products, form.product]);

  // Cálculos en tiempo real para el impacto del ajuste
  const qtyNum = parseInt(form.quantity, 10) || 0;
  const currentStock = selectedProductObj ? selectedProductObj.stock : 0;
  const isDeduction = form.adjustment_type === "OUT";
  const deltaQty = isDeduction ? -qtyNum : qtyNum;
  const projectedStock = currentStock + deltaQty;
  const isStockInsufficient = isDeduction && qtyNum > currentStock;
  const unitCost = selectedProductObj ? parseFloat(selectedProductObj.cost_price || 0) : 0;
  const estimatedMonetaryImpact = (qtyNum * unitCost) * (isDeduction ? -1 : 1);

  // Manejar envío del ajuste manual
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!form.product) {
      showToast("Debes seleccionar un producto físico.", "warning");
      return;
    }
    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast("Ingresa una cantidad entera positiva mayor a cero.", "warning");
      return;
    }
    if (!form.notes.trim()) {
      showToast("El motivo o justificación del ajuste es obligatorio.", "warning");
      return;
    }
    if (isStockInsufficient) {
      showToast(`Stock insuficiente. Disponible: ${currentStock}, intentando deducir: ${qty}`, "error");
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const payload = {
        product: parseInt(form.product, 10),
        movement_type: "ADJUSTMENT",
        adjustment_type: form.adjustment_type,
        quantity: isDeduction ? -qty : qty,
        notes: form.notes.trim(),
      };

      await axiosInstance.post("kardex/", payload);

      showToast(
        isDeduction 
          ? `Ajuste registrado: -${qty} uds de ${selectedProductObj?.name || "producto"}.`
          : `Ajuste registrado: +${qty} uds de ${selectedProductObj?.name || "producto"}.`,
        "success"
      );
      setShowModal(false);
      setForm({ product: "", adjustment_type: "OUT", quantity: "", notes: "" });
      fetchData();
    } catch (err) {
      console.error("Error al registrar ajuste:", err);
      const msg = err.response?.data?.error || "Error al registrar el ajuste en Kardex.";
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
      {/* ENCABEZADO Y BOTÓN DE ACCIÓN ÚNICO (AJUSTE)          */}
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
            Registro cronológico valorizado bajo la metodología de Costo Promedio Ponderado (CPP).
          </p>
        </div>

        {/* Botón único de Ajuste en Kardex (Las compras se realizan formalmente en /inventory) */}
        <button
          onClick={() => {
            const firstP = products[0];
            setForm({
              product: firstP ? String(firstP.id) : "",
              adjustment_type: "OUT",
              quantity: "",
              notes: "",
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-amber-900/20 hover:from-amber-800 hover:to-amber-950 transition-all active:scale-[0.99]"
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-300" />
          <span>Registrar Ajuste de Stock</span>
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
              placeholder="Buscar por producto, categoría, notas o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Producto con Búsqueda Reactiva */}
            <div className="w-64">
              <ProductCombobox
                size="compact"
                allOptionLabel="Todos los productos físicos"
                products={products}
                value={selectedProduct}
                onChange={(val) => setSelectedProduct(val)}
                placeholder="Filtrar por producto..."
                theme="amber"
              />
            </div>

            {/* Filtro por Tipo */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-600"
            >
              <option value="all">Todos los tipos de movimiento</option>
              <option value="SALE">Ventas POS</option>
              <option value="RESTOCK">Entradas / Compra (Inventario)</option>
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
                <th className="py-3.5 px-4">Responsable & Justificación</th>
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
                    <p className="text-xs text-slate-400 mt-0.5">Las ventas de productos físicos, entradas de compras y ajustes aparecerán aquí.</p>
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

                      {/* Responsable & Justificación */}
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-amber-950 flex items-center gap-1">
                          <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                            {item.username || "Admin"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-xs mt-0.5" title={item.notes}>
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
      {/* MODAL INTUITIVO DE AJUSTE MANUAL DE INVENTARIO       */}
      {/* ==================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto max-h-[90vh] flex flex-col">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-800" />
                  <span>Ajuste Manual de Inventario</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajuste directo de existencias para mermas, consumo interno en barra o sobrantes físicos.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitAdjustment} className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                
                {/* 1. Selector Reactivo con Combobox y Búsqueda en Vivo */}
                <ProductCombobox
                  label="Producto Físico a Ajustar"
                  required
                  theme="amber"
                  products={products}
                  value={form.product}
                  onChange={(productId) => setForm((prev) => ({ ...prev, product: productId }))}
                  placeholder="Escribe o busca el producto físico por nombre o categoría..."
                  helperText="Solo se listan ítems físicos con existencias registradas en Kardex"
                />

                {/* 2. Selector Visual Tipo Switch / Cards: Tipo de Ajuste */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Sentido del Ajuste *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Opción 1: Merma / Salida (-) */}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, adjustment_type: "OUT" }))}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isDeduction
                          ? "bg-red-50/80 border-red-300 ring-2 ring-red-500/20 shadow-xs"
                          : "bg-stone-50 border-stone-200 hover:bg-stone-100/60 opacity-80"
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${isDeduction ? "bg-red-200 text-red-800" : "bg-stone-200 text-stone-600"}`}>
                        <MinusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`block text-xs font-bold ${isDeduction ? "text-red-950" : "text-slate-800"}`}>
                          Faltante / Merma / Salida (-)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Apertura de bolsa para barra, roturas, vencimiento o pérdida.
                        </p>
                      </div>
                    </button>

                    {/* Opción 2: Sobrante / Entrada (+) */}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, adjustment_type: "IN" }))}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        !isDeduction
                          ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-stone-50 border-stone-200 hover:bg-stone-100/60 opacity-80"
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${!isDeduction ? "bg-emerald-200 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`block text-xs font-bold ${!isDeduction ? "text-emerald-950" : "text-slate-800"}`}>
                          Sobrante / Entrada por Ajuste (+)
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          Conteo físico superior, devolución de muestra o corrección positiva.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 3. Cantidad a Ajustar (Siempre número positivo) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Cantidad a {isDeduction ? "Deducir / Restar" : "Agregar / Sumar"} (Unidades) *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Ingresa siempre un número entero positivo
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Ej. 1, 2, 5 (el sistema aplica el signo automáticamente)"
                    required
                    className={`w-full rounded-2xl bg-stone-50 border py-3 px-4 text-sm font-black text-slate-900 outline-none transition-all ${
                      isStockInsufficient 
                        ? "border-red-400 focus:ring-2 focus:ring-red-500/20 text-red-700" 
                        : "border-stone-200/90 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                    }`}
                  />
                </div>

                {/* 4. Previsualización de Impacto en Stock */}
                {selectedProductObj && (
                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-stone-200/60 pb-2">
                      <span className="text-slate-600">Simulación del Impacto en Existencias:</span>
                      <span className="text-slate-900 font-extrabold">{selectedProductObj.name}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-white border border-stone-200/60">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Stock Actual</span>
                        <span className="text-sm font-black text-slate-800">{currentStock} uds</span>
                      </div>

                      <div className={`p-2 rounded-xl border ${isDeduction ? "bg-red-50/60 border-red-200" : "bg-emerald-50/60 border-emerald-200"}`}>
                        <span className="block text-[10px] uppercase font-semibold text-slate-500">Ajuste</span>
                        <span className={`text-sm font-black ${isDeduction ? "text-red-700" : "text-emerald-700"}`}>
                          {deltaQty > 0 ? `+${deltaQty}` : deltaQty} uds
                        </span>
                      </div>

                      <div className={`p-2 rounded-xl border ${isStockInsufficient ? "bg-red-100 border-red-300" : "bg-white border-stone-200/60"}`}>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Stock Resultante</span>
                        <span className={`text-sm font-black ${isStockInsufficient ? "text-red-700" : "text-slate-900"}`}>
                          {projectedStock} uds
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Costo CPP: <strong className="text-slate-700">C$ {unitCost.toFixed(2)}</strong></span>
                      <span>Impacto Contable: <strong className={estimatedMonetaryImpact >= 0 ? "text-emerald-700" : "text-red-600"}>
                        {estimatedMonetaryImpact >= 0 ? `+C$ ${estimatedMonetaryImpact.toFixed(2)}` : `-C$ ${Math.abs(estimatedMonetaryImpact).toFixed(2)}`}
                      </strong></span>
                    </div>

                    {isStockInsufficient && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-100 border border-red-200 text-red-900 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>No puedes reducir más unidades de las disponibles en inventario ({currentStock} uds).</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Campo OBLIGATORIO de Motivo / Justificación */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-800" />
                      <span>Motivo / Justificación del Ajuste *</span>
                    </label>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Obligatorio
                    </span>
                  </div>

                  <textarea
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Describe detalladamente la razón de este ajuste contable..."
                    required
                    className="w-full rounded-2xl bg-stone-50 border border-stone-200/90 py-2.5 px-4 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 resize-none"
                  />

                  {/* Chips de sugerencias rápidas */}
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sugerencias Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {SUGGESTED_REASONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, notes: suggestion }))}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 text-[11px] font-medium text-slate-600 transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Botones de Acción */}
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
                  disabled={submitting || isStockInsufficient || !form.notes.trim()}
                  className="rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-amber-950/20 hover:from-amber-800 hover:to-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando Ajuste...</span>
                    </>
                  ) : (
                    <span>Confirmar Ajuste</span>
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
