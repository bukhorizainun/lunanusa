/**
 * Peta Visibilitas Hilal Global (Global Crescent Visibility Map)
 * Kriteria Yallop 1997 (q-test, best time) atas grid global. Data: /hilal-map
 * (DE440s). Render canvas equirectangular + graticule + kota + legenda.
 */

import { useState, useRef, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ZONE_COLOR = {
  A: "#2E9E5B", B: "#8BC34A", C: "#F4D03F", D: "#E67E22", E: "#C0392B", F: "#33455B",
};
const ZONE_LABEL = {
  A: "Mudah terlihat mata telanjang",
  B: "Terlihat dalam kondisi sempurna",
  C: "Perlu alat bantu menemukan, lalu bisa mata telanjang",
  D: "Hanya terlihat dengan alat optik",
  E: "Tak terlihat dengan teleskop (di bawah batas Danjon)",
  F: "Tak terlihat — Bulan belum/baru ijtimak",
};
const CITIES = [
  { n: "Jakarta", lat: -6.2, lon: 106.8 }, { n: "Mekkah", lat: 21.4, lon: 39.8 },
  { n: "Kairo", lat: 30.0, lon: 31.2 }, { n: "Istanbul", lat: 41.0, lon: 29.0 },
  { n: "London", lat: 51.5, lon: -0.1 }, { n: "New York", lat: 40.7, lon: -74.0 },
  { n: "Los Angeles", lat: 34.0, lon: -118.2 }, { n: "Karachi", lat: 24.9, lon: 67.0 },
  { n: "Cape Town", lat: -33.9, lon: 18.4 }, { n: "Sydney", lat: -33.9, lon: 151.2 },
  { n: "Tokyo", lat: 35.7, lon: 139.7 }, { n: "São Paulo", lat: -23.5, lon: -46.6 },
];

export default function HilalMap() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const canvasRef = useRef(null);

  const compute = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/hilal-map`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, grid_step: 5, lat_limit: 60 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Perhitungan gagal");
      }
      setResult(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Proyeksi: lon[-180,180]→x, lat[+L,-L]→y
  const proj = (lon, lat, W, H, L) => [(lon + 180) / 360 * W, (L - lat) / (2 * L) * H];

  useEffect(() => {
    if (!result) return;
    const cv = canvasRef.current;
    const L = result.lat_limit, step = result.grid_step;
    const W = 1080, H = Math.round(W * (2 * L) / 360);
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#0A1626"; ctx.fillRect(0, 0, W, H);

    // Sel visibilitas
    const cw = step / 360 * W + 1, ch = step / (2 * L) * H + 1;
    result.cells.forEach((c) => {
      const [x, y] = proj(c.lon, c.lat, W, H, L);
      ctx.fillStyle = ZONE_COLOR[c.zone] || "#33455B";
      ctx.fillRect(x - cw / 2, y - ch / 2, cw, ch);
    });

    // Graticule
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1; ctx.font = "11px monospace";
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = proj(lon, 0, W, H, L);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      if (lon > -180 && lon < 180) ctx.fillText(`${lon}°`, x + 2, H - 4);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = proj(0, lat, W, H, L);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillText(`${lat}°`, 3, y - 3);
    }
    // Ekuator tegas
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1.5;
    const [, ye] = proj(0, 0, W, H, L);
    ctx.beginPath(); ctx.moveTo(0, ye); ctx.lineTo(W, ye); ctx.stroke();

    // Kota
    CITIES.forEach((c) => {
      const [x, y] = proj(c.lon, c.lat, W, H, L);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "10px sans-serif";
      ctx.fillText(c.n, x + 4, y - 3);
    });
  }, [result]);

  const onMove = (e) => {
    if (!result) return;
    const cv = canvasRef.current, rect = cv.getBoundingClientRect();
    const L = result.lat_limit;
    const lon = (e.clientX - rect.left) / rect.width * 360 - 180;
    const lat = L - (e.clientY - rect.top) / rect.height * (2 * L);
    const step = result.grid_step;
    const cell = result.cells.find((c) => Math.abs(c.lat - lat) <= step / 2 && Math.abs(c.lon - lon) <= step / 2);
    setHover({ lat: lat.toFixed(1), lon: lon.toFixed(1), cell });
  };

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Peta Visibilitas Hilal</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Global Crescent Visibility
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Tanggal (malam dievaluasi)</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
          </div>
          <button onClick={compute} disabled={loading}
            className="px-6 py-3 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 transition-all rounded-sm">
            {loading ? "Menghitung grid global…" : "Hitung Peta"}
          </button>
          <p className="text-white/30 text-[11px] leading-snug max-w-md">
            Pilih tanggal sekitar awal bulan Hijriah (1 hari setelah ijtimak) agar peta hilal bermakna.
            Hitung pertama bisa ~20 dtk (cold start), berikutnya instan (cache).
          </p>
          {error && <div className="w-full bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">{error}</div>}
        </div>

        {result && !loading && (
          <>
            {/* Map */}
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-4 mb-5">
              <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
                className="w-full rounded-sm cursor-crosshair" style={{ imageRendering: "pixelated" }} />
              <div className="flex items-center justify-between mt-2 text-[11px] text-white/40 font-mono h-4">
                <span>Proyeksi equirectangular · grid {result.grid_step}° · ijtimak {result.conjunction_utc ? new Date(result.conjunction_utc + "Z").toUTCString().slice(5, 22) + " UTC" : "—"}</span>
                {hover?.cell && (
                  <span className="text-[#D4AF37]">
                    {hover.lat}°, {hover.lon}° · Zona {hover.cell.zone} · q={hover.cell.q} · ARCV={hover.cell.arcv}° · elong={hover.cell.elong}°
                  </span>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-3">Zona Yallop (q-test)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["A", "B", "C", "D", "E", "F"].map((z) => (
                  <div key={z} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-sm flex-shrink-0" style={{ background: ZONE_COLOR[z] }} />
                    <span className="text-white/70 text-xs"><b className="text-white/90">{z}</b> · {ZONE_LABEL[z]}</span>
                    <span className="text-white/30 text-[10px] ml-auto font-mono">{result.zone_counts?.[z] ?? 0}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/25 text-[10px] leading-relaxed mt-4 pt-3 border-t border-white/5">
                {result.meta?.note} Ephemeris: {result.meta?.ephemeris}. Arahkan kursor ke peta untuk nilai q/ARCV/elongasi per titik.
              </p>
            </div>
          </>
        )}

        {loading && (
          <div className="py-16 text-center text-white/30 text-xs tracking-[0.2em] uppercase">
            Menghitung visibilitas hilal sedunia (ephemeris NASA JPL)…
          </div>
        )}
        {!result && !loading && !error && (
          <div className="min-h-48 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12">
            <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Pilih tanggal lalu hitung peta visibilitas hilal global</p>
          </div>
        )}
      </div>
    </div>
  );
}
