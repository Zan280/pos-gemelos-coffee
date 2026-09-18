import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Package, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  DollarSign,
  Receipt,
  BookOpen,
  Calendar,
  RefreshCw,
  Award
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { getUser, isAdmin } from "../auth";
import { useCart } from "../context/CartContext";
import axiosInstance from "../axiosConfig";

export default function Home() {
  const [productCount, setProductCount] = useState(0);
  const [salesList, setSalesList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("day"); // "day" (Día), "week" (Semana), "month" (Mes)

  const { totalItems } = useCart();
  const user = getUser() || { username: "Cajero" };
  const userIsAdmin = isAdmin();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [prodRes, salesRes, statsRes] = await Promise.all([
          axiosInstance.get("products/"),
          axiosInstance.get("sales/"),
          axiosInstance.get("reports/stats/").catch(() => ({ data: null })),
        ]);
        setProductCount(prodRes.data.length);
        setSalesList(salesRes.data || []);
        if (statsRes && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ====================================================
  // CÁLCULO DINÁMICO DE DATOS PARA LA GRÁFICA (RECHARTS)
  // ====================================================
  const chartData = useMemo(() => {
    const now = new Date();

    if (timeframe === "day") {
      // 1. Granularidad por DÍA (Últimos 7 días con fallback limpio a cero)
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });

        let dayRevenue = 0;
        let dayCost = 0;

        salesList.forEach((s) => {
          if (s.created_at && s.created_at.slice(0, 10) === dateStr) {
            dayRevenue += parseFloat(s.total_price) || 0;
            s.items?.forEach((item) => {
              const itemCost = parseFloat(item.cost_price) || 0;
              const itemQty = parseFloat(item.quantity) || 1;
              dayCost += itemCost * itemQty;
            });
          }
        });

        if (dayRevenue > 0 && dayCost === 0) {
          dayCost = dayRevenue * 0.35;
        }
        const dayProfit = Math.max(0, dayRevenue - dayCost);

        days.push({
          label: dayLabel,
          date: dateStr,
          ventas: parseFloat(dayRevenue.toFixed(2)),
          costo: parseFloat(dayCost.toFixed(2)),
          utilidad: parseFloat(dayProfit.toFixed(2)),
        });
      }
      return days;
    }

    if (timeframe === "week") {
      // 2. Granularidad por SEMANA (Últimas 4 semanas)
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const startDay = new Date();
        startDay.setDate(now.getDate() - (i * 7 + 6));
        startDay.setHours(0, 0, 0, 0);

        const endDay = new Date();
        endDay.setDate(now.getDate() - (i * 7));
        endDay.setHours(23, 59, 59, 999);

        const weekLabel = i === 0 ? "Sem. Actual" : `Semana -${i}`;

        let weekRevenue = 0;
        let weekCost = 0;

        salesList.forEach((s) => {
          const sDate = new Date(s.created_at);
          if (sDate >= startDay && sDate <= endDay) {
            weekRevenue += parseFloat(s.total_price) || 0;
            s.items?.forEach((item) => {
              const itemCost = parseFloat(item.cost_price) || 0;
              const itemQty = parseFloat(item.quantity) || 1;
              weekCost += itemCost * itemQty;
            });
          }
        });

        if (weekRevenue > 0 && weekCost === 0) {
          weekCost = weekRevenue * 0.35;
        }
        const weekProfit = Math.max(0, weekRevenue - weekCost);

        weeks.push({
          label: weekLabel,
          ventas: parseFloat(weekRevenue.toFixed(2)),
          costo: parseFloat(weekCost.toFixed(2)),
          utilidad: parseFloat(weekProfit.toFixed(2)),
        });
      }
      return weeks;
    }

    if (timeframe === "month") {
      // 3. Granularidad por MES (Últimos 6 meses)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthLabel = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });

        let monthRevenue = 0;
        let monthCost = 0;

        salesList.forEach((s) => {
          const sDate = new Date(s.created_at);
          if (sDate.getFullYear() === year && sDate.getMonth() === month) {
            monthRevenue += parseFloat(s.total_price) || 0;
            s.items?.forEach((item) => {
              const itemCost = parseFloat(item.cost_price) || 0;
              const itemQty = parseFloat(item.quantity) || 1;
              monthCost += itemCost * itemQty;
            });
          }
        });

        if (monthRevenue > 0 && monthCost === 0) {
          monthCost = monthRevenue * 0.35;
        }
        const monthProfit = Math.max(0, monthRevenue - monthCost);

        months.push({
          label: monthLabel,
          ventas: parseFloat(monthRevenue.toFixed(2)),
          costo: parseFloat(monthCost.toFixed(2)),
          utilidad: parseFloat(monthProfit.toFixed(2)),
        });
      }
      return months;
    }

    return [];
  }, [salesList, timeframe]);

  // Totales acumulados para el pie de la gráfica
  const periodTotals = useMemo(() => {
    const totalVentas = chartData.reduce((acc, curr) => acc + curr.ventas, 0);
    const totalCosto = chartData.reduce((acc, curr) => acc + curr.costo, 0);
    const totalUtilidad = chartData.reduce((acc, curr) => acc + curr.utilidad, 0);
    const margen = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0;

    return { totalVentas, totalCosto, totalUtilidad, margen };
  }, [chartData]);

  // Tooltip personalizado para Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2A1708]/95 text-white p-3.5 rounded-2xl shadow-2xl border border-amber-500/30 text-xs space-y-1.5 backdrop-blur-md min-w-[170px]">
          <p className="font-extrabold text-amber-300 text-sm border-b border-amber-900/60 pb-1 uppercase tracking-wider">
            {label}
          </p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-black text-amber-100">
                C$ {Number(entry.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = salesList.filter((s) => s.created_at && s.created_at.slice(0, 10) === todayStr);
  const todayRevenue = todaySales.reduce((acc, s) => acc + (parseFloat(s.total_price) || 0), 0);
  const todayCount = todaySales.length;

  return (
    <div className="space-y-6 sm:space-y-8 font-sans animate-fade-in pb-12 w-full">
      
      {/* ==================================================== */}
      {/* 1. HERO BANNER UNIFICADO DE BIENVENIDA               */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2A1708] via-[#5F3B1A] to-amber-900 p-6 sm:p-10 text-white shadow-2xl border border-amber-900/30">
        {/* Luces de fondo decorativas */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[50%] -right-[20%] h-[130%] w-[60%] rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="absolute -bottom-[50%] -left-[20%] h-[130%] w-[60%] rounded-full bg-orange-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Panel de Control Principal · Gemelos Coffee POS</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-50 leading-tight">
              ¡Bienvenido, {user.username}!
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed">
              Monitorea el rendimiento financiero de la cafetería, supervisa ventas en tiempo real y gestiona inventario con facilidad.
            </p>
          </div>

          {/* Botón único de Acción Principal en Hero */}
          <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link
              to="/sales"
              className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-6 py-4 text-xs sm:text-sm font-black shadow-xl shadow-amber-950/40 active:scale-[0.99] transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Iniciar Venta en POS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. TARJETAS DE KPIS PRINCIPALES                      */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* KPI 1: Ventas de Hoy */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ventas de Hoy
            </span>
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              C$ {todayRevenue.toFixed(2)}
            </p>
            <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
              {todayCount} {todayCount === 1 ? "orden procesada" : "órdenes procesadas"}
            </p>
          </div>
        </div>

        {/* KPI 2: Total Histórico de Ventas */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ventas Totales
            </span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {salesList.length}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Tickets emitidos
            </p>
          </div>
        </div>

        {/* KPI 3: Catálogo Activo */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Catálogo Carta
            </span>
            <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {productCount}
            </p>
            <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
              Productos y servicios
            </p>
          </div>
        </div>

        {/* KPI 4: Utilidad Estimada Acumulada */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Margen de Utilidad
            </span>
            <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-purple-800">
              C$ {(stats?.kpis?.estimated_profit || periodTotals.totalUtilidad).toFixed(2)}
            </p>
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5">
              Rendimiento proyectado
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. SECCIÓN DESTACADA: GRÁFICA INTERACTIVA RECHARTS   */}
      {/* ==================================================== */}
      <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-sm border border-stone-200/80 space-y-6">
        {/* Cabecera de la Gráfica y Selector de Granularidad */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 mb-1">
              <BarChart3Icon className="w-3.5 h-3.5 text-amber-700" />
              <span>Análisis Comparativo Financiero</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Rendimiento de Ventas & Costos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativo de Ingresos por Ventas vs Inversión en Costo y Margen de Utilidad Neta
            </p>
          </div>

          {/* Selector de Granularidad Temporal (Pills) */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimeframe("day")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "day"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Día (7 días)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("week")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "week"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semana (4 sem)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("month")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "month"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mes (6 meses)
            </button>
          </div>
        </div>

        {/* Contenedor Recharts */}
        <div className="w-full h-72 sm:h-80 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-700 mb-2" />
              <p className="text-xs font-medium">Cargando métricas financieras...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Calendar className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-medium">No hay registros para este período.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFE9" />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `C$ ${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px", fontWeight: "600" }}
                  formatter={(value) => <span className="text-slate-700 font-bold">{value}</span>}
                />
                <Bar
                  dataKey="ventas"
                  name="Ingresos (Ventas)"
                  fill="#D97706"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="costo"
                  name="Costo Inversión"
                  fill="#78716C"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="utilidad"
                  name="Utilidad Neta"
                  fill="#059669"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resumen del Período Seleccionado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-100">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Total Ingresos
            </span>
            <p className="text-sm sm:text-base font-black text-amber-950 mt-0.5">
              C$ {periodTotals.totalVentas.toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Costo
            </span>
            <p className="text-sm sm:text-base font-black text-slate-700 mt-0.5">
              C$ {periodTotals.totalCosto.toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Utilidad Neta
            </span>
            <p className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
              C$ {periodTotals.totalUtilidad.toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-900 text-white text-center shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Rentabilidad
            </span>
            <p className="text-sm sm:text-base font-black mt-0.5">
              {periodTotals.margen.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 4. MÓDULOS DEL SISTEMA Y ACCESOS DIRECTOS            */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {/* Módulo 1: Terminal POS */}
        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-stone-200/80 hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              {totalItems > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500 text-amber-950 text-xs font-bold animate-pulse">
                  {totalItems} en pedido
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
              Terminal POS & Caja
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Catálogo táctil para despacho de café, bebidas y alimentos con carrito interactivo y confirmación de cobro.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Punto de venta
            </span>
            <Link
              to="/sales"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors"
            >
              <span>Abrir Caja POS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Módulo 2: Catálogo & Inventario */}
        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-stone-200/80 hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {productCount} activos
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
              Catálogo & Existencias
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Gestión de productos, clasificación por tipo (Producto / Servicio), ajuste de precios y fotografías.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Inventario
            </span>
            <Link
              to="/inventory"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors"
            >
              <span>Gestionar Catálogo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Módulo 3: Kardex o Reportes (según rol) */}
        {userIsAdmin ? (
          <div className="group rounded-3xl bg-white p-6 shadow-sm border border-stone-200/80 hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  Admin
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
                Kardex & Reportes
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Trazabilidad completa con Costo Promedio Ponderado (CPP), auditoría de stock y reportes financieros en Excel/PDF.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Auditoría & Finanzas
              </span>
              <Link
                to="/reports"
                className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition-colors"
              >
                <span>Ver Reportes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="group rounded-3xl bg-gradient-to-tr from-stone-50 to-amber-50/40 p-6 shadow-sm border border-stone-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-800 text-amber-100 flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Operación
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-800">
                Turno en Curso
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Terminal autorizada para despacho ágil de órdenes y registro de tickets.
              </p>
            </div>

            <div className="pt-6 border-t border-amber-200/60 mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>Sesión activa</span>
              <span className="font-bold text-amber-900">{user.username}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// Icono auxiliar
function BarChart3Icon(props) {
  return <TrendingUp {...props} />;
}