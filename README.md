# LunaNusa — Hilal Calculation System

**Precision Lunar Computation for the Nusantara**  
*Bridging Classical Falak and Modern Astronomy*

---

## Architecture

```
lunanusa/
├── backend/
│   ├── main.py           # FastAPI + AstroPy computation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Logo.jsx    # SVG crescent logo (reusable)
│       │   ├── Navbar.jsx  # Responsive header with hamburger
│       │   └── Hero.jsx    # Landing page hero section
│       └── pages/
│           ├── Calculator.jsx   # Main hisab form + results
│           ├── Comparison.jsx   # Side-by-side method table
│           ├── Astronomy.jsx    # Sky dome + altitude chart
│           └── Kitab.jsx        # Classical method reference
├── netlify.toml          # Frontend deployment config
├── render.yaml           # Backend deployment config
└── README.md
```

---

## Methods Implemented

### Kitab Falak Nusantara
| Kitab | Pengarang / Asal | Klasifikasi | Metode | Akurasi |
|-------|------------------|-------------|--------|---------|
| Sullam an-Nayyirain | M. Mansur al-Batawi · Betawi, 1925 | Hakiki **Taqribi** | irtifaʿ = Δt(ijtimak→ghurub) × 0,5°; mukts = irtifaʿ × 4 mnt | ~±2° |
| Fath al-Rauf al-Mannan | Abdul Jalil b. Abdul Hamid · Kudus, w.1974 | Hakiki **Taqribi** | taʿdīl al-markaz + parameter Ulugh Beg (obliquity 23°30'17") | ~±1–2° |
| Irsyad al-Murid | Ahmad Ghozali · Sampang Madura, ~2000 | Hakiki **Tadqiq / Kontemporer** | ephemeris presisi (NASA JPL DE440s, toposentrik) | presisi |

> Klasifikasi mengikuti Seminar Hisab Rukyat Tugu Bogor 1992 (Kemenag, *Almanak Hisab Rukyat* 2010).
> Fath al-Rauf memakai parameter terdokumentasi Zij Ulugh Beg (Zij-i Sultani 1437 M); radix sexagesimal
> manuskrip tulisan tangan tidak ditranskrip — nilai ilustratif kelas taqribi.

### Cross-check live NASA JPL Horizons
`POST /horizons-check` mengueri **NASA JPL Horizons** secara live dan membandingkan posisi airless
Bulan/Matahari dengan hitungan lokal DE440s (cocok < 1 detik busur). Butuh `astroquery` + internet;
di-guard agar API tetap jalan tanpa paket tsb. Tombolnya ada di halaman **Astronomy**.

### Modern Criteria
| Criterion | Conditions |
|-----------|-----------|
| Muhammadiyah (Wujudul Hilal) | Ijtima' < sunset AND altitude > 0° |
| MABIMS 2021 | altitude ≥ 3° AND elongation ≥ 6.4° |

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local:
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
# App: http://localhost:5173
```

---

## Deployment

### Frontend → Netlify

1. Push repository to GitHub
2. Connect to Netlify → "New site from Git"
3. Build settings (auto-detected from `netlify.toml`):
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish: `dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL

### Backend → Render.com

1. Push to GitHub
2. Render Dashboard → "New Web Service"
3. Select repo, Render auto-detects `render.yaml`
4. Or manually:
   - Runtime: Docker
   - Dockerfile path: `./backend/Dockerfile`
   - Region: Singapore
5. Add environment variable:
   - `ALLOWED_ORIGINS` = `https://your-site.netlify.app`

### Backend → Docker (manual)
```bash
cd backend
docker build -t lunanusa-api .
docker run -p 8000:8000 \
  -e ALLOWED_ORIGINS="https://lunanusa.netlify.app" \
  lunanusa-api
```

---

## API Reference

### `POST /calculate`

**Request:**
```json
{
  "date":      "2026-03-01",
  "latitude":  -6.2088,
  "longitude": 106.8456,
  "elevation": 50,
  "timezone":  "Asia/Jakarta"
}
```

**Response:**
```json
{
  "astronomical_data": {
    "conjunction_time_utc":    "2026-03-01T10:34:00",
    "conjunction_time_local":  "2026-03-01T17:34:00+07:00",
    "conjunction_before_sunset": true,
    "sunset_time_local":       "2026-03-01T18:07:00+07:00",
    "moon_altitude_apparent":  4.2317,
    "moon_azimuth":            281.443,
    "sun_altitude":            -0.832,
    "elongation":              7.154,
    "moon_age_hours":          7.55,
    "illumination_percent":    0.392,
    "crescent_width_arcmin":   0.724,
    "lag_time_minutes":        43.2
  },
  "classical_results": {
    "sullam_an_nayyirain": { "altitude": 1.9, "mukts_minutes": 7.6, "classification": "Hisab haqiqi bi al-taqrib", "steps": {...} },
    "fath_al_rauf":        { "altitude": 3.2, "classification": "Hisab haqiqi bi al-taqrib (refined)", "steps": {...} },
    "irsyad_al_murid":     { "altitude": 0.66, "classification": "Hisab haqiqi bi al-tadqiq (kontemporer)", "steps": {...} }
  },
  "decisions": {
    "muhammadiyah": { "visible": true,  "reason": "..." },
    "mabims":       { "visible": true,  "reason": "..." }
  },
  "moon_altitude_chart": [
    { "time": "17:30", "moon_alt": 2.1, "sun_alt": 1.4 }
  ]
}
```

---

## Logo Component Usage

```jsx
// Sizes: "small" | "medium" | "large" | "hero"
<Logo size="small"  showText={false} />   // Nav icon only
<Logo size="medium" showText={true}  />   // Standard with wordmark
<Logo size="hero"   showText={false} />   // Landing page mark
```

---

## Favicon Setup

The inline SVG favicon is embedded in `index.html`.

For production icons, export `public/` icons from the SVG:
- `public/favicon.svg`      — 32×32 vector
- `public/apple-touch-icon.png` — 180×180 PNG
- `public/icon-192.png`     — 192×192 PNG (PWA)
- `public/icon-512.png`     — 512×512 PNG (PWA)

Recommended tool: [RealFaviconGenerator](https://realfavicongenerator.net)

---

## Design System

| Token | Value |
|-------|-------|
| Primary Background | `#0B1C2D` |
| Dark Background | `#071524` |
| Card Background | `#0D2035` |
| Gold Accent | `#D4AF37` |
| Gold Light | `#F5D76E` |
| Orbit Teal | `#5FBFBF` |
| Text Primary | `#FFFFFF` |
| Text Muted | `rgba(255,255,255,0.4)` |

**Fonts:**
- Display: Cormorant Garamond (headings, wordmark)
- Body: Outfit (UI text)
- Arabic: Scheherazade New (kitab references)
- Mono: JetBrains Mono (numerical data)

---

## Astronomical Notes

- Ephemeris: AstroPy builtin (based on ERFA/SOFA, equivalent to DE430)
- Coordinates: Topocentric (observer-centered), not geocentric
- Refraction: Bennett (1982) formula, standard atmosphere
- Delta-T: Handled internally by AstroPy Time system
- Conjunction: Found by minimizing moon-sun angular separation

For higher precision, upgrade `solar_system_ephemeris.set('builtin')` to
`solar_system_ephemeris.set('de440')` after downloading the DE440 kernel.

---

*LunaNusa — والقمر قدرناه منازل*
