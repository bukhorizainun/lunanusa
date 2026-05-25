/**
 * Prayer Times Page (Jadwal Sholat)
 * Menghitung waktu sholat dari posisi Matahari (ephemeris NASA JPL via backend).
 */

import { useState } from "react";
import Logo from "../components/Logo";
import CitySelect from "../components/CitySelect";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura",
  "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Riyadh",
  "Asia/Dubai", "UTC",
];

const CONVENTIONS = [
  { key: "Kemenag",   label: "Kemenag RI (20° / 18°)" },
  { key: "MWL",       label: "Muslim World League (18° / 17°)" },
  { key: "Egypt",     label: "Egypt (19.5° / 17.5°)" },
  { key: "Karachi",   label: "Karachi (18° / 18°)" },
  { key: "ISNA",      label: "ISNA (15° / 15°)" },
  { key: "UmmAlQura", label: "Umm al-Qura, Makkah (18.5° / +90m)" },
];

// Urutan & label tampilan waktu sholat
const ROWS = [
  { key: "imsak",   label: "Imsak",   sub: "10 mnt sebelum Subuh" },
  { key: "subuh",   label: "Subuh",   sub: "Fajar (fajr shadiq)"  },
  { key: "terbit",  label: "Terbit",  sub: "Syuruq · akhir Subuh" },
  { key: "dhuha",   label: "Dhuha",   sub: "Matahari +4.5°"       },
  { key: "dzuhur",  label: "Dzuhur",  sub: "Zawal · tergelincir"  },
  { key: "ashar",   label: "Ashar",   sub: "Panjang bayangan"     },
  { key: "maghrib", label: "Maghrib", sub: "Ghurub · matahari terbenam" },
  { key: "isya",    label: "Isya",    sub: "Hilang syafaq merah"  },
];

