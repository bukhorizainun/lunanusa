/**
 * Hijri Calendar Page (Kalender Hijriah Otomatis)
 * Konversi tabular (Kuwaiti) + awal bulan dikoreksi astronomis via ijtimak
 * (NASA JPL) & kriteria visibilitas hilal (MABIMS / Wujudul Hilal) — backend.
 */

import { useState, useEffect, useCallback } from "react";
import Logo from "../components/Logo";
import CitySelect from "../components/CitySelect";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const WEEKDAYS = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir",
  "Rajab", "Syaban", "Ramadhan", "Syawal", "Zulkaidah", "Zulhijah",
];
const CRITERIA = [
  { key: "MABIMS",       label: "MABIMS 2021 (irtifa ≥3°, elongasi ≥6,4°)" },
  { key: "Muhammadiyah", label: "Wujudul Hilal (Muhammadiyah)" },
  { key: "Tabular",      label: "Tabular / Hisab Urfi (aritmetika)" },
];

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                   "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtGreg = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MONTHS_ID[parseInt(m, 10) - 1]} ${y}`;
};

export default function HijriCalendar() {
  const [loc, setLoc] = useState({ latitude: -6.2, longitude: 106.8, elevation: 50, timezone: "Asia/Jakarta" });
  const [selectedCity, setSelectedCity] = useState(null);
  const [criterion, setCriterion] = useState("MABIMS");
  const [hy, setHy] = useState(null);
  const [hm, setHm] = useState(null);

  const [cal, setCal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Konverter mini
  const [convDate, setConvDate] = useState(new Date().toISOString().slice(0, 10));
  const [convResult, setConvResult] = useState(null);

  // Bootstrap: tentukan bulan Hijriah hari ini
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/hijri-convert`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction: "g2h", date: new Date().toISOString().slice(0, 10) }),
        });
        const j = await res.json();
        setHy(j.hijri.year); setHm(j.hijri.month);
        setConvResult(j);
      } catch {
        setHy(1447); setHm(9);  // fallback
      }
    })();
  }, []);

  const loadCalendar = useCallback(async () => {
    if (!hy || !hm) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/hijri-calendar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hijri_year: hy, hijri_month: hm, criterion, ...loc }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Gagal memuat kalender");
      }
      setCal(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hy, hm, criterion, loc]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const shift = (delta) => {
    let m = hm + delta, y = hy;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setHy(y); setHm(m);
  };

  const convert = async () => {
    try {
      const res = await fetch(`${API_URL}/hijri-convert`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "g2h", date: convDate }),
      });
      setConvResult(await res.json());
    } catch (err) { setError(err.message); }
  };

  // Grid: sel kosong sebelum hari-1 sesuai weekday awal bulan
  const lead = cal ? cal.start_weekday_index : 0;
  const cells = cal ? [...Array(lead).fill(null), ...cal.days] : [];

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Kalender Hijriah</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Hijri Calendar
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Controls ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6 space-y-4">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase">Parameter</h3>

              <div>
                <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Lokasi (untuk rukyat)</label>
                <CitySelect onSelect={(c) => { setLoc((l) => ({ ...l, latitude: c.lat, longitude: c.lon, timezone: c.tz })); setSelectedCity(c); }} />
                {selectedCity && (
                  <p className="text-[#5FBFBF]/70 text-[10px] mt-1.5 tracking-wider">{selectedCity.name}, {selectedCity.prov}</p>
                )}
              </div>

              <div>
                <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Kriteria Awal Bulan</label>
                <select value={criterion} onChange={(e) => setCriterion(e.target.value)}
                  className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors">
                  {CRITERIA.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Konverter */}
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6 space-y-4">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase">Konversi Tanggal</h3>
              <div className="flex gap-2">
                <input type="date" value={convDate} onChange={(e) => setConvDate(e.target.value)}
                  className="flex-1 bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
                <button onClick={convert}
                  className="px-4 bg-[#5FBFBF]/15 border border-[#5FBFBF]/30 text-[#5FBFBF] text-[10px] tracking-[0.15em] uppercase hover:bg-[#5FBFBF]/25 transition-all rounded-sm">
                  → Hijriah
                </button>
              </div>
              {convResult && (
                <div className="bg-[#0B1C2D] rounded-sm px-4 py-3 border border-[#D4AF37]/10">
                  <div className="text-white text-lg font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    {convResult.hijri.formatted || `${convResult.hijri.day} ${convResult.hijri.month_name} ${convResult.hijri.year} H`}
                  </div>
                  <div className="text-white/40 text-[11px] tracking-wider mt-0.5">{convResult.weekday} · {fmtGreg(convResult.gregorian)}</div>
                </div>
              )}
              <p className="text-white/25 text-[10px] leading-relaxed">
                Konversi memakai kalender Hijriah tabular (sipil). Penentuan awal bulan rukyat dapat berbeda ±1 hari.
              </p>
            </div>
          </div>

          {/* ── Calendar ── */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">

              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => shift(-1)} disabled={!hy}
                  className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 rounded-sm transition-all disabled:opacity-30">‹</button>
                <div className="text-center">
                  <div className="text-white text-xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    {hm ? HIJRI_MONTHS[hm - 1] : "…"} {hy || ""} H
                  </div>
                  {cal && (
                    <div className="text-white/30 text-[10px] tracking-wider mt-0.5">
                      {fmtGreg(cal.days[0].gregorian)} – {fmtGreg(cal.days[cal.days.length - 1].gregorian)}
                    </div>
                  )}
                </div>
                <button onClick={() => shift(1)} disabled={!hy}
                  className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 rounded-sm transition-all disabled:opacity-30">›</button>
              </div>

              {loading && (
                <div className="py-16 text-center text-white/30 text-xs tracking-[0.2em] uppercase">
                  Menghitung awal bulan (ijtimak + hilal)…
                </div>
              )}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">{error}</div>
              )}

              {cal && !loading && (
                <>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {WEEKDAYS.map((w) => (
                      <div key={w} className="text-center text-[#D4AF37]/40 text-[9px] tracking-[0.1em] uppercase py-1">{w.slice(0, 3)}</div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((c, i) => c === null ? (
                      <div key={`b${i}`} className="aspect-square" />
                    ) : (
                      <div key={c.hijri_day}
                        className={`aspect-square rounded-sm border flex flex-col items-center justify-center p-0.5
                          ${c.is_today
                            ? "border-[#D4AF37] bg-[#D4AF37]/15 shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                            : "border-white/8 bg-[#0B1C2D] hover:border-[#D4AF37]/25"} transition-all`}>
                        <span className={`text-base font-light tabular-nums ${c.is_today ? "text-[#D4AF37]" : "text-white/85"}`}>{c.hijri_day}</span>
                        <span className="text-white/30 text-[8px] leading-none mt-0.5">{fmtGreg(c.gregorian).replace(/ \d{4}$/, "")}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ringkasan awal bulan */}
            {cal && !loading && (
              <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
                <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-3">Penentuan Awal Bulan</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DataCell label="Kriteria" value={cal.criterion} />
                  <DataCell label={`1 ${cal.month_name}`} value={fmtGreg(cal.start_gregorian)} highlight />
                  <DataCell label="Tabular (urfi)" value={fmtGreg(cal.tabular_gregorian)} />
                  <DataCell label="Selisih vs tabular" value={`${cal.delta_days_vs_tabular > 0 ? "+" : ""}${cal.delta_days_vs_tabular} hari`} />
                  <DataCell label="Jumlah hari" value={`${cal.days_in_month} hari`} />
                  {cal.hilal_at_start && (
                    <>
                      <DataCell label="Irtifa' hilal" value={`${cal.hilal_at_start.moon_altitude?.toFixed(2)}°`} />
                      <DataCell label="Elongasi" value={`${cal.hilal_at_start.elongation?.toFixed(2)}°`} />
                    </>
                  )}
                </div>
                {cal.hilal_at_start?.reason && (
                  <p className="text-white/30 text-[10px] leading-relaxed mt-3 pt-3 border-t border-white/5">
                    Rukyat awal bulan: {cal.hilal_at_start.reason}.
                  </p>
                )}
                <p className="text-white/25 text-[10px] leading-relaxed mt-2">
                  {cal.meta?.note} Ephemeris: {cal.meta?.ephemeris}.
                </p>
              </div>
            )}

            {!cal && !loading && !error && (
              <div className="min-h-48 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12">
                <Logo size="medium" showText={false} className="mb-4 opacity-30" />
                <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Memuat kalender…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DataCell({ label, value, highlight }) {
  return (
    <div className={`rounded-sm px-3 py-2.5 ${highlight ? "bg-[#D4AF37]/[0.06] border border-[#D4AF37]/20" : "bg-[#0B1C2D]"}`}>
      <div className="text-white/30 text-[10px] tracking-wider uppercase mb-1">{label}</div>
      <div className={`text-sm font-mono ${highlight ? "text-[#D4AF37]" : "text-white/80"}`}>{value ?? "—"}</div>
    </div>
  );
}
