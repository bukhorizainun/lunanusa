/**
 * Comparison Table Page
 * Side-by-side comparison of all 5 Hilal calculation methods.
 */

import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const METHODS = [
  { key: "sullam_an_nayyirain", label: "Sullam an-Nayyirain",     type: "Taqribi",      category: "taqribi" },
  { key: "fath_al_rauf",        label: "Fath al-Rauf al-Mannan",  type: "Taqribi",      category: "taqribi" },
  { key: "irsyad_al_murid",     label: "Irsyad al-Murid",         type: "Kontemporer",  category: "taqribi" },
  { key: "muhammadiyah",        label: "Muhammadiyah (Wujudul Hilal)", type: "Modern",  category: "wujud" },
  { key: "mabims",              label: "MABIMS (Imkan Rukyat)",   type: "Modern",       category: "rukyat" },
];

export default function Comparison() {
  const [dates, setDates]   = useState([new Date().toISOString().slice(0, 10)]);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [lat, setLat]       = useState(-6.2);
  const [lon, setLon]       = useState(106.8);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const addDate = () => {
    if (!dates.includes(newDate)) setDates(d => [...d, newDate].sort());
  };

  const runComparison = async () => {
    setLoading(true);
    const out = {};
    for (const date of dates) {
      try {
        const res = await fetch(`${API_URL}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, latitude: lat, longitude: lon, elevation: 50, timezone: "Asia/Jakarta" }),
        });
        if (res.ok) out[date] = await res.json();
      } catch {}
    }
    setResults(out);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Muqaranah al-Manahij</h2>
            <h1 className="text-white text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Method Comparison Table
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-1.5">Add Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono"
              />
              <button onClick={addDate} className="px-3 py-2 border border-[#D4AF37]/30 text-[#D4AF37]/70 text-xs hover:bg-[#D4AF37]/10 transition-all rounded-sm">
                + Add
              </button>
            </div>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-1.5">Lat / Lon</label>
            <div className="flex gap-2">
              <input type="number" value={lat} onChange={e => setLat(+e.target.value)} step="0.01"
                className="w-24 bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
              <input type="number" value={lon} onChange={e => setLon(+e.target.value)} step="0.01"
                className="w-24 bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
            </div>
          </div>
          <button
            onClick={runComparison}
            disabled={loading}
            className="px-6 py-2.5 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 transition-all rounded-sm"
          >
            {loading ? "Computing…" : "Run Comparison"}
          </button>

          {/* Active dates */}
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {dates.map(d => (
              <div key={d} className="flex items-center gap-1.5 bg-[#0B1C2D] border border-white/10 px-2.5 py-1 rounded-sm">
                <span className="text-white/60 text-xs font-mono">{d}</span>
                <button onClick={() => setDates(prev => prev.filter(x => x !== d))} className="text-white/20 hover:text-red-400 text-xs transition-colors">×</button>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        {Object.keys(results).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-[#0D2035] border border-[#D4AF37]/10 px-4 py-3 text-left text-[10px] tracking-[0.2em] text-[#D4AF37]/60 uppercase font-normal w-56">
                    Method
                  </th>
                  {dates.filter(d => results[d]).map(d => (
                    <th key={d} colSpan={4} className="bg-[#0D2035] border border-[#D4AF37]/10 px-4 py-3 text-center text-[10px] tracking-[0.15em] text-white/50 uppercase font-normal">
                      {d}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="bg-[#071524] border border-[#D4AF37]/10 px-4 py-2" />
                  {dates.filter(d => results[d]).map(d => (
                    <>
                      <th key={`${d}-alt`} className="bg-[#071524] border border-[#D4AF37]/10 px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-normal text-right">
                        Altitude
                      </th>
                      <th key={`${d}-elo`} className="bg-[#071524] border border-[#D4AF37]/10 px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-normal text-right">
                        Elongation
                      </th>
                      <th key={`${d}-ijt`} className="bg-[#071524] border border-[#D4AF37]/10 px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-normal text-center">
                        Ijtima ≺ Sunset
                      </th>
                      <th key={`${d}-dec`} className="bg-[#071524] border border-[#D4AF37]/10 px-3 py-2 text-[10px] text-white/30 uppercase tracking-wider font-normal text-center">
                        Decision
                      </th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METHODS.map((m, mi) => (
                  <tr key={m.key} className={mi % 2 === 0 ? "bg-[#0D2035]" : "bg-[#0B1C2D]"}>
                    <td className="border border-white/5 px-4 py-3">
                      <div className="text-white/80 text-sm">{m.label}</div>
                      <div className={`text-[10px] tracking-wider mt-0.5 ${m.type === "Taqribi" ? "text-amber-400/50" : m.type === "Kontemporer" ? "text-purple-400/50" : "text-teal-400/50"}`}>
                        {m.type}
                      </div>
                    </td>
                    {dates.filter(d => results[d]).map(d => {
                      const r = results[d];
                      const isModern = m.category === "wujud" || m.category === "rukyat";
                      const alt = isModern ? r.astronomical_data?.moon_altitude_apparent : r.classical_results?.[m.key]?.altitude;
                      const elo = r.astronomical_data?.elongation;
                      const ijtima = r.astronomical_data?.conjunction_before_sunset;
                      const decision = isModern ? r.decisions?.[m.key]?.visible ?? r.decisions?.[m.key] : null;
                      const altOk = m.key === "mabims" ? alt >= 3 : m.key === "muhammadiyah" ? alt > 0 : alt > 0;

                      return (
                        <>
                          <td key={`${d}-alt`} className={`border border-white/5 px-3 py-3 text-right font-mono text-sm ${altOk ? "text-emerald-400" : "text-red-400/70"}`}>
                            {alt != null ? `${alt.toFixed(3)}°` : "—"}
                          </td>
                          <td key={`${d}-elo`} className={`border border-white/5 px-3 py-3 text-right font-mono text-sm ${elo >= 6.4 ? "text-emerald-400" : "text-amber-400/70"}`}>
                            {elo != null ? `${elo.toFixed(3)}°` : "—"}
                          </td>
                          <td key={`${d}-ijt`} className={`border border-white/5 px-3 py-3 text-center text-xs ${ijtima ? "text-emerald-400" : "text-red-400/70"}`}>
                            {ijtima != null ? (ijtima ? "✓ Yes" : "✗ No") : "—"}
                          </td>
                          <td key={`${d}-dec`} className="border border-white/5 px-3 py-3 text-center">
                            {isModern && decision != null ? (
                              <span className={`
                                text-[10px] tracking-wider px-2 py-0.5 rounded-sm
                                ${decision
                                  ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-900/30 text-red-400 border border-red-500/20"
                                }
                              `}>
                                {decision ? "VISIBLE" : "NOT VIS."}
                              </span>
                            ) : <span className="text-white/20 text-xs">—</span>}
                          </td>
                        </>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Object.keys(results).length === 0 && (
          <div className="border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-16 text-center">
            <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Add dates and run comparison</p>
          </div>
        )}
      </div>
    </div>
  );
}
