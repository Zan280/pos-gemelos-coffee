import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, isAuthenticated } from "../auth";
import { useToast } from "../context/ToastContext";
import { User, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";

const Login = () => {
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Ruta previa para redirigir tras autenticación exitosa
  const from = location.state?.from?.pathname || "/home";

  // Si ya está autenticado, redirigir automáticamente
  useEffect(() => {
    if (isAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      const msg = "Por favor, ingresa tu usuario y contraseña.";
      setErrorMsg(msg);
      showToast(msg, "warning");
      return;
    }

    setLoading(true);

    try {
      await login(trimmedUsername, password);
      showToast(`¡Bienvenido a Gemelos Coffee, ${trimmedUsername}!`, "success");
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      let msg = "Ocurrió un error inesperado. Intenta de nuevo.";
      if (error.response && error.response.data) {
        const data = error.response.data;
        msg = data.detail || data.error || "Credenciales inválidas. Verifica tu usuario y contraseña.";
      } else if (error.request) {
        msg = "No se pudo contactar al servidor. Verifica que el backend esté en ejecución.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#FAF7F2] px-4 py-12 transition-colors duration-300 overflow-hidden font-sans">
      {/* Fondo con halos decorativos de café y ámbar cálido */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[15%] h-[75%] w-[55%] rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="absolute -bottom-[30%] -right-[15%] h-[75%] w-[55%] rounded-full bg-amber-800/10 blur-[130px]" />
        <div className="absolute top-[40%] left-[35%] h-[40%] w-[30%] rounded-full bg-orange-300/15 blur-[100px]" />
      </div>

      {/* Tarjeta de Login Principal */}
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="glass-card bg-white/95 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-300 border border-amber-900/10">

          
          {/* Encabezado e Identidad de Marca */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/80 p-2.5 shadow-xl shadow-amber-950/15 border border-amber-200/80 flex items-center justify-center transform hover:scale-105 transition-all duration-300">
                <img
                  src={`${process.env.PUBLIC_URL || ""}/logo.png`}
                  alt="Gemelos Coffee Logo"
                  className="h-full w-full object-contain filter drop-shadow-sm"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A1708]">
              Gemelos Coffee
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mt-1">
              Punto de Venta & Inventario
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-medium text-amber-900">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>Acceso Exclusivo para Personal</span>
            </div>
          </div>

          {/* Alerta de Error Elegante */}
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200/80 p-4 text-xs sm:text-sm text-red-800 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-snug">
                <span className="font-semibold block mb-0.5">Error de autenticación</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Formulario de Login */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo Usuario */}
            <div>
              <label 
                htmlFor="username" 
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 w-5 h-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  disabled={loading}
                  required
                  className="w-full rounded-2xl bg-white/90 border border-slate-200/90 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 w-5 h-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="w-full rounded-2xl bg-white/90 border border-slate-200/90 py-3.5 pl-11 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-lg transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de Inicio de Sesión */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-[#5F3B1A] via-[#7E532D] to-amber-700 py-3.5 px-4 font-semibold text-white shadow-lg shadow-amber-900/25 hover:from-[#43260F] hover:to-[#5F3B1A] hover:shadow-amber-900/35 focus:outline-none focus:ring-2 focus:ring-amber-600/40 active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          {/* Pie de la tarjeta */}
          <div className="mt-8 pt-6 border-t border-amber-900/10 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Gemelos Coffee POS © {new Date().getFullYear()} · Terminal de Caja
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
