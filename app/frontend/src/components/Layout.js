import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  Coffee, 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  BookOpen,
  TrendingUp,
  LogOut, 
  Menu, 
  X, 
  User, 
  Clock, 
  ChevronRight
} from "lucide-react";

import { logout, getUser, isAdmin } from "../auth";
import { useCart } from "../context/CartContext";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser() || { username: "Cajero" };
  const userIsAdmin = isAdmin();

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const allNavItems = [
    {
      label: "Inicio / Dashboard",
      path: "/home",
      icon: LayoutDashboard,
      description: "Resumen y accesos rápidos",
      adminOnly: false,
    },
    {
      label: "Terminal POS",
      path: "/sales",
      icon: ShoppingBag,
      description: "Punto de venta y caja",
      badge: totalItems > 0 ? `${totalItems}` : null,
      adminOnly: false,
    },
    {
      label: "Inventario",
      path: "/inventory",
      icon: Package,
      description: "Gestión de productos y stock",
      adminOnly: false,
    },
    {
      label: "Kardex de Stock",
      path: "/kardex",
      icon: BookOpen,
      description: "Trazabilidad y movimientos",
      adminOnly: true,
    },
    {
      label: "Reportes & Ventas",
      path: "/reports",
      icon: TrendingUp,
      description: "Métricas e historial financiero",
      adminOnly: true,
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || userIsAdmin);


  const formattedDate = currentTime.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const formattedTime = currentTime.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex h-screen w-full bg-[#FAF7F2] overflow-hidden font-sans">
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ========================================== */}
      {/* SIDEBAR                                    */}
      {/* ========================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-[#1A0F07] text-amber-50/90 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-amber-900/30">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#5F3B1A] to-amber-600 flex items-center justify-center shadow-lg shadow-amber-950/40 text-amber-100">
                <Coffee className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#1A0F07]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Gemelos Coffee
              </h1>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                Sistema POS
              </p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-1.5 text-amber-300 hover:bg-amber-900/30 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegación Principal */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-amber-400/50 mb-3">
            Módulos del Sistema
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) =>
                  `group relative flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-to-r from-amber-800/80 to-amber-900/90 text-white shadow-lg shadow-amber-950/40 border border-amber-600/30"
                      : "text-amber-100/70 hover:bg-amber-900/20 hover:text-white"
                  }`
                }
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`rounded-xl p-2 transition-colors ${
                      isActive
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-amber-950/60 text-amber-400 group-hover:bg-amber-900/40 group-hover:text-amber-200"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block font-semibold leading-tight text-[13px]">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-amber-400/60 leading-tight">
                      {item.description}
                    </span>
                  </div>
                </div>

                {item.badge ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-amber-950 shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-4 h-4 opacity-0 transition-opacity group-hover:opacity-100 ${
                      isActive ? "opacity-100 text-amber-300" : "text-amber-500/50"
                    }`}
                  />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Tarjeta de Usuario / Sesión en el Footer */}
        <div className="p-4 border-t border-amber-900/30 bg-[#120A04]">
          <div className="flex items-center justify-between rounded-2xl bg-amber-950/40 p-3 border border-amber-900/30">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
                userIsAdmin
                  ? "bg-amber-600 text-amber-50 border-amber-400/50 shadow-md shadow-amber-950/40"
                  : "bg-amber-800/60 text-amber-200 border-amber-700/40"
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user.username}
                </p>
                {userIsAdmin ? (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Administrador
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Cajero / Caja
                  </p>
                )}
              </div>
            </div>


            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="rounded-xl p-2 text-amber-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* ÁREA DE CONTENIDO PRINCIPAL (FULL WIDTH)   */}
      {/* ========================================== */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar Superior */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-white/90 backdrop-blur-md px-4 sm:px-8 border-b border-amber-900/10 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Caja Activa · Sucursal Central</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Reloj en Vivo */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-stone-100/90 px-3.5 py-1.5 rounded-xl border border-stone-200/70">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-800">{formattedTime}</span>
            </div>

            {/* Acceso rápido a Terminal POS si hay ítems */}
            {totalItems > 0 && location.pathname !== "/sales" && (
              <NavLink
                to="/sales"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-amber-800 hover:to-amber-900 transition-all animate-fade-in"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Pedido ({totalItems})</span>
              </NavLink>
            )}

            {/* Botón rápido de Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Vista dinámica / Página fluida 100% de ancho */}
        <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          <div className="w-full min-h-full flex flex-col flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

