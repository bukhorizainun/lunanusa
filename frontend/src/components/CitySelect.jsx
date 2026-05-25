/**
 * CitySelect — pencari kota Indonesia (combobox).
 * Ketik nama kota/provinsi → pilih → onSelect({lat, lon, tz, name}).
 */

import { useState, useRef, useEffect } from "react";
import { searchCities } from "../data/cities";

const TZ_LABEL = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

export default function CitySelect({ onSelect, placeholder = "Cari kota… (mis. Bandung)" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const matches = searchCities(query, 40);

  // Tutup saat klik di luar
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (c) => {
    onSelect(c);
    setQuery(`${c.name}`);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (matches[active]) choose(matches[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-[#0D2035] border border-[#D4AF37]/20 rounded-sm shadow-xl">
          {matches.map((c, i) => (
            <li key={`${c.name}-${c.prov}`}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                  i === active ? "bg-[#D4AF37]/10" : "hover:bg-white/5"
                }`}
              >
                <span className="text-white/80 text-sm">
                  {c.name}
                  {c.cap && <span className="text-[#D4AF37]/60 text-[9px] ml-1.5 align-middle">★</span>}
                  <span className="text-white/30 text-[10px] ml-2">{c.prov}</span>
                </span>
                <span className="text-[#5FBFBF]/70 text-[10px] font-mono shrink-0">{TZ_LABEL[c.tz] || ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
