/**
 * Qibla Page (Arah Kiblat)
 * Bearing great-circle ke Ka'bah + kompas visual + Rashdul Kiblat harian.
 */

import { useState } from "react";
import CitySelect from "../components/CitySelect";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Qibla() {
  const [form, setForm] = useState({
    latitude: -6.2,
    longitude: 106.8,
    elevation: 50,
    timezone: "Asia/Jakarta",
    date: new Date().toISOString().slice(0, 10),
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [city, setCity]       = useState(null);

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numeric = ["latitude", "longitude", "elevation"];
    setF({ [name]: numeric.includes(name) ? parseFloat(value) : value });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Browser tidak mendukung geolokasi."); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF({ latitude: +pos.coords.latitude.toFixed(4), longitude: +pos.coords.longitude.toFixed(4) });
        setCity(null);
        setGeoBusy(false);
      },
      () => { setError("Gagal membaca lokasi. Izinkan akses lokasi di browser."); setGeoBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/qibla`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Perhitungan gagal");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Arah Kiblat</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Qibla Direction
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Input ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-5">Lokasi Anda</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Cari Kota</label>
                  <CitySelect onSelect={(c) => { setF({ latitude: c.lat, longitude: c.lon, timezone: c.tz }); setCity(c); }} />
                  {city && <p className="text-[#5FBFBF]/70 text-[10px] mt-1.5 tracking-wider">{city.name}, {city.prov}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude (°)" name="latitude" type="number" step="0.0001" value={form.latitude} onChange={handleChange} />
                  <Field label="Longitude (°)" name="longitude" type="number" step="0.0001" value={form.longitude} onChange={handleChange} />
                </div>

                <button type="button" onClick={useMyLocation} disabled={geoBusy}
                  className="w-full py-2 border border-[#5FBFBF]/30 text-[#5FBFBF] text-[10px] tracking-[0.2em] uppercase hover:bg-[#5FBFBF]/10 disabled:opacity-50 transition-all rounded-sm">
                  {geoBusy ? "Mendeteksi…" : "📍 Gunakan Lokasi Saya"}
                </button>

                <Field label="Tanggal (untuk waktu bayangan kiblat)" name="date" type="date" value={form.date} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.25em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              {loading ? "Menghitung…" : "Hitung Arah Kiblat"}
            </button>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">{error}</div>
            )}
          </form>

          {/* ── Results ── */}
          <div className="lg:col-span-3 space-y-5">
            {!result && !loading && (
              <div className="h-full min-h-64 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12">
                <QiblaCompass bearing={295} dim />
                <p className="text-white/20 text-xs tracking-[0.2em] uppercase mt-4">Masukkan lokasi lalu hitung</p>
              </div>
            )}

            {result && (
              <>
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <QiblaCompass bearing={result.qibla_bearing_deg} />
                  <div className="space-y-4">
                    <div>
                      <div className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Azimut Kiblat (dari Utara sejati)</div>
                      <div className="text-[#D4AF37] text-4xl font-light font-mono">{result.qibla_bearing_deg?.toFixed(2)}°</div>
                      <div className="text-white/50 text-sm mt-1">{result.qibla_bearing_dms} · {result.compass_point}</div>
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <div className="text-white/30 text-[10px] tracking-wider uppercase mb-1">Jarak ke Ka'bah</div>
                      <div className="text-white/80 text-lg font-mono">{result.distance_km?.toLocaleString()} km</div>
                    </div>
                  </div>
                </div>

                {/* Cara pakai */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
                  <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-2">Cara Pakai Kompas</h3>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Arahkan tepi atas ponsel ke <span className="text-[#D4AF37]">Utara sejati</span> (bukan utara magnet),
                    lalu kiblat berada {result.qibla_bearing_deg?.toFixed(1)}° searah jarum jam dari Utara
                    ({result.compass_point}). Untuk akurasi tertinggi, gunakan metode bayangan di bawah.
                  </p>
                </div>

                {/* Rashdul Kiblat harian */}
                {(result.shadow_aligns_qibla || result.sun_in_qibla_direction) && (
                  <div className="bg-[#0D2035] border border-[#5FBFBF]/20 rounded-sm p-5">
                    <h3 className="text-[#5FBFBF]/80 text-xs tracking-[0.2em] uppercase mb-2">Bayangan Kiblat — {result.date}</h3>
                    <ShadowTimes
                      align={result.shadow_aligns_qibla}
                      anti={result.sun_in_qibla_direction}
                    />
                    <p className="text-white/25 text-[10px] leading-relaxed mt-3 pt-3 border-t border-white/5">
                      {result.note_shadow}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Kompas SVG ── */
function QiblaCompass({ bearing, dim = false }) {
  const cx = 130, cy = 130, r = 110;
  const rad = (bearing - 90) * Math.PI / 180; // 0°=Utara (atas)
  const nx = cx + (r - 18) * Math.cos(rad);
  const ny = cy + (r - 18) * Math.sin(rad);
  const op = dim ? 0.25 : 1;

  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[260px] mx-auto" style={{ opacity: op }}>
      {/* Dial */}
      <circle cx={cx} cy={cy} r={r} fill="#0B1C2D" stroke="#D4AF37" strokeOpacity="0.3" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r - 28} fill="none" stroke="#7EC8C8" strokeOpacity="0.12" strokeWidth="0.5" />

      {/* Tick marks tiap 30° */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
        const x2 = cx + (r - 8) * Math.cos(a), y2 = cy + (r - 8) * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7EC8C8" strokeOpacity="0.3" strokeWidth="0.8" />;
      })}

      {/* Arah mata angin */}
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([l, deg]) => {
        const a = (deg - 90) * Math.PI / 180;
        return (
          <text key={l} x={cx + (r - 16) * Math.cos(a)} y={cy + (r - 16) * Math.sin(a) + 4}
            textAnchor="middle" fontSize="13" fontFamily="monospace"
            fill={l === "N" ? "#D4AF37" : "#7EC8C8"} fillOpacity={l === "N" ? 0.9 : 0.5}>
            {l}
          </text>
        );
      })}

      {/* Jarum kiblat */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" />
      {/* Kepala panah + ikon Ka'bah */}
      <circle cx={nx} cy={ny} r={11} fill="#0B1C2D" stroke="#D4AF37" strokeWidth="1.5" />
      <rect x={nx - 5} y={ny - 5} width="10" height="10" rx="1" fill="#D4AF37" />
      <rect x={nx - 5} y={ny - 5} width="10" height="3" rx="1" fill="#0B1C2D" fillOpacity="0.5" />
      {/* Pusat */}
      <circle cx={cx} cy={cy} r={4} fill="#D4AF37" />

      {/* Label derajat */}
      {!dim && (
        <text x={cx} y={cy + r + 24} textAnchor="middle" fontSize="12" fontFamily="monospace" fill="#D4AF37" fillOpacity="0.7">
          {bearing?.toFixed(1)}° dari Utara
        </text>
      )}
    </svg>
  );
}

/* ── Sub-components ── */
function Field({ label, name, type, value, onChange, step }) {
  return (
    <div>
      <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">{label}</label>
      <input name={name} type={type} step={step} value={value} onChange={onChange}
        className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors font-mono" />
    </div>
  );
}

function ShadowTimes({ align, anti }) {
  const has = (arr) => Array.isArray(arr) && arr.length > 0;
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <span className="text-emerald-400 mt-0.5">●</span>
        <div>
          <span className="text-white/70">Bayangan menunjuk PERSIS ke kiblat: </span>
          {has(align)
            ? align.map((h) => <span key={h.time} className="text-emerald-400 font-mono mr-2">{h.time}</span>)
            : <span className="text-white/30">tidak ada hari ini (Matahari tak melewati arah berlawanan kiblat di atas ufuk)</span>}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-amber-400 mt-0.5">●</span>
        <div>
          <span className="text-white/70">Matahari tepat di arah kiblat (bayangan membelakangi): </span>
          {has(anti)
            ? anti.map((h) => <span key={h.time} className="text-amber-400 font-mono mr-2">{h.time}</span>)
            : <span className="text-white/30">tidak ada hari ini</span>}
        </div>
      </div>
    </div>
  );
}
