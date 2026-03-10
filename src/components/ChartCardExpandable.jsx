import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ChartCardExpandable({ title, children, expandedContent, className = "" }) {
  const [expanded, setExpanded] = useState(false);
  const content = expandedContent ?? children;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <>
      <div className={`card p-4 relative ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Ver en pantalla completa"
            aria-label="Expandir gráfico"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </div>
        {children}
      </div>

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setExpanded(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Gráfico ampliado: ${title}`}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b shrink-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="btn-secondary btn-sm flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
              <div className="flex-1 min-h-0 p-4 overflow-auto">
                <div className="h-full min-h-[400px] w-full">
                  {content}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
