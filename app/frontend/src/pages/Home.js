import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Package, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { getUser } from "../auth";
import { useCart } from "../context/CartContext";
import axiosInstance from "../axiosConfig";

export default function Home() {
  const [productCount, setProductCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  const { totalItems } = useCart();
  const user = getUser() || { username: "Cajero" };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prodRes, salesRes] = await Promise.all([
          axiosInstance.get("products/"),
          axiosInstance.get("sales/"),
        ]);
        setProductCount(prodRes.data.length);
        setSalesCount(salesRes.data.length);
      } catch (err) {
        console.error("Error al cargar métricas de inicio:", err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      
      {/* ==================================================== */}
      {/* HERO BANNER DE BIENVENIDA                            */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2A1708] via-[#5F3B1A] to-amber-800 p-6 sm:p-10 text-white shadow-2xl border border-amber-900/20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[50%] -right-[20%] h-[120%] w-[60%] rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="absolute -bottom-[50%] -left-[20%] h-[120%] w-[60%] rounded-full bg-orange-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Sistema Punto de Venta & Caja</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-amber-50">
              ¡Bienvenido, {user.username}!
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed">
              Terminal activa de <strong>Gemelos Coffee</strong>. Administra ventas en tiempo real, controla el inventario y despacha órdenes de forma rápida y segura.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link
              to="/sales"
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 px-6 py-3.5 text-xs sm:text-sm font-bold shadow-lg shadow-amber-950/30 active:scale-[0.99] transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Abrir Terminal POS</span>
            </Link>

            <Link
              to="/inventory"
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white px-5 py-3.5 text-xs sm:text-sm font-bold border border-white/15 backdrop-blur-sm active:scale-[0.99] transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Ver Inventario</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TARJETAS DE ACCESO RÁPIDO Y MÉTRICAS                 */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Tarjeta 1: Terminal de Ventas */}
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
              Terminal POS & Ventas
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Catálogo visual de bebidas, café y alimentos con carrito interactivo y cobro inmediato.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {salesCount} ventas registradas
            </span>
            <Link
              to="/sales"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950"
            >
              <span>Ir a Ventas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Tarjeta 2: Catálogo de Inventario */}
        <div className="group rounded-3xl bg-white p-6 shadow-sm border border-stone-200/80 hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between">

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {productCount} ítems
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
              Catálogo de Inventario
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Control de existencias, ajuste de precios, fotografías y adición de nuevos productos.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {productCount} activos en carta
            </span>
            <Link
              to="/inventory"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950"
            >
              <span>Gestionar Stock</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Tarjeta 3: Estado de la Caja / Sesión */}
        <div className="rounded-3xl bg-gradient-to-tr from-[#FAF6F0] to-[#F5EBE1] p-6 shadow-sm border border-amber-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-800 text-amber-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                En Línea
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-800">
              Sesión de Caja
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Operador conectado: <strong className="text-amber-900">{user.username}</strong>
            </p>
          </div>

          <div className="pt-6 border-t border-amber-200/60 mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Timeout de inactividad:</span>
            <span className="font-semibold text-slate-800">30 min</span>
          </div>
        </div>
      </div>

    </div>
  );
}