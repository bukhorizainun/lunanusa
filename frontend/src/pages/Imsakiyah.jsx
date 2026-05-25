/**
 * Imsakiyah Bulanan (Monthly Prayer Schedule)
 * Tabel jadwal sholat satu bulan penuh + cetak/PDF + unduh CSV.
 * Data dari backend /imsakiyah (vektorisasi, ephemeris NASA JPL).
 */

import { useState } from "react";
import CitySelect from "../components/CitySelect";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura",
                   "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Riyadh", "Asia/Dubai", "UTC"];
const CONVENTIONS = [
  { key: "Kemenag",   label: "Kemenag RI (20°/18°)" },
  { key: "MWL",       label: "Muslim World League (18°/17°)" },
  { key: "Egypt",     label: "Egypt (19.5°/17.5°)" },
  { key: "Karachi",   label: "Karachi (18°/18°)" },
  { key: "ISNA",      label: "ISNA (15°/15°)" },
  { key: "UmmAlQura", label: "Umm al-Qura (18.5°/+90m)" },
];
const COL_LABELS = {
  imsak: "Imsak", subuh: "Subuh", terbit: "Terbit", dhuha: "Dhuha",
  dzuhur: "Dzuhur", ashar: "Ashar", maghrib: "Maghrib", isya: "Isya",
};

const now = new Date();

export default function Imsakiyah() {
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    latitude: -6.2, longitude: 106.8, elevation: 50,
    timezone: "Asia/Jakarta", convention: "Kemenag",
    asr_madhhab: "Syafii", ihtiyat_minutes: 2,
  });
  const [cityName, setCityName] = useState("Jakarta");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
  const handleChange = (e) => {
    const { name, value } = e.target;
    const numeric = ["year", "month", "latitude", "longitude", "elevation", "ihtiyat_minutes"];
    setF({ [name]: numeric.includes(name) ? parseFloat(value) : value });
  };

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/imsakiyah`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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

  const downloadCSV = () => {
    if (!result) return;
    const cols = result.columns;
    const header = ["Tanggal", "Hari", "Hijriah", ...cols.map((c) => COL_LABELS[c])];
    const lines = [header.join(",")];
    result.days.forEach((d) => {
      lines.push([`${d.day} ${result.month_name} ${result.year}`, d.weekday, d.hijri,
                  ...cols.map((c) => d[c])].join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imsakiyah-${cityName}-${result.month_name}-${result.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cols = result?.columns || [];
  const todayY = now.getFullYear(), todayM = now.getMonth() + 1, todayD = now.getDate();

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          header, .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-area { position: absolute; inset: 0; padding: 0; background: #fff; }
          .print-area * { color: #000 !important; }
          .print-area table { width: 100%; border-collapse: collapse; }
          .print-area th, .print-area td { border: 1px solid #888; padding: 2px 5px; font-size: 10px; }
          .print-area thead th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4 no-print">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Imsakiyah Bulanan</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Monthly Prayer Schedule
            </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6 mb-6 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Cari Kota</label>
              <CitySelect onSelect={(c) => { setF({ latitude: c.lat, longitude: c.lon, timezone: c.tz }); setCityName(c.name); }} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Bulan</label>
              <Select name="month" value={form.month} onChange={handleChange}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Tahun</label>
              <input name="year" type="number" min="1900" max="2200" value={form.year} onChange={handleChange}
                className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Konvensi Subuh/Isya</label>
              <Select name="convention" value={form.convention} onChange={handleChange}
                options={CONVENTIONS.map((c) => ({ value: c.key, label: c.label }))} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Madzhab Ashar</label>
              <Select name="asr_madhhab" value={form.asr_madhhab} onChange={handleChange}
                options={[{ value: "Syafii", label: "Syafi'i (1×)" }, { value: "Hanafi", label: "Hanafi (2×)" }]} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Zona Waktu</label>
              <Select name="timezone" value={form.timezone} onChange={handleChange}
                options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <button onClick={generate} disabled={loading}
              className="px-6 py-3 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 transition-all rounded-sm">
              {loading ? "Menghitung sebulan…" : "Tampilkan Imsakiyah"}
            </button>
            {result && (
              <>
                <button onClick={() => window.print()}
                  className="px-5 py-3 border border-[#5FBFBF]/30 text-[#5FBFBF] text-xs tracking-[0.2em] uppercase hover:bg-[#5FBFBF]/10 transition-all rounded-sm">
                  🖨 Cetak / Simpan PDF
                </button>
                <button onClick={downloadCSV}
                  className="px-5 py-3 border border-white/15 text-white/70 text-xs tracking-[0.2em] uppercase hover:bg-white/5 transition-all rounded-sm">
                  ⬇ Unduh CSV
                </button>
              </>
            )}
          </div>
          {error && <div className="mt-4 bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">{error}</div>}
        </div>

        {loading && (
          <div className="py-16 text-center text-white/30 text-xs tracking-[0.2em] uppercase no-print">
            Menghitung jadwal sebulan (ephemeris NASA JPL)…
          </div>
        )}

        {/* Result table */}
        {result && !loading && (
          <div className="print-area bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
            {/* Title (also for print) */}
            <div className="mb-4 text-center">
              <h2 className="text-white text-xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Imsakiyah {result.month_name} {result.year}
              </h2>
              <p className="text-white/50 text-xs tracking-wider mt-1">
                {cityName} · {result.convention?.label} · Ashar {result.convention?.asr_madhhab} · Ihtiyat {result.convention?.ihtiyat_minutes} mnt
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#D4AF37]/70 text-[10px] tracking-[0.12em] uppercase border-b border-[#D4AF37]/20">
                    <th className="py-2 px-2 text-left">Tgl</th>
                    <th className="py-2 px-2 text-left">Hari</th>
                    <th className="py-2 px-2 text-left">Hijriah</th>
                    {cols.map((c) => <th key={c} className="py-2 px-2 text-center">{COL_LABELS[c]}</th>)}
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {result.days.map((d) => {
                    const isToday = result.year === todayY && result.month === todayM && d.day === todayD;
                    return (
                      <tr key={d.day}
                        className={`border-b border-white/5 ${isToday ? "bg-[#D4AF37]/[0.08]" : "hover:bg-white/[0.02]"}`}>
                        <td className={`py-1.5 px-2 ${isToday ? "text-[#D4AF37] font-medium" : "text-white/80"}`}>{d.day}</td>
                        <td className="py-1.5 px-2 text-white/50 text-xs font-sans">{d.weekday}</td>
                        <td className="py-1.5 px-2 text-[#5FBFBF]/70 text-xs font-sans">{d.hijri}</td>
                        {cols.map((c) => (
                          <td key={c} className={`py-1.5 px-2 text-center ${c === "terbit" ? "text-white/40" : isToday ? "text-[#D4AF37]" : "text-white/85"}`}>{d[c]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-white/25 text-[10px] leading-relaxed mt-4 pt-3 border-t border-white/5">
              {result.meta?.note} Ephemeris: {result.meta?.ephemeris}. Waktu dalam {result.location?.timezone}.
              Imsak = 10 menit sebelum Subuh. Disarankan menambah ihtiyat untuk kehati-hatian.
            </p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="min-h-48 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12 no-print">
            <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Pilih bulan & kota, lalu tampilkan imsakiyah</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ name, value, onChange, options }) {
  return (
    <select name={name} value={value} onChange={onChange}
      className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
