import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const renderIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  const getToastStyles = (type) => {
    switch (type) {
      case "success":
        return "bg-white/95 border-emerald-500/30 text-slate-800 shadow-emerald-950/10";
      case "error":
        return "bg-white/95 border-rose-500/30 text-slate-800 shadow-rose-950/10";
      case "warning":
        return "bg-white/95 border-amber-500/40 text-slate-800 shadow-amber-950/10";
      case "info":
      default:
        return "bg-white/95 border-blue-500/30 text-slate-800 shadow-blue-950/10";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Contenedor flotante de Toasts */}
      <div 
        aria-live="polite" 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-fade-in ${getToastStyles(
              toast.type
            )}`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">{renderIcon(toast.type)}</div>
              <div className="text-xs font-semibold leading-snug break-words">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-stone-100"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
};
