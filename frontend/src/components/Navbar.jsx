/**
 * LunaNusa Navbar
 * Desktop: Logo left, nav right
 * Mobile:  Logo centered, hamburger
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/calculator",   label: "Calculator"    },
  { href: "/hijri",        label: "Kalender"      },
  { href: "/prayer-times", label: "Jadwal Sholat" },
  { href: "/imsakiyah",    label: "Imsakiyah"     },
  { href: "/qibla",        label: "Arah Kiblat"   },
  { href: "/comparison",   label: "Comparison"    },
  { href: "/astronomy",    label: "Astronomy"     },
  { href: "/kitab",        label: "Kitab Klasik"  },
];

export default function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location                = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close menu on route change
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? "bg-[#0B1C2D]/95 backdrop-blur-md border-b border-[#D4AF37]/10 shadow-lg"
            : "bg-transparent"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* ── Logo (left on desktop, centered on mobile) ── */}
            <Link
              to="/"
              className="
                flex items-center gap-3
                md:static absolute left-1/2 -translate-x-1/2
                md:translate-x-0 md:left-auto
              "
              aria-label="LunaNusa Home"
            >
              <Logo size="small" showText={false} />
              <span
                className="hidden sm:block text-white font-light tracking-[0.25em] text-sm"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                LUNANUSA
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <NavLink key={href} href={href} active={location.pathname === href}>
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* ── Hamburger (mobile) ── */}
            <button
              className="
                md:hidden relative z-50 w-10 h-10
                flex flex-col items-center justify-center gap-[5px]
                focus:outline-none group
              "
              onClick={() => setOpen(v => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span className={`
                block h-px w-6 bg-[#D4AF37] transition-all duration-300 origin-center
                ${open ? "rotate-45 translate-y-[6px]" : ""}
              `} />
              <span className={`
                block h-px w-6 bg-[#D4AF37] transition-all duration-300
                ${open ? "opacity-0 scale-x-0" : ""}
              `} />
              <span className={`
                block h-px w-6 bg-[#D4AF37] transition-all duration-300 origin-center
                ${open ? "-rotate-45 -translate-y-[6px]" : ""}
              `} />
            </button>

          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <div className={`
        fixed inset-0 z-40 md:hidden transition-all duration-300
        ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
      `}>
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#0B1C2D]/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        {/* Panel */}
        <nav className={`
          absolute top-0 right-0 w-72 h-full
          bg-[#0D2035] border-l border-[#D4AF37]/15
          flex flex-col pt-24 px-8 gap-2
          transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}>
          {/* Decorative orbit line */}
          <div className="absolute top-8 left-8">
            <Logo size="small" showText={false} />
          </div>

          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className={`
                py-3 px-4 rounded-lg text-sm tracking-widest uppercase transition-all duration-200
                ${location.pathname === href
                  ? "text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20"
                  : "text-white/70 hover:text-white hover:bg-white/5"
                }
              `}
              style={{ fontFamily: "inherit", letterSpacing: "0.1em" }}
            >
              {label}
            </Link>
          ))}

          <div className="mt-auto mb-8 border-t border-white/10 pt-6">
            <p className="text-white/30 text-xs tracking-wider">
              Precision Lunar Computation
            </p>
            <p className="text-white/20 text-xs mt-1">
              for the Nusantara
            </p>
          </div>
        </nav>
      </div>
    </>
  );
}

function NavLink({ href, active, children }) {
  return (
    <Link
      to={href}
      className={`
        relative px-4 py-2 text-xs tracking-[0.15em] uppercase transition-all duration-200
        after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px
        after:bg-[#D4AF37] after:transition-transform after:duration-300
        ${active
          ? "text-[#D4AF37] after:scale-x-100"
          : "text-white/60 hover:text-white after:scale-x-0 hover:after:scale-x-100"
        }
      `}
      style={{ letterSpacing: "0.12em" }}
    >
      {children}
    </Link>
  );
}
