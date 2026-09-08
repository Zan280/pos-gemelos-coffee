import React, { useState, useEffect, useMemo } from "react";
import axiosInstance from "../axiosConfig";
import { useToast } from "../context/ToastContext";
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Receipt, 
  CreditCard, 
  Banknote, 
  ArrowRightLeft, 
  Award, 
  RefreshCw, 
  Search, 
  Eye, 
  X, 
  Coffee, 
  Sparkles,
  Download
} from "lucide-react";


export default function Reports() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState("all");
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes] = await Promise.all([
        axiosInstance.get("reports/stats/"),
        axiosInstance.get("sales/"),
      ]);
      setStats(statsRes.data);
      setSalesList(salesRes.data);
    } catch (err) {
      console.error("Error al cargar reportes y estadísticas:", err);
      showToast("Error al cargar las métricas y reportes", "error");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchReportsData();
  }, []);

  // Filtrar lista de ventas
  const filteredSales = useMemo(() => {
    return salesList.filter((s) => {
      const matchesSearch = 
        String(s.id).includes(searchTerm) ||
        (s.cashier_username && s.cashier_username.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPayment = selectedPaymentFilter === "all" || s.payment_method === selectedPaymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [salesList, searchTerm, selectedPaymentFilter]);

  // Encontrar el valor máximo para escalar la gráfica de barras
  const maxDayTotal = useMemo(() => {
    if (!stats || !stats.daily_trends || stats.daily_trends.length === 0) return 1;
    const maxVal = Math.max(...stats.daily_trends.map((d) => d.total));
    return maxVal > 0 ? maxVal : 1;
  }, [stats]);

  const renderPaymentBadge = (method) => {
    switch (method) {
      case "card":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <CreditCard className="w-3 h-3 text-blue-600" />
            Tarjeta
          </span>
        );
      case "transfer":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <ArrowRightLeft className="w-3 h-3 text-purple-600" />
            Transferencia
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Banknote className="w-3 h-3 text-emerald-600" />
            Efectivo
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    if (salesList.length === 0) {
      showToast("No hay ventas registradas para exportar", "warning");
      return;
    }
    const headers = ["Ticket ID", "Fecha", "Hora", "Cajero", "Metodo Pago", "Total (C$)"];
    const rows = salesList.map((s) => {
      const d = new Date(s.created_at);
      return [
        `#${s.id}`,
        d.toLocaleDateString("es-ES"),
        d.toLocaleTimeString("es-ES"),
        s.cashier_username || "Cajero",
        s.payment_method || "cash",
        parseFloat(s.total_price).toFixed(2),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_ventas_gemelos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Reporte de ventas exportado exitosamente en CSV", "success");
  };

  return (
    <div className="space-y-6 w-full font-sans animate-fade-in pb-12">
      
      {/* ==================================================== */}
      {/* CABECERA Y ACCIONES                                 */}
      {/* ==================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 text-xs font-bold mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
            <span>Métricas Financieras & Desempeño Comercial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1708]">
            Reportes & Ventas
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Análisis de ingresos, productos más vendidos y libro de ventas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportsData}
            title="Recargar métricas"
            className="rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/80 p-3 text-slate-600 shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/80 px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-amber-800" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TARJETAS DE KPIS FINANCIEROS                        */}
      {/* ==================================================== */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-3xl bg-white animate-pulse border border-stone-200/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* KPI 1: Ingresos Totales */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ingresos Totales
              </span>
              <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                C$ {stats.kpis.total_revenue.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.kpis.total_sales_count} ventas acumuladas
              </p>
            </div>
          </div>

          {/* KPI 2: Ventas del Día */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ventas de Hoy
              </span>
              <div className="h-9 w-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">
                C$ {stats.kpis.today_revenue.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.kpis.today_count} órdenes procesadas hoy
              </p>
            </div>
          </div>

          {/* KPI 3: Ticket Promedio */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ticket Promedio
              </span>
              <div className="h-9 w-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                C$ {stats.kpis.average_ticket.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Por transacción</p>
            </div>
          </div>

          {/* KPI 4: Margen Bruto Estimado */}
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Margen Estimado (60%)
              </span>
              <div className="h-9 w-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-purple-800">
                C$ {stats.kpis.estimated_profit.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Margen operativo cafetería</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GRÁFICO DE TENDENCIA Y TOP PRODUCTOS (2 COLUMNAS)   */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Panel Izquierdo (2 cols): Gráfica de Tendencia Diaria */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Tendencia de Ventas Diarias
              </h3>
              <p className="text-xs text-slate-400">Ingresos de los últimos 7 días</p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
              Última Semana
            </span>
          </div>

          {/* Gráfico interactivo SVG/CSS */}
          <div className="h-60 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-stone-100">
            {stats && stats.daily_trends ? (
              stats.daily_trends.map((d, index) => {
                const heightPercentage = Math.round((d.total / maxDayTotal) * 100);
                const displayHeight = heightPercentage > 8 ? heightPercentage : 8;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-[#2A1708] text-amber-100 text-[11px] font-bold py-1 px-2.5 rounded-xl shadow-lg pointer-events-none z-20 whitespace-nowrap">
                      C$ {d.total.toFixed(2)} ({d.count} vtas)
                    </div>

                    {/* Barra */}
                    <div className="w-full max-w-[48px] bg-stone-100 rounded-2xl h-44 flex items-end p-1 overflow-hidden">
                      <div
                        style={{ height: `${displayHeight}%` }}
                        className="w-full rounded-xl bg-gradient-to-t from-amber-800 to-amber-600 group-hover:from-amber-700 group-hover:to-amber-500 transition-all duration-300 shadow-sm"
                      />
                    </div>

                    {/* Etiqueta Día */}
                    <span className="text-[11px] font-bold text-slate-500 group-hover:text-amber-900 transition-colors">
                      {d.display_date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-slate-400 py-12">Cargando gráfico...</div>
            )}
          </div>
        </div>

        {/* Panel Derecho (1 col): Top 5 Productos Más Vendidos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top 5 Productos</h3>
              <p className="text-xs text-slate-400">Favoritos de los clientes</p>
            </div>
            <Award className="w-5 h-5 text-amber-700" />
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {stats && stats.top_products && stats.top_products.length > 0 ? (
              stats.top_products.map((item, idx) => {
                const maxSold = stats.top_products[0].total_quantity || 1;
                const percent = Math.round((item.total_quantity / maxSold) * 100);

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[170px]">
                        <span className="text-[11px] font-black text-amber-700 w-4">
                          #{idx + 1}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="font-extrabold text-[#5F3B1A]">
                        {item.total_quantity} unids.
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-amber-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">
                No hay suficientes ventas registradas para el ranking.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* ==================================================== */}
      {/* TABLA: HISTORIAL DE VENTAS COMPLETADAS              */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200/80 space-y-4 w-full">
        {/* Barra de Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por # de Ticket o Cajero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="rounded-2xl bg-stone-100/80 border border-stone-200/80 py-2.5 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-600"
            >
              <option value="all">Todos los pagos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
        </div>

        {/* Contenedor de la Tabla */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200/80">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#FAF6F0] text-[11px] font-bold uppercase tracking-wider text-[#5F3B1A] border-b border-stone-200">
              <tr>
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Cajero</th>
                <th className="py-3.5 px-4">Método de Pago</th>
                <th className="py-3.5 px-4 text-center">Ítems</th>
                <th className="py-3.5 px-4 text-right">Total Cobrado</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-700 mb-2" />
                    <span className="text-xs font-medium">Cargando libro de ventas...</span>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Coffee className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No hay ventas registradas</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const dateObj = new Date(sale.created_at);
                  const formattedDate = dateObj.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const totalItemsCount = sale.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

                  return (
                    <tr key={sale.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 font-black text-amber-900">
                        #{sale.id}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-800">{formattedDate}</div>
                        <div className="text-[11px] text-slate-400">{formattedTime}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700 bg-stone-100 px-2 py-0.5 rounded-md">
                          {sale.cashier_username || "Cajero"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderPaymentBadge(sale.payment_method)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {totalItemsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        C$ {parseFloat(sale.total_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
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
      {/* MODAL DE DESGLOSE DE VENTA / TICKET                  */}
      {/* ==================================================== */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-800" />
                  Detalle del Ticket #{selectedSaleDetail.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedSaleDetail.created_at).toLocaleString("es-ES")}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desglose de Productos */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-stone-100">
              {selectedSaleDetail.items?.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{item.product_name}</span>
                    <span className="text-slate-400">
                      {item.quantity} x C$ {parseFloat(item.product_unit_price).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-black text-slate-900">
                    C$ {parseFloat(item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totalizador */}
            <div className="pt-4 border-t border-stone-100 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Método de pago:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {selectedSaleDetail.payment_method || "Efectivo"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Atendido por:</span>
                <span className="font-semibold text-slate-800">
                  {selectedSaleDetail.cashier_username || "Cajero"}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-stone-200">
                <span>Total de la Orden:</span>
                <span className="text-[#5F3B1A]">
                  C$ {parseFloat(selectedSaleDetail.total_price).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSaleDetail(null)}
              className="w-full rounded-2xl bg-amber-800 text-white py-3 text-xs font-bold hover:bg-amber-900 transition-colors"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
