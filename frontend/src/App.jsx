// HashRouter dipakai agar routing tetap jalan di GitHub Pages (subpath /lunanusa/)
// tanpa konfigurasi server / file 404.html.
import { HashRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Calculator from "./pages/Calculator";
import Comparison from "./pages/Comparison";
import AstronomyPage from "./pages/Astronomy";
import KitabPage from "./pages/Kitab";
import PrayerTimes from "./pages/PrayerTimes";
import Qibla from "./pages/Qibla";
import HijriCalendar from "./pages/HijriCalendar";

function HomePage() {
  return (
    <>
      <Hero />
      {/* Feature strip spacer */}
      <div className="bg-[#0B1C2D] pt-32 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-white/30 text-xs tracking-[0.3em] uppercase mb-6">System Overview</h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-2xl mx-auto">
            LunaNusa integrates Hilal determination methods from the Nusantara pesantren tradition —
            taqribi kitab (Sullam an-Nayyirain, Fath al-Rauf) and a contemporary method (Irsyad al-Murid) —
            alongside the Muhammadiyah &amp; MABIMS decision criteria, computed with high-precision
            NASA JPL DE440 ephemeris data via AstroPy.
          </p>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#0B1C2D]" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
        <Navbar />
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/calculator"  element={<Calculator />} />
          <Route path="/prayer-times" element={<PrayerTimes />} />
          <Route path="/qibla"        element={<Qibla />} />
          <Route path="/hijri"        element={<HijriCalendar />} />
          <Route path="/comparison"  element={<Comparison />} />
          <Route path="/astronomy"   element={<AstronomyPage />} />
          <Route path="/kitab"       element={<KitabPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
