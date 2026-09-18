import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  X, 
  Check, 
  Package, 
  Coffee, 
  Layers
} from "lucide-react";

/**
 * ProductCombobox: Selector de productos reactivo con búsqueda en vivo,
 * visualización de stock/categoría/precios, click-outside detection y limpieza rápida.
 * Soporta modo formulario (requerido / selección obligatoria) y modo filtro (con opción "Todos").
 */
export default function ProductCombobox({
  products = [],
  value = "",
  onChange = () => {},
  placeholder = "Buscar producto por nombre o categoría...",
  required = false,
  disabled = false,
  label = "",
  helperText = "",
  theme = "amber", // "amber" | "emerald"
  allowClear = true,
  allOptionLabel = "", // Ej: "Todos los productos físicos" (para usar como filtro)
  size = "normal", // "normal" | "compact"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const isAllSelected = allOptionLabel && (value === "all" || value === "");

  // Producto actualmente seleccionado
  const selectedProduct = useMemo(() => {
    if (isAllSelected) return null;
    return products.find((p) => String(p.id) === String(value)) || null;
  }, [products, value, isAllSelected]);

  // Filtrado reactivo en tiempo real
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const nameMatch = (p.name || "").toLowerCase().includes(term);
      const catMatch = (p.category || "").toLowerCase().includes(term);
      const idMatch = String(p.id).includes(term);
      const typeMatch = (p.item_type || "").toLowerCase().includes(term);
      return nameMatch || catMatch || idMatch || typeMatch;
    });
  }, [products, searchTerm]);

  // Click-outside listener para cerrar el popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Autofoco en el input de búsqueda al abrir el dropdown
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Manejar selección de un ítem
  const handleSelect = (product) => {
    if (product === "all") {
      onChange("all", null);
    } else {
      onChange(String(product.id), product);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  // Limpiar selección actual
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(allOptionLabel ? "all" : "", null);
    setSearchTerm("");
  };

  // Color de acento según tema
  const isEmerald = theme === "emerald";
  const focusRing = isEmerald ? "focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20" : "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20";
  const activeBg = isEmerald ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950";
  const activeBadge = isEmerald ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-900 border-amber-200";

  const paddingClasses = size === "compact" ? "py-2 px-3 text-xs" : "py-2.5 px-3.5 sm:px-4 text-sm";

  return (
    <div className="relative w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {label} {required && <span className="text-amber-800">*</span>}
        </label>
      )}

      {/* Botón / Input Disparador Principal */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full rounded-2xl bg-stone-50 border border-stone-200/90 ${paddingClasses} font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs select-none ${focusRing} ${
          disabled ? "opacity-50 cursor-not-allowed bg-stone-100" : "hover:border-stone-400"
        } ${isOpen ? (isEmerald ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-white" : "border-amber-600 ring-2 ring-amber-500/20 bg-white") : ""}`}
      >
        {isAllSelected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`p-1.5 rounded-xl shrink-0 ${isEmerald ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
              {allOptionLabel}
            </span>
          </div>
        ) : selectedProduct ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`p-1.5 rounded-xl shrink-0 ${isEmerald ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              <Coffee className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate leading-tight">
                {selectedProduct.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-500">
                <span className="truncate">{selectedProduct.category || "General"}</span>
                <span>•</span>
                <span className="font-bold text-slate-700">
                  Stock: {selectedProduct.stock} uds
                </span>
                {selectedProduct.cost_price !== undefined && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600 font-semibold">
                      CPP: C$ {parseFloat(selectedProduct.cost_price || 0).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm font-normal flex-1 truncate">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{placeholder}</span>
          </div>
        )}

        {/* Acciones del Disparador: Limpiar o Desplegar */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {(selectedProduct || (!isAllSelected && allOptionLabel)) && allowClear && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar selección"
              className="p-1 rounded-lg hover:bg-stone-200/80 hover:text-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-amber-800" : "text-slate-400"
            }`}
          />
        </div>
      </div>

      {/* Input oculto para validación required */}
      {required && (
        <input
          type="text"
          value={value || ""}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {helperText && (
        <p className="text-[10px] text-slate-400">{helperText}</p>
      )}

      {/* ==================================================== */}
      {/* MENÚ FLOTANTE / POPOVER DESPLEGABLE CON BÚSQUEDA     */}
      {/* ==================================================== */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-stone-200 p-3 space-y-2 animate-fade-in backdrop-blur-md">
          {/* Campo de búsqueda interactivo */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-800" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe el nombre o categoría..."
              className="w-full rounded-2xl bg-stone-50 border border-stone-200 py-2 pl-10 pr-9 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de Resultados Scrolleable */}
          <div className="max-h-56 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            
            {/* Opción 'Todos' si es un filtro */}
            {allOptionLabel && !searchTerm && (
              <div
                onClick={() => handleSelect("all")}
                className={`p-2.5 rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-all ${
                  isAllSelected ? `${activeBg} font-bold shadow-xs border border-amber-300/60` : "hover:bg-stone-50 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-xl ${isAllSelected ? activeBadge : "bg-stone-100 text-stone-600"}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                    {allOptionLabel}
                  </span>
                </div>
                {isAllSelected && <Check className="w-4 h-4 text-amber-800 shrink-0" />}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <Coffee className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs font-bold text-slate-600">
                  No se encontraron productos coincidentes
                </p>
                <p className="text-[11px] text-slate-400">
                  Verifica el nombre o categoría ingresada.
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = String(product.id) === String(value);
                const stockVal = parseInt(product.stock, 10) || 0;
                const costVal = parseFloat(product.cost_price || 0);
                const priceVal = parseFloat(product.price || 0);
                const isService = product.item_type === "SERVICE";

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    className={`p-2.5 sm:p-3 rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? `${activeBg} font-bold shadow-xs border border-amber-300/60`
                        : "hover:bg-stone-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? activeBadge : "bg-stone-100 text-stone-600"}`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {product.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                          <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                            {product.category || "General"}
                          </span>
                          <span>•</span>
                          <span>CPP: C$ {costVal.toFixed(2)}</span>
                          <span>•</span>
                          <span>Venta: C$ {priceVal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Badges de Existencias / Tipo */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isService ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Servicio
                        </span>
                      ) : stockVal <= 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          0 uds (Agotado)
                        </span>
                      ) : stockVal <= 5 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {stockVal} uds (Bajo)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {stockVal} uds
                        </span>
                      )}

                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-800 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