export default function PrayerTimes() {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    latitude: -6.2,
    longitude: 106.8,
    elevation: 50,
    timezone: "Asia/Jakarta",
    convention: "Kemenag",
    asr_madhhab: "Syafii",
    ihtiyat_minutes: 2,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numeric = ["latitude", "longitude", "elevation", "ihtiyat_minutes"];
    setF({ [name]: numeric.includes(name) ? parseFloat(value) : value });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Browser tidak mendukung geolokasi."); return; }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF({
          latitude: +pos.coords.latitude.toFixed(4),
          longitude: +pos.coords.longitude.toFixed(4),
          elevation: pos.coords.altitude ? Math.max(0, Math.round(pos.coords.altitude)) : form.elevation,
        });
        setSelectedCity(null);
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
      const res = await fetch(`${API_URL}/prayer-times`, {
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
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Jadwal Sholat</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Prayer Times
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Input ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-5">Parameter Lokasi</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Cari Kota</label>
                  <CitySelect onSelect={(c) => { setF({ latitude: c.lat, longitude: c.lon, timezone: c.tz }); setSelectedCity(c); }} />
                  {selectedCity && (
                    <p className="text-[#5FBFBF]/70 text-[10px] mt-1.5 tracking-wider">
                      {selectedCity.name}, {selectedCity.prov}
                    </p>
                  )}
                </div>

                <Field label="Tanggal" name="date" type="date" value={form.date} onChange={handleChange} />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude (°)" name="latitude" type="number" step="0.0001" value={form.latitude} onChange={handleChange} />
                  <Field label="Longitude (°)" name="longitude" type="number" step="0.0001" value={form.longitude} onChange={handleChange} />
                </div>

                <Field label="Elevasi (m)" name="elevation" type="number" step="1" value={form.elevation} onChange={handleChange} />

                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={geoBusy}
                  className="w-full py-2 border border-[#5FBFBF]/30 text-[#5FBFBF] text-[10px] tracking-[0.2em] uppercase hover:bg-[#5FBFBF]/10 disabled:opacity-50 transition-all rounded-sm"
                >
                  {geoBusy ? "Mendeteksi…" : "📍 Gunakan Lokasi Saya"}
                </button>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Zona Waktu</label>
                  <Select name="timezone" value={form.timezone} onChange={handleChange}
                    options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
                </div>

                <div>
                  <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Konvensi Subuh/Isya</label>
                  <Select name="convention" value={form.convention} onChange={handleChange}
                    options={CONVENTIONS.map((c) => ({ value: c.key, label: c.label }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Madzhab Ashar</label>
                    <Select name="asr_madhhab" value={form.asr_madhhab} onChange={handleChange}
                      options={[{ value: "Syafii", label: "Syafi'i (1×)" }, { value: "Hanafi", label: "Hanafi (2×)" }]} />
                  </div>
                  <Field label="Ihtiyat (mnt)" name="ihtiyat_minutes" type="number" step="1" value={form.ihtiyat_minutes} onChange={handleChange} />
                </div>

              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.25em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              {loading ? "Menghitung…" : "Hitung Jadwal Sholat"}
            </button>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">{error}</div>
            )}
          </form>

          {/* ── Results ── */}
          <div className="lg:col-span-3 space-y-5">
            {!result && !loading && (
              <div className="h-full min-h-64 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12">
                <Logo size="medium" showText={false} className="mb-4 opacity-30" />
                <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Masukkan parameter lalu hitung</p>
              </div>
            )}

            {result && (
              <>
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase">Waktu Sholat</h3>
                    <span className="text-white/30 text-[10px] tracking-wider">{result.date}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROWS.map(({ key, label, sub }) => (
                      <PrayerCard key={key} label={label} sub={sub}
                        time={result.times?.[key]?.time}
                        highlight={["subuh", "dzuhur", "ashar", "maghrib", "isya"].includes(key)} />
                    ))}
                  </div>
                </div>

                {/* Detail */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
                  <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-3">Detail Perhitungan</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <DataCell label="Konvensi" value={result.convention?.label} />
                    <DataCell label="Sudut Subuh" value={`${result.convention?.fajr_angle}°`} />
                    <DataCell label="Sudut Isya" value={result.convention?.isha_angle != null ? `${result.convention.isha_angle}°` : "+90 mnt"} />
                    <DataCell label="Madzhab Ashar" value={result.convention?.asr_madhhab} />
                    <DataCell label="Ihtiyat" value={`${result.convention?.ihtiyat_minutes} mnt`} />
                    <DataCell label="Transit (Zawal)" value={result.sun?.transit_local?.time} />
                    <DataCell label="Deklinasi ☉" value={`${result.sun?.declination_deg?.toFixed(2)}°`} />
                    <DataCell label="Tinggi Ashar" value={`${result.sun?.asr_altitude_deg?.toFixed(2)}°`} />
                  </div>
                  <p className="text-white/25 text-[10px] leading-relaxed mt-4 pt-3 border-t border-white/5">
                    {result.meta?.note} Ephemeris: {result.meta?.ephemeris}.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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

function Select({ name, value, onChange, options }) {
  return (
    <select name={name} value={value} onChange={onChange}
      className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PrayerCard({ label, sub, time, highlight }) {
  return (
    <div className={`rounded-sm border p-4 flex items-center justify-between ${highlight ? "border-[#D4AF37]/25 bg-[#D4AF37]/[0.04]" : "border-white/10 bg-[#0B1C2D]"}`}>
      <div>
        <div className={`text-sm tracking-wide ${highlight ? "text-[#D4AF37]" : "text-white/70"}`}>{label}</div>
        <div className="text-white/30 text-[10px] tracking-wider mt-0.5">{sub}</div>
      </div>
      <div className="text-white text-xl font-light font-mono tabular-nums">{time || "—"}</div>
    </div>
  );
}

function DataCell({ label, value }) {
  return (
    <div className="bg-[#0B1C2D] rounded-sm px-3 py-2.5">
      <div className="text-white/30 text-[10px] tracking-wider uppercase mb-1">{label}</div>
      <div className="text-white/80 text-sm font-mono">{value ?? "—"}</div>
    </div>
  );
}
