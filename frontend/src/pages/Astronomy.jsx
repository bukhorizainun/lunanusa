/**
 * Astronomy Detail Page
 * Sky dome SVG visualization + moon altitude chart using recharts.
 */

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Sky Dome SVG ── */
function SkyDome({ moonAlt, moonAz, sunAlt, sunAz }) {
  // Project alt/az to 2D dome coords
  // Center = (250, 250), radius = 220
  const cx = 250, cy = 250, r = 220;

  function toXY(alt, az) {
    // Zenith at center, horizon at edge
    const dist = r * (1 - Math.max(0, alt) / 90);
    const azRad = (az - 90) * Math.PI / 180; // N=up
    return {
      x: cx + dist * Math.cos(azRad),
      y: cy + dist * Math.sin(azRad),
    };
  }

  const moon = toXY(moonAlt, moonAz);
  const sun  = toXY(sunAlt, sunAz);
  const belowHorizon = moonAlt < 0;

  return (
    <svg viewBox="0 0 500 500" className="w-full max-w-sm mx-auto">
      <defs>
        <radialGradient id="skyGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="80%" stopColor="#0d2035" />
          <stop offset="100%" stopColor="#071524" />
        </radialGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Sky circle */}
      <circle cx={cx} cy={cy} r={r} fill="url(#skyGrad)" stroke="#D4AF37" strokeWidth="1" strokeOpacity="0.3" />

      {/* Altitude circles */}
      {[15, 30, 45, 60, 75].map(a => {
        const dr = r * (1 - a/90);
        return (
          <circle key={a} cx={cx} cy={cy} r={dr} fill="none" stroke="#7EC8C8" strokeWidth="0.4" strokeOpacity="0.2"
            strokeDasharray="4 8" />
        );
      })}

      {/* Cardinal labels */}
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([l, az]) => {
        const rad = (az - 90) * Math.PI / 180;
        return (
          <text key={l} x={cx + (r + 14) * Math.cos(rad)} y={cy + (r + 14) * Math.sin(rad) + 4}
            textAnchor="middle" fill="#7EC8C8" fontSize="11" fontFamily="monospace" opacity="0.6">
            {l}
          </text>
        );
      })}

      {/* Azimuth lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(az => {
        const rad = (az - 90) * Math.PI / 180;
        return (
          <line key={az}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(rad)} y2={cy + r * Math.sin(rad)}
            stroke="#7EC8C8" strokeWidth="0.3" strokeOpacity="0.12" />
        );
      })}

      {/* Stars (background) */}
      {Array.from({ length: 60 }, (_, i) => {
        const seed = (i * 1234567) >>> 0;
        const x = ((seed % 400) + 50);
        const y = ((seed >> 8) % 400) + 50;
        const s = ((seed >> 16) % 2) + 1;
        const op = 0.2 + ((seed >> 20) % 5) / 10;
        const dx = x - cx, dy = y - cy;
        if (dx*dx + dy*dy > r*r) return null;
        return <circle key={i} cx={x} cy={y} r={s * 0.5} fill="white" opacity={op} />;
      })}

      {/* Horizon label */}
      <text x={cx} y={cy + r - 6} textAnchor="middle" fill="#D4AF37" fontSize="9" opacity="0.4" fontFamily="monospace">
        HORIZON 0°
      </text>

      {/* Sun position (grayed – below horizon) */}
      {sunAlt !== undefined && (
        <g opacity={sunAlt > -5 ? 0.6 : 0.2}>
          <circle cx={sun.x} cy={sun.y} r={10} fill="#FDB813" opacity="0.3" />
          <circle cx={sun.x} cy={sun.y} r={5} fill="#FDB813" />
          <text x={sun.x + 12} y={sun.y + 4} fill="#FDB813" fontSize="9" fontFamily="monospace" opacity="0.7">
            Sun {sunAlt > 0 ? `+${sunAlt.toFixed(1)}°` : `${sunAlt.toFixed(1)}°`}
          </text>
        </g>
      )}

      {/* Moon position */}
      {moonAlt !== undefined && (
        <g opacity={belowHorizon ? 0.3 : 1}>
          <circle cx={moon.x} cy={moon.y} r={25} fill="url(#moonGlow)" />
          <circle cx={moon.x} cy={moon.y} r={10} fill="#D4AF37" filter="url(#glow2)" opacity="0.9" />
          <text x={moon.x + 14} y={moon.y + 4} fill="#D4AF37" fontSize="9" fontFamily="monospace" opacity="0.9">
            Hilal {moonAlt > 0 ? `+${moonAlt.toFixed(2)}°` : `${moonAlt.toFixed(2)}°`}
          </text>
          {belowHorizon && (
            <text x={moon.x} y={moon.y - 18} textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="monospace" opacity="0.7">
              BELOW HORIZON
            </text>
          )}
        </g>
      )}

      {/* Zenith marker */}
      <circle cx={cx} cy={cy} r={3} fill="none" stroke="#7EC8C8" strokeWidth="0.8" opacity="0.4" />
      <line x1={cx-6} y1={cy} x2={cx+6} y2={cy} stroke="#7EC8C8" strokeWidth="0.6" opacity="0.3" />
      <line x1={cx} y1={cy-6} x2={cx} y2={cy+6} stroke="#7EC8C8" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

