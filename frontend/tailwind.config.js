/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── LunaNusa Design System ──
        navy: {
          DEFAULT: '#0B1C2D',
          dark:    '#071524',
          medium:  '#0D2035',
          light:   '#1a3a5c',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light:   '#F5D76E',
          muted:   '#A07C10',
        },
        teal: {
          orbit:   '#5FBFBF',
          soft:    '#7EC8C8',
        },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'Georgia', 'serif'],
        arabic:  ["'Scheherazade New'", 'Amiri', 'serif'],
        body:    ["'Outfit'", 'Inter', 'sans-serif'],
        mono:    ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
      animation: {
        'orbit-slow':    'spin 30s linear infinite',
        'orbit-reverse': 'spin 45s linear infinite reverse',
        'pulse-subtle':  'pulse 4s ease-in-out infinite',
        'fade-up':       'fadeUp 0.8s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(160deg, #0B1C2D 0%, #071524 60%, #0A2035 100%)',
        'gold-glow':     'radial-gradient(ellipse, rgba(212,175,55,0.15), transparent 70%)',
      },
    },
  },
  plugins: [],
}
