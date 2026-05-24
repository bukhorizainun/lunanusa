/**
 * LunaNusa Hero Section
 * Full-viewport landing with animated starfield, centered logo,
 * tagline, and CTA. Aesthetic: scientific lunar observatory.
 */

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

/* ── Tiny star dot SVG ── */
function StarField() {
  // 80 procedural stars — deterministic from index seed
  const stars = Array.from({ length: 80 }, (_, i) => {
    const seed = (i * 2654435761) >>> 0;
    const x = (seed % 10000) / 100;
    const y = ((seed >> 14) % 10000) / 100;
    const size = ((seed >> 28) % 3) + 1;
    const opacity = 0.1 + ((seed >> 8) % 6) / 10;
    const delay = (seed % 40) / 10;
    return { x, y, size, opacity, delay };
  });

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.size * 0.6}
          fill="white"
          opacity={s.opacity}
          style={{
            animation: `starTwinkle ${3 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

/* ── Horizon glow ── */
function HorizonGlow() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(212,175,55,0.04) 0%, transparent 100%)",
        }}
      />
      {/* Horizon line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(212,175,55,0.2), transparent)" }}
      />
    </div>
  );
}

/* ── Coordinate grid overlay ── */
function CoordGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="gridPattern" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#7EC8C8" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0B1C2D 0%, #071524 60%, #0A2035 100%)" }}
    >
      {/* ── CSS animations ── */}
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: var(--base-opacity, 0.3); }
          50%       { opacity: calc(var(--base-opacity, 0.3) * 0.3); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
        @keyframes heroOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Background layers */}
      <CoordGrid />
      <StarField />
      <HorizonGlow />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(7,21,36,0.7) 100%)",
        }}
      />

      {/* ── Main Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">

        {/* Logo mark — large with orbit animation */}
        <div
          style={{
            animation: "fadeIn 0.8s ease forwards",
            animationDelay: "0.2s",
            opacity: 0,
          }}
        >
          <Logo size="hero" showText={false} className="mb-6" />
        </div>

        {/* Wordmark */}
        <div
          style={{
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "0.5s",
            opacity: 0,
          }}
        >
          <h1
            className="text-white font-light tracking-[0.5em] text-3xl sm:text-4xl md:text-5xl mb-1"
            style={{ fontFamily: "'Cormorant Garamond', 'Cinzel', Georgia, serif" }}
          >
            LUNANUSA
          </h1>
        </div>

        {/* Decorative line */}
        <div
          className="flex items-center gap-4 my-5"
          style={{
            animation: "fadeIn 0.8s ease forwards",
            animationDelay: "0.8s",
            opacity: 0,
          }}
        >
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70" style={{ animation: "subtlePulse 3s ease infinite" }} />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
        </div>

        {/* Primary tagline */}
        <p
          className="text-[#D4AF37]/90 text-base sm:text-lg tracking-widest uppercase font-light mb-3"
          style={{
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "0.9s",
            opacity: 0,
            letterSpacing: "0.2em",
            fontFamily: "inherit",
          }}
        >
          Precision Lunar Computation for the Nusantara
        </p>

        {/* Secondary tagline */}
        <p
          className="text-white/40 text-sm tracking-[0.1em] mb-12"
          style={{
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "1.1s",
            opacity: 0,
            fontFamily: "inherit",
          }}
        >
          Bridging Classical Falak and Modern Astronomy
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4"
          style={{
            animation: "fadeUp 0.8s ease forwards",
            animationDelay: "1.3s",
            opacity: 0,
          }}
        >
          <Link
            to="/calculator"
            className="
              px-8 py-3 rounded-sm
              bg-[#D4AF37] text-[#0B1C2D]
              text-xs tracking-[0.2em] uppercase font-medium
              hover:bg-[#E8C84A] transition-all duration-300
              shadow-[0_0_30px_rgba(212,175,55,0.2)]
              hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]
            "
          >
            Begin Calculation
          </Link>
          <Link
            to="/kitab"
            className="
              px-8 py-3 rounded-sm
              border border-[#D4AF37]/30 text-[#D4AF37]/80
              text-xs tracking-[0.2em] uppercase font-light
              hover:border-[#D4AF37]/70 hover:text-[#D4AF37]
              transition-all duration-300
            "
          >
            Kitab Klasik
          </Link>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            animation: "fadeIn 1s ease forwards",
            animationDelay: "2s",
            opacity: 0,
          }}
        >
          <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#D4AF37]/40 to-transparent" style={{ animation: "subtlePulse 2s ease infinite" }} />
        </div>
      </div>

      {/* ── Feature summary strips ── */}
      <div
        className="relative z-10 w-full max-w-5xl px-6 mt-0"
        style={{
          animation: "fadeUp 0.8s ease forwards",
          animationDelay: "1.6s",
          opacity: 0,
        }}
      >
        <div className="absolute bottom-[-240px] left-0 right-0 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D4AF37]/10">
          {[
            { label: "Classical Methods", value: "3 Kitab" },
            { label: "Modern Criteria",    value: "2 Standards" },
            { label: "Ephemeris",          value: "JPL DE440" },
            { label: "Precision",          value: "Arcsecond" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0B1C2D] px-6 py-5 text-center">
              <div className="text-[#D4AF37] text-lg font-light tracking-wider">{value}</div>
              <div className="text-white/30 text-[10px] tracking-[0.15em] uppercase mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
