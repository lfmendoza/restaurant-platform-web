import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export default function RestaurantTypeahead({
  restaurants,
  value,
  onChange,
  placeholder = "Buscar restaurante...",
  allowEmpty = true,
  emptyLabel = "Todos los restaurantes",
  className = "",
}) {
  const selected = restaurants.find((r) => r._id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return restaurants;
    const q = query.toLowerCase();
    return restaurants.filter((r) => r.name.toLowerCase().includes(q));
  }, [restaurants, query]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [filtered]);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;

    function updatePos() {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        containerRef.current?.contains(e.target) ||
        listRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightIdx];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, open]);

  function handleSelect(id) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = filtered.length + (allowEmpty ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + totalItems) % totalItems);
        break;
      case "Enter":
        e.preventDefault();
        if (allowEmpty && highlightIdx === 0) {
          handleSelect("");
        } else {
          const idx = allowEmpty ? highlightIdx - 1 : highlightIdx;
          if (filtered[idx]) handleSelect(filtered[idx]._id);
        }
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        break;
    }
  }

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <ul
            ref={listRef}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
          >
            {allowEmpty && (
              <li
                className={`px-3 py-2 text-sm cursor-pointer ${
                  highlightIdx === 0
                    ? "bg-orange-50 text-orange-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHighlightIdx(0)}
                onClick={() => handleSelect("")}
              >
                {emptyLabel}
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Sin resultados
              </li>
            )}
            {filtered.map((r, i) => {
              const idx = allowEmpty ? i + 1 : i;
              return (
                <li
                  key={r._id}
                  className={`px-3 py-2 text-sm cursor-pointer truncate ${
                    idx === highlightIdx
                      ? "bg-orange-50 text-orange-700 font-medium"
                      : r._id === value
                      ? "bg-gray-50 font-medium text-gray-800"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onClick={() => handleSelect(r._id)}
                >
                  {r.name}
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className="input flex items-center gap-2 cursor-text"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            autoFocus
            className="flex-1 outline-none bg-transparent text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        ) : (
          <span
            className={`flex-1 text-sm truncate ${value ? "text-gray-900" : "text-gray-400"}`}
          >
            {selected?.name || emptyLabel}
          </span>
        )}
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {dropdown}
    </div>
  );
}