/* ── Altitude Chart ── */
function AltitudeChart({ chartData }) {
  if (!chartData || chartData.length === 0) return null;
  return (
    <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
      <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-4">Moon Altitude vs Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="#1a3a5c" />
          <XAxis dataKey="time" tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} unit="°" width={35} />
          <Tooltip
            contentStyle={{ background: "#0B1C2D", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 2 }}
            labelStyle={{ color: "#D4AF37", fontSize: 11 }}
            itemStyle={{ color: "#ffffff80", fontSize: 11 }}
          />
          <ReferenceLine y={0}   stroke="#D4AF37" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="4 4" label={{ value: "Horizon", fill: "#D4AF3760", fontSize: 10 }} />
          <ReferenceLine y={3}   stroke="#5FBFBF" strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 6" />
          <Line type="monotone" dataKey="moon_alt" stroke="#D4AF37" strokeWidth={2} dot={false} name="Moon Alt" />
          <Line type="monotone" dataKey="sun_alt" stroke="#FDB81360" strokeWidth={1.5} dot={false} name="Sun Alt" strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          <div className="w-6 h-px bg-[#D4AF37]" /> Moon
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          <div className="w-6 h-px bg-[#FDB813] opacity-60" style={{ borderTop: "1px dashed" }} /> Sun
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#5FBFBF]/60">
          <div className="w-6 h-px bg-[#5FBFBF]" /> MABIMS 3°
        </div>
      </div>
    </div>
  );
}

