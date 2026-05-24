/**
 * Calculator Page
 * Main interface for Hilal calculation input and results display.
 */

import { useState } from "react";
import Logo from "../components/Logo";

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura",
  "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Riyadh",
  "Asia/Dubai", "UTC",
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Calculator() {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    latitude: -6.2,
    longitude: 106.8,
    elevation: 50,
    timezone: "Asia/Jakarta",
  });
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [showSteps, setShowSteps] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: ["latitude","longitude","elevation"].includes(name) ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Calculation failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Hisab Hilal</h2>
            <h1 className="text-white text-2xl font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Lunar Crescent Calculator
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Input Form ── */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-5">Observation Parameters</h3>

              <div className="space-y-4">
                <Field label="Hijri Date (CE)" name="date" type="date" value={form.date} onChange={handleChange} />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude (°)" name="latitude" type="number" step="0.0001" value={form.latitude} onChange={handleChange} />
                  <Field label="Longitude (°)" name="longitude" type="number" step="0.0001" value={form.longitude} onChange={handleChange} />
                </div>

                <Field label="Elevation (m)" name="elevation" type="number" step="1" value={form.elevation} onChange={handleChange} />

                <div>
                  <label className="block text-white/40 text-[10px] tracking-[0.15em] uppercase mb-1.5">Timezone</label>
                  <select
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    className="w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
                  >
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>

                {/* Quick city presets */}
                <div>
                  <p className="text-white/30 text-[10px] tracking-[0.15em] uppercase mb-2">Quick Select</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Jakarta",   lat: -6.2,   lon: 106.8 },
                      { name: "Surabaya",  lat: -7.25,  lon: 112.75 },
                      { name: "Yogya",     lat: -7.8,   lon: 110.4 },
                      { name: "Makassar",  lat: -5.13,  lon: 119.4 },
                      { name: "Mekkah",    lat: 21.42,  lon: 39.82 },
                    ].map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, latitude: c.lat, longitude: c.lon }))}
                        className="px-2.5 py-1 text-[10px] tracking-wider border border-white/10 text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all rounded-sm"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3.5 bg-[#D4AF37] text-[#0B1C2D]
                text-xs tracking-[0.25em] uppercase font-medium
                hover:bg-[#E8C84A] disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300 rounded-sm
                shadow-[0_0_20px_rgba(212,175,55,0.15)]
                hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]
              "
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/>
                  </svg>
                  Computing…
                </span>
              ) : "Calculate Hilal"}
            </button>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-sm">
                {error}
              </div>
            )}
          </form>

          {/* ── Results Panel ── */}
          <div className="lg:col-span-3 space-y-5">
            {!result && !loading && (
              <div className="h-full min-h-64 flex flex-col items-center justify-center text-center border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-12">
                <Logo size="medium" showText={false} className="mb-4 opacity-30" />
                <p className="text-white/20 text-xs tracking-[0.2em] uppercase">
                  Enter parameters and calculate
                </p>
              </div>
            )}

            {result && (
              <>
                {/* Decisions */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
                  <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-4">Hisab Decisions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DecisionCard
                      method="Muhammadiyah"
                      subtitle="Wujudul Hilal"
                      decision={result.decisions?.muhammadiyah}
                    />
                    <DecisionCard
                      method="MABIMS"
                      subtitle="Imkan Rukyat 3-6.4"
                      decision={result.decisions?.mabims}
                    />
                  </div>
                </div>

                {/* Astronomical data */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
                  <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-4">Astronomical Data (at Sunset)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {result.astronomical_data && Object.entries({
                      "Moon Altitude":    `${result.astronomical_data.moon_altitude_apparent?.toFixed(4)}°`,
                      "Moon Azimuth":     `${result.astronomical_data.moon_azimuth?.toFixed(4)}°`,
                      "Sun Altitude":     `${result.astronomical_data.sun_altitude?.toFixed(4)}°`,
                      "Elongation":       `${result.astronomical_data.elongation?.toFixed(4)}°`,
                      "Moon Age":         `${result.astronomical_data.moon_age_hours?.toFixed(2)}h`,
                      "Illumination":     `${result.astronomical_data.illumination_percent?.toFixed(3)}%`,
                      "Crescent Width":   `${result.astronomical_data.crescent_width_arcmin?.toFixed(3)}'`,
                      "Lag Time":         `${result.astronomical_data.lag_time_minutes?.toFixed(1)} min`,
                      "Ijtima (UTC)":     result.astronomical_data.conjunction_time_utc?.slice(11, 19) || "—",
                    }).map(([k, v]) => (
                      <DataCell key={k} label={k} value={v} />
                    ))}
                  </div>
                </div>

                {/* Classical Results */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase">Classical Kitab Results</h3>
                    <button
                      onClick={() => setShowSteps(s => !s)}
                      className="text-[10px] tracking-wider text-white/30 hover:text-[#D4AF37]/70 border border-white/10 px-2.5 py-1 rounded-sm transition-all"
                    >
                      {showSteps ? "Hide Steps" : "Show Steps"}
                    </button>
                  </div>
                  {result.classical_results && Object.entries(result.classical_results).map(([method, data]) => (
                    <ClassicalResult key={method} method={method} data={data} showSteps={showSteps} />
                  ))}
                </div>

                {/* Sunset / Ijtima times */}
                <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
                  <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-3">Times (Local)</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Sunset</div>
                      <div className="text-white/80 font-light font-mono">
                        {result.astronomical_data?.sunset_time_local?.slice(11, 19) || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Ijtima (Conjunction)</div>
                      <div className="text-white/80 font-light font-mono">
                        {result.astronomical_data?.conjunction_time_local?.slice(11, 19) || "—"}
                      </div>
                    </div>
                  </div>
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
      <input
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        className="
          w-full bg-[#0B1C2D] border border-white/10 text-white/80 text-sm
          px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#D4AF37]/40
          transition-colors font-mono
        "
      />
    </div>
  );
}

function DecisionCard({ method, subtitle, decision }) {
  const visible = decision?.visible ?? decision ?? false;
  return (
    <div className={`rounded-sm border p-4 ${visible ? "border-emerald-500/30 bg-emerald-900/10" : "border-red-500/20 bg-red-900/10"}`}>
      <div className={`text-xs font-medium tracking-wider mb-0.5 ${visible ? "text-emerald-400" : "text-red-400"}`}>
        {method}
      </div>
      <div className="text-white/30 text-[10px] tracking-wider mb-3">{subtitle}</div>
      <div className={`text-2xl font-light ${visible ? "text-emerald-400" : "text-red-400"}`}>
        {visible ? "VISIBLE" : "NOT VIS."}
      </div>
      {decision?.reason && (
        <div className="text-white/30 text-[10px] mt-1">{decision.reason}</div>
      )}
    </div>
  );
}

function DataCell({ label, value }) {
  return (
    <div className="bg-[#0B1C2D] rounded-sm px-3 py-2.5">
      <div className="text-white/30 text-[10px] tracking-wider uppercase mb-1">{label}</div>
      <div className="text-white/80 text-sm font-mono">{value}</div>
    </div>
  );
}

function ClassicalResult({ method, data, showSteps }) {
  const methodNames = {
    sullam_an_nayyirain: "Sullam an-Nayyirain",
    fath_al_rauf: "Fath al-Rauf al-Mannan",
    irsyad_al_murid: "Irsyad al-Murid",
  };
  return (
    <div className="border-t border-white/5 py-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white/70 text-sm">{methodNames[method] || method}</div>
          <div className="text-white/30 text-[10px] tracking-wider mt-0.5">{data?.classification || data?.method}</div>
        </div>
        <div className="text-right">
          <div className="text-white/70 text-sm font-mono">{data?.altitude?.toFixed(4)}°</div>
          <div className="text-white/30 text-[10px]">
            irtifaʿ{data?.mukts_minutes != null ? ` · mukts ${data.mukts_minutes}′` : ""}
          </div>
        </div>
      </div>
      {showSteps && data?.steps && (
        <div className="mt-3 bg-[#0B1C2D] rounded-sm p-3 space-y-1">
          {data?.criterion && (
            <div className="flex justify-between text-[11px] pb-1 mb-1 border-b border-white/5">
              <span className="text-white/30">kriteria</span>
              <span className="text-[#D4AF37]/70">{data.criterion}</span>
            </div>
          )}
          {Object.entries(data.steps).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[11px] gap-3">
              <span className="text-white/30 capitalize">{k.replace(/_/g, " ")}</span>
              <span className="text-white/60 font-mono text-right">
                {typeof v === "number" ? v.toFixed(4) : String(v)}
              </span>
            </div>
          ))}
          {data?.reference && (
            <div className="text-white/25 text-[10px] leading-relaxed pt-2 mt-1 border-t border-white/5">
              {data.reference}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
