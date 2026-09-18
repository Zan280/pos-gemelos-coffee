import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Componente Reutilizable de Paginación para tablas de datos (POS Gemelos Coffee).
 * Soporta navegación por botones anterior/siguiente, selección numérica de página
 * y desglose del rango de registros mostrados.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange = () => {},
  itemName = "registros",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar array de páginas visibles
  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200/80 text-xs text-slate-600 select-none">
      {/* Indicador de Rango */}
      <div className="font-medium text-slate-500 text-center sm:text-left">
        Mostrando <strong className="text-slate-800 font-bold">{startItem}</strong> -{" "}
        <strong className="text-slate-800 font-bold">{endItem}</strong> de{" "}
        <strong className="text-slate-800 font-bold">{totalItems}</strong> {itemName}
      </div>

      {/* Controles de Navegación */}
      <div className="flex items-center gap-1.5">
        {/* Botón Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition-all shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números de Página */}
        <div className="flex items-center gap-1">
          {visiblePages[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className="w-8 h-8 rounded-xl font-bold transition-all text-slate-600 hover:bg-stone-100"
              >
                1
              </button>
              {visiblePages[0] > 2 && <span className="px-1 text-slate-400">...</span>}
            </>
          )}

          {visiblePages.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-xl font-bold transition-all text-xs flex items-center justify-center ${
                page === currentPage
                  ? "bg-[#2A1708] text-white shadow-sm"
                  : "text-slate-700 hover:bg-amber-100/60 hover:text-amber-950"
              }`}
            >
              {page}
            </button>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="px-1 text-slate-400">...</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-xl font-bold transition-all text-slate-600 hover:bg-stone-100"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Botón Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 transition-all shadow-2xs"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