export default function AstronomyPage() {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    latitude: -6.2, longitude: 106.8, elevation: 50, timezone: "Asia/Jakarta",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hzn, setHzn] = useState(null);
  const [hznLoading, setHznLoading] = useState(false);
  const [hznErr, setHznErr] = useState(null);

  const compute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setResult(await res.json());
    } catch {}
    setLoading(false);
  };

  const checkHorizons = async () => {
    setHznLoading(true); setHznErr(null);
    try {
      const res = await fetch(`${API_URL}/horizons-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Horizons query gagal");
      }
      setHzn(await res.json());
    } catch (e) { setHznErr(e.message); } finally { setHznLoading(false); }
  };

  const ad = result?.astronomical_data;

  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">Falakiyah</h2>
            <h1 className="text-white text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Detailed Astronomy
            </h1>
          </div>
        </div>

        {/* Quick form */}
        <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}
              className="bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-1.5">Lat</label>
            <input type="number" value={form.latitude} onChange={e=>setForm(f=>({...f,latitude:+e.target.value}))} step="0.01"
              className="w-24 bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] tracking-wider uppercase mb-1.5">Lon</label>
            <input type="number" value={form.longitude} onChange={e=>setForm(f=>({...f,longitude:+e.target.value}))} step="0.01"
              className="w-24 bg-[#0B1C2D] border border-white/10 text-white/80 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#D4AF37]/40 font-mono" />
          </div>
          <button onClick={compute} disabled={loading}
            className="px-6 py-2.5 bg-[#D4AF37] text-[#0B1C2D] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#E8C84A] disabled:opacity-50 transition-all rounded-sm">
            {loading ? "Computing…" : "Compute"}
          </button>
          <button onClick={checkHorizons} disabled={hznLoading}
            title="Kueri langsung ke NASA JPL Horizons & bandingkan dengan hitungan lokal"
            className="px-5 py-2.5 border border-[#5FBFBF]/40 text-[#5FBFBF] text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#5FBFBF]/10 disabled:opacity-50 transition-all rounded-sm">
            {hznLoading ? "Querying NASA…" : "Verify vs NASA Horizons (live)"}
          </button>
        </div>

        {/* NASA JPL Horizons live cross-check */}
        {(hzn || hznErr) && (
          <div className="bg-[#0D2035] border border-[#5FBFBF]/20 rounded-sm p-5 mb-6">
            <h3 className="text-[#5FBFBF]/80 text-xs tracking-[0.2em] uppercase mb-1">NASA JPL Horizons — Live Cross-Check</h3>
            {hznErr ? (
              <p className="text-red-400/80 text-xs mt-2">{hznErr}</p>
            ) : (
              <>
                <p className="text-white/30 text-[11px] mb-3">
                  Posisi airless (geometris) saat ghurub • {hzn.sunset_utc?.slice(11, 19)} UTC • JD {hzn.jd_ut}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-white/30 text-[10px] uppercase tracking-wider">
                        <th className="text-left py-1.5 font-normal">Besaran</th>
                        <th className="text-right py-1.5 font-normal">Lokal (DE440s)</th>
                        <th className="text-right py-1.5 font-normal">NASA Horizons</th>
                        <th className="text-right py-1.5 font-normal">Selisih (″)</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {[
                        ["Bulan — Altitude", hzn.moon.altitude],
                        ["Bulan — Azimuth", hzn.moon.azimuth],
                        ["Matahari — Altitude", hzn.sun.altitude],
                        ["Matahari — Azimuth", hzn.sun.azimuth],
                      ].map(([label, v]) => (
                        <tr key={label} className="border-t border-white/5">
                          <td className="py-1.5 text-white/50 font-sans">{label}</td>
                          <td className="py-1.5 text-right text-white/70">{v.local_de440s}°</td>
                          <td className="py-1.5 text-right text-white/70">{v.nasa_horizons}°</td>
                          <td className={`py-1.5 text-right ${Math.abs(v.diff_arcsec) < 5 ? "text-emerald-400" : "text-amber-400"}`}>
                            {v.diff_arcsec}″
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-white/25 text-[10px] mt-3 leading-relaxed">{hzn.note}</p>
              </>
            )}
          </div>
        )}

        {ad ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Sky Dome */}
            <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
              <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-4">Sky Dome (at Sunset)</h3>
              <SkyDome
                moonAlt={ad.moon_altitude_apparent}
                moonAz={ad.moon_azimuth}
                sunAlt={ad.sun_altitude}
                sunAz={ad.sun_azimuth}
              />
            </div>

            {/* Key data */}
            <div className="space-y-4">
              <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-6">
                <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-4">Computed Parameters</h3>
                <div className="space-y-3">
                  {[
                    ["Moon Altitude (topocentric)", `${ad.moon_altitude_apparent?.toFixed(6)}°`],
                    ["Moon Azimuth",                `${ad.moon_azimuth?.toFixed(6)}°`],
                    ["Sun Altitude",                `${ad.sun_altitude?.toFixed(6)}°`],
                    ["Sun Azimuth",                 `${ad.sun_azimuth?.toFixed(6)}°`],
                    ["Elongation (sun-moon sep.)",  `${ad.elongation?.toFixed(6)}°`],
                    ["Moon Age (from ijtima)",      `${ad.moon_age_hours?.toFixed(4)} hours`],
                    ["Illumination Fraction",       `${ad.illumination_percent?.toFixed(4)}%`],
                    ["Crescent Width",              `${ad.crescent_width_arcmin?.toFixed(4)} arcmin`],
                    ["Lag Time",                    `${ad.lag_time_minutes?.toFixed(2)} min`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-baseline border-b border-white/5 pb-2">
                      <span className="text-white/40 text-[11px]">{l}</span>
                      <span className="text-white/80 text-sm font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MABIMS criteria checker */}
              <div className="bg-[#0D2035] border border-[#D4AF37]/10 rounded-sm p-5">
                <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-3">Criteria Check</h3>
                <div className="space-y-2">
                  <CriteriaRow label="Altitude ≥ 3° (MABIMS)" val={ad.moon_altitude_apparent} threshold={3} fmt="°" />
                  <CriteriaRow label="Elongation ≥ 6.4° (MABIMS)" val={ad.elongation} threshold={6.4} fmt="°" />
                  <CriteriaRow label="Altitude > 0° (Wujudul Hilal)" val={ad.moon_altitude_apparent} threshold={0} fmt="°" />
                  <div className={`flex justify-between items-center py-1.5 border-b border-white/5 text-xs`}>
                    <span className="text-white/40">Ijtima before sunset</span>
                    <span className={ad.conjunction_before_sunset ? "text-emerald-400" : "text-red-400"}>
                      {ad.conjunction_before_sunset ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Altitude chart spanning full width */}
            <div className="lg:col-span-2">
              <AltitudeChart chartData={result.moon_altitude_chart} />
            </div>
          </div>
        ) : (
          <div className="border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-24 text-center">
            <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Compute to view sky visualization</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CriteriaRow({ label, val, threshold, fmt }) {
  const pass = val != null && val >= threshold;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-xs">
      <span className="text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white/50 font-mono">{val?.toFixed(3)}{fmt}</span>
        <span className={pass ? "text-emerald-400" : "text-red-400"}>{pass ? "✓" : "✗"}</span>
      </div>
    </div>
  );
}
