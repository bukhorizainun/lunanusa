/**
 * LunaNusa Logo Component
 * Scalable SVG recreation of the LunaNusa brand mark.
 * Faithfully reproduces: gold crescent, teal orbit, glowing dot, astronomical grid.
 */

const SIZE_MAP = {
  small: { total: 32, svg: 28 },
  medium: { total: 48, svg: 42 },
  large: { total: 120, svg: 104 },
  hero: { total: 200, svg: 174 },
};

export default function Logo({ size = "medium", showText = true, darkMode = true, className = "" }) {
  const { total, svg } = SIZE_MAP[size] || SIZE_MAP.medium;
  const textSize = {
    small: "text-xs tracking-[0.2em]",
    medium: "text-sm tracking-[0.25em]",
    large: "text-xl tracking-[0.3em]",
    hero: "text-3xl tracking-[0.35em]",
  }[size] || "text-sm tracking-[0.25em]";

  const isHero = size === "hero";
  const isLarge = size === "large" || size === "hero";

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* SVG Mark */}
      <div
        style={{ width: total, height: total }}
        className="relative flex items-center justify-center group"
      >
        <svg
          width={svg}
          height={svg}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* ── Defs: gradients & filters ── */}
          <defs>
            {/* Gold crescent gradient */}
            <linearGradient id="crescentGrad" x1="60" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5D76E" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#A07C10" />
            </linearGradient>

            {/* Glowing dot filter */}
            <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle crescent glow on hover */}
            <filter id="crescentGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Orbit glow */}
            <filter id="orbitGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Astronomical Grid (subtle background) ── */}
          <g opacity="0.15" stroke="#7EC8C8" strokeWidth="0.8">
            {/* Vertical meridian */}
            <line x1="100" y1="20" x2="100" y2="180" />
            {/* Horizontal equator */}
            <line x1="20" y1="100" x2="180" y2="100" />
            {/* Outer reference circle */}
            <circle cx="100" cy="100" r="75" fill="none" />
            {/* Inner reference circle */}
            <circle cx="100" cy="100" r="45" fill="none" strokeDasharray="4 6" />
          </g>

          {/* ── Orbit Ellipses (teal, rotating animation) ── */}
          <g filter="url(#orbitGlow)">
            {/* Outer orbit – tilted ~20° */}
            <g style={{ transformOrigin: "100px 100px", animation: "orbitSpin 30s linear infinite" }}>
              <ellipse
                cx="100" cy="100"
                rx="78" ry="28"
                stroke="#5FBFBF"
                strokeWidth="1.2"
                fill="none"
                opacity="0.75"
                style={{ transform: "rotate(-20deg)", transformOrigin: "100px 100px" }}
              />
            </g>
            {/* Inner orbit – tilted ~15° opposite */}
            <g style={{ transformOrigin: "100px 100px", animation: "orbitSpinReverse 45s linear infinite" }}>
              <ellipse
                cx="100" cy="100"
                rx="60" ry="18"
                stroke="#7EC8C8"
                strokeWidth="0.7"
                fill="none"
                opacity="0.45"
                style={{ transform: "rotate(15deg)", transformOrigin: "100px 100px" }}
              />
            </g>
          </g>

          {/* ── Gold Crescent Moon ── */}
          {/*
            Crescent = filled circle minus offset circle.
            Outer circle: cx=100, cy=100, r=46
            Inner cutout: cx=118, cy=90, r=40
            This creates the classic thin crescent shape.
          */}
          <g
            filter="url(#crescentGlow)"
            className="group-hover:opacity-100"
            style={{ transition: "filter 0.3s ease" }}
          >
            <path
              d="
                M 100 54
                A 46 46 0 1 1 72 148
                A 46 46 0 0 0 108 62
                A 46 46 0 0 0 100 54
                Z
              "
              fill="url(#crescentGrad)"
              opacity="0.95"
            />
          </g>

          {/* ── Glowing Observation Dot (on orbit line, upper-right) ── */}
          <g filter="url(#dotGlow)" style={{ animation: "orbitSpin 30s linear infinite", transformOrigin: "100px 100px" }}>
            {/* Dot position on orbit ellipse at ~-20° rotation, angle 340° */}
            <circle
              cx="174"
              cy="91"
              r="5"
              fill="white"
              opacity="0.95"
            />
            <circle
              cx="174"
              cy="91"
              r="9"
              fill="white"
              opacity="0.15"
            />
          </g>
        </svg>

        {/* CSS Keyframe injection */}
        <style>{`
          @keyframes orbitSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes orbitSpinReverse {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes crescentPulse {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(212,175,55,0.3)); }
            50%       { filter: drop-shadow(0 0 12px rgba(212,175,55,0.7)); }
          }
        `}</style>
      </div>

      {/* ── Wordmark ── */}
      {showText && (
        <span
          className={`
            font-light ${textSize} select-none
            ${darkMode ? "text-white" : "text-[#0B1C2D]"}
          `}
          style={{ letterSpacing: "0.3em", fontFamily: "'Cormorant Garamond', 'Cinzel', Georgia, serif" }}
        >
          LUNANUSA
        </span>
      )}
    </div>
  );
}
