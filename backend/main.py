"""
LunaNusa — Hilal (Crescent Moon) Calculation Backend
=====================================================
Sistem hisab hilal yang menggabungkan metode kitab klasik Nusantara
dengan astronomi presisi tinggi berbasis ephemeris NASA JPL.

Tiga metode hisab diimplementasikan SESUAI KATEGORI ASLINYA:

  1. Sullam an-Nayyirain (Muhammad Mansur al-Batawi, 1925)
     -> Hisab haqiqi bi al-TAQRIB. Irtifa' hilal = (jam ijtima'->ghurub) x 0,5 deg;
        mukts (lama hilal) = irtifa' x 4 menit. Kriteria: ijtima' qabla al-ghurub.
        Ref: Mansur, Sullam an-Nayyirain Risalah 1 (1925), hal. 8;
             Shofiyullah, AL-WIJDAN III(2), 2018.

  2. Fath al-Rauf al-Mannan (Abdul Jalil bin Abdul Hamid, Kudus/Pati)
     -> Hisab haqiqi bi al-TAQRIB (refined). Berbasis Zij Ulugh Beg + ta'dil
        (equation of center). Lebih halus dari Sullam, tetap tanpa trigonometri bola
        penuh. Implementasi di sini adalah aproksimasi terdokumentasi dari metode
        tabular kitab (tabel asli kitab tidak tersedia digital).

  3. Irsyad al-Murid (Ahmad Ghozali Muhammad Fathullah, Sampang Madura)
     -> Hisab haqiqi bi al-TADQIQ / KONTEMPORER (heliosentris, rumus modern).
        Dihitung dengan ephemeris NASA JPL DE440s (toposentrik, refraksi Bennett) —
        inilah representasi paling tepat dari kategori kontemporer.
        Ref: Ahmad Ghozali, Irsyad al-Murid; Jean Meeus, Astronomical Algorithms (1991).

Sumber data astronomi   : NASA JPL DE440s (Park et al. 2021), via AstroPy.
Klasifikasi metode      : Seminar Hisab Rukyat, Tugu Bogor, 27 April 1992
                          (Kemenag RI, Almanak Hisab Rukyat, 2010).
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List
import math
import os
import pytz
from datetime import datetime, timedelta
import numpy as np

# AstroPy
from astropy.time import Time
from astropy.coordinates import EarthLocation, AltAz, get_body, solar_system_ephemeris
from astropy import units as u

# astroquery (opsional) — untuk cross-check live ke NASA JPL Horizons.
# Di-guard agar API tetap jalan walau paket tidak terpasang (mis. saat deploy minimal).
try:
    from astroquery.jplhorizons import Horizons
    HORIZONS_AVAILABLE = True
except Exception:
    HORIZONS_AVAILABLE = False

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="LunaNusa Hilal API",
    description="Hisab hilal: kitab klasik Nusantara + ephemeris NASA JPL DE440s",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,"
    "http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000,"
    "https://lunanusa.netlify.app",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
    max_age=600,
)

# ── NASA JPL Ephemeris ──────────────────────────────────────────────────────
# DE440s (~31 MB, cakupan 1849–2150) diunduh & di-cache otomatis oleh AstroPy
# dari server data NASA/AstroPy saat pertama dipakai. Jika offline, fallback ke
# 'builtin' (ERFA/SOFA) agar API tetap jalan.
EPHEMERIS = os.getenv("EPHEMERIS", "de440s")
_EPHEMERIS_ACTIVE = "builtin"


def _init_ephemeris():
    """Aktifkan ephemeris NASA JPL; fallback ke builtin bila gagal/offline."""
    global _EPHEMERIS_ACTIVE
    try:
        solar_system_ephemeris.set(EPHEMERIS)
        # Picu unduhan & verifikasi dengan satu kueri kecil
        _ = get_body("moon", Time("2025-01-01T00:00:00"))
        _EPHEMERIS_ACTIVE = EPHEMERIS
    except Exception as e:  # offline / gagal unduh
        solar_system_ephemeris.set("builtin")
        _EPHEMERIS_ACTIVE = "builtin"
        print(f"[LunaNusa] Ephemeris '{EPHEMERIS}' gagal ({e}); pakai 'builtin'.")


@app.on_event("startup")
def _on_startup():
    _init_ephemeris()


# ── Standard atmosphere (untuk refraksi internal AltAz) ─────────────────────
_PRESSURE = 1013.25 * u.hPa
_TEMP = 20 * u.deg_C
_RH = 0.5
_WL = 0.55 * u.micron

# ── Parameter Zij Ulugh Beg (Zij-i Sultani, Samarkand 1437 M) ────────────────
# Dipakai metode taqribi (Fath al-Rauf) yang datanya bersumber dari zij ini.
# Sumber: manuskrip zij_ulugh_begh.pdf (koleksi pengguna) + nilai terdokumentasi
# Zij-i Sultani (Wikipedia; E.S. Kennedy, "A Survey of Islamic Astronomical Tables").
# Nilai signatur Ulugh Beg yang DITERAPKAN (terverifikasi, bukan transkrip manual):
UB_OBLIQUITY = 23.5047                       # mailul kulli ε = 23°30'17" (terukur Ulugh Beg)
UB_TROPICAL_YEAR = 365.242535                # tahun tropis 365h 5j 49m 15d
UB_SOLAR_RATE = 360.0 / UB_TROPICAL_YEAR     # gerak rata-rata Matahari °/hari (≈0,985647)
# Catatan: radix (markaz) sexagesimal manuskrip tidak ditranskrip (tulisan tangan
# abjad, tak terbaca mesin) — bujur rata-rata diangkur ke radix J2000 standar,
# sedangkan obliquity & laju Matahari mengikuti nilai Ulugh Beg di atas.


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────
class CalculationRequest(BaseModel):
    date:      str   = Field(..., description="YYYY-MM-DD (tanggal Masehi)")
    latitude:  float = Field(..., ge=-90,  le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: float = Field(default=0, ge=0)
    timezone:  str   = Field(default="Asia/Jakarta")


# ─────────────────────────────────────────────────────────────────────────────
# MATH UTILITIES
# ─────────────────────────────────────────────────────────────────────────────
def dtr(d): return math.radians(d)
def rtd(r): return math.degrees(r)
def normalize(deg): return deg % 360


def bennett_refraction(alt_deg: float) -> float:
    """Refraksi atmosfer Bennett (1982), derajat, atmosfer standar."""
    if alt_deg < -1.0:
        return 0.0
    h = max(alt_deg, -1.0)
    R_arcmin = 1.02 / math.tan(dtr(h + 10.3 / (h + 5.11)))
    return max(0.0, R_arcmin / 60.0)


def deg_to_dms(deg: float) -> str:
    """Format derajat desimal -> 'dd° mm' ss\"' (untuk tampilan ala kitab)."""
    sign = "-" if deg < 0 else ""
    deg = abs(deg)
    d = int(deg)
    m_full = (deg - d) * 60
    m = int(m_full)
    s = (m_full - m) * 60
    return f"{sign}{d}° {m:02d}' {s:04.1f}\""


def sanitize(v):
    """Konversi tipe numpy/astropy -> tipe Python native untuk JSON."""
    if isinstance(v, dict):
        return {k: sanitize(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [sanitize(i) for i in v]
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    if isinstance(v, np.ndarray):
        return v.tolist()
    return v


def gregorian_to_jd(year: int, month: int, day: float) -> float:
    """Tanggal Masehi -> Julian Day (Meeus, Astronomical Algorithms)."""
    if month <= 2:
        year -= 1
        month += 12
    A = int(year / 100)
    B = 2 - A + int(A / 4)
    return int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + B - 1524.5


# ─────────────────────────────────────────────────────────────────────────────
# ASTROPY — VECTORIZED HELPERS (NASA JPL ephemeris)
# ─────────────────────────────────────────────────────────────────────────────
def _altaz_array(body_name: str, times: List[datetime], location: EarthLocation):
    """(alt_deg, az_deg) array untuk satu benda pada banyak waktu sekaligus.

    Vektorisasi: satu kueri get_body untuk seluruh array waktu — jauh lebih cepat
    daripada loop per-menit memanggil AstroPy ribuan kali.
    """
    obstime = Time(times)
    frame = AltAz(obstime=obstime, location=location,
                  pressure=_PRESSURE, temperature=_TEMP,
                  relative_humidity=_RH, obswl=_WL)
    body = get_body(body_name, obstime, location).transform_to(frame)
    return np.atleast_1d(body.alt.deg), np.atleast_1d(body.az.deg)


def _altaz_single(body_name: str, t: datetime, location: EarthLocation):
    alt, az = _altaz_array(body_name, [t], location)
    return float(alt[0]), float(az[0])


def _separation_array(times: List[datetime], location: EarthLocation) -> np.ndarray:
    """Elongasi (separasi sudut Bulan–Matahari) array, derajat."""
    obstime = Time(times)
    moon = get_body("moon", obstime, location)
    sun = get_body("sun", obstime, location)
    return np.atleast_1d(moon.separation(sun).deg)


def _find_crossing(times: List[datetime], values: np.ndarray,
                   target: float, rising: bool) -> Optional[datetime]:
    """Cari waktu perpotongan nilai melewati target via interpolasi linear."""
    for i in range(1, len(values)):
        a, b = values[i - 1], values[i]
        crossed = (a < target <= b) if rising else (a > target >= b)
        if crossed and (b - a) != 0:
            frac = (target - a) / (b - a)
            dt = (times[i] - times[i - 1]).total_seconds()
            return times[i - 1] + timedelta(seconds=dt * frac)
    return None


def find_sunset(location: EarthLocation, date_utc: datetime) -> datetime:
    """Ghurub (matahari pusat melintas 0°) pada tanggal UTC tsb."""
    start = date_utc.replace(hour=6, minute=0, second=0, microsecond=0)
    times = [start + timedelta(minutes=2 * i) for i in range(301)]  # 06:00–16:00 UTC
    alt, _ = _altaz_array("sun", times, location)
    res = _find_crossing(times, alt, target=0.0, rising=False)
    return res if res else start + timedelta(hours=6)


def find_moonset(location: EarthLocation, sunset_utc: datetime) -> Optional[datetime]:
    """Terbenam Bulan setelah ghurub pada malam yang sama."""
    times = [sunset_utc + timedelta(minutes=2 * i) for i in range(241)]  # 0–8 jam
    alt, _ = _altaz_array("moon", times, location)
    return _find_crossing(times, alt, target=0.0, rising=False)


def find_conjunction(local_date: datetime, location: EarthLocation) -> Optional[datetime]:
    """Ijtima' (new moon) = separasi Bulan–Matahari minimum, dalam ±5 hari."""
    start = datetime(local_date.year, local_date.month, local_date.day) - timedelta(days=5)
    coarse = [start + timedelta(hours=i) for i in range(241)]  # 10 hari, per jam
    sep = _separation_array(coarse, location)
    i = int(np.argmin(sep))
    best = coarse[i]
    fine = [best - timedelta(minutes=90) + timedelta(minutes=j) for j in range(181)]
    sep_f = _separation_array(fine, location)
    return fine[int(np.argmin(sep_f))]


def compute_altitude_chart(location: EarthLocation, sunset_utc: datetime,
                           hours_before=2, hours_after=6, step_minutes=10) -> List[dict]:
    """Grafik tinggi Bulan & Matahari di sekitar ghurub."""
    n = int((hours_before + hours_after) * 60 / step_minutes) + 1
    times = [sunset_utc - timedelta(hours=hours_before) + timedelta(minutes=step_minutes * i)
             for i in range(n)]
    malt, _ = _altaz_array("moon", times, location)
    salt, _ = _altaz_array("sun", times, location)
    return [{"time": t.strftime("%H:%M"),
             "moon_alt": round(float(malt[i]), 2),
             "sun_alt": round(float(salt[i]), 2)} for i, t in enumerate(times)]


# ─────────────────────────────────────────────────────────────────────────────
# METODE 1 — SULLAM AN-NAYYIRAIN  (haqiqi bi al-taqrib)
# ─────────────────────────────────────────────────────────────────────────────
def sullam_an_nayyirain(date: datetime, sunset_utc: datetime,
                        conjunction_utc: Optional[datetime]) -> dict:
    """Metode TAQRIBI asli Sullam an-Nayyirain.

    Teks kitab (Risalah 1, hal. 8): irtifa' hilal = (jumlah jam dari ijtima'
    sampai ghurub) x 0,5°; mukts (lama hilal di atas ufuk) = irtifa' x 4 menit.
    Kriteria awal bulan: ijtima' qabla al-ghurub (ijtimak sebelum magrib ->
    malam itu masuk bulan baru, tanpa syarat ketinggian).
    """
    JD = gregorian_to_jd(date.year, date.month, date.day)

    if conjunction_utc:
        dt_hours = (sunset_utc - conjunction_utc).total_seconds() / 3600.0
    else:
        dt_hours = 0.0

    ijtima_before_sunset = dt_hours > 0
    alt = 0.5 * dt_hours if ijtima_before_sunset else 0.0   # 0,5°/jam
    mukts_minutes = alt * 4.0                                # 4 menit/derajat

    return {
        "altitude": round(alt, 4),
        "mukts_minutes": round(mukts_minutes, 2),
        "classification": "Hisab haqiqi bi al-taqrib",
        "method": "Taqribi asli — irtifa' = Δt(ijtima'→ghurub) × 0,5°",
        "criterion": "Ijtima' qabla al-ghurub",
        "reference": "M. Mansur al-Batawi, Sullam an-Nayyirain Risalah 1 (1925), hal. 8; "
                     "Shofiyullah, AL-WIJDÁN III(2), 2018.",
        "steps": {
            "JD": round(JD, 2),
            "hours_ijtima_to_ghurub": round(dt_hours, 4),
            "rumus_irtifa": "Δt × 0,5°",
            "irtifa_hilal_deg": round(alt, 4),
            "irtifa_hilal_dms": deg_to_dms(alt),
            "rumus_mukts": "irtifa' × 4 menit",
            "mukts_minutes": round(mukts_minutes, 2),
            "ijtima_qabla_ghurub": ijtima_before_sunset,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# METODE 2 — FATH AL-RAUF AL-MANNAN  (haqiqi bi al-taqrib, refined)
# ─────────────────────────────────────────────────────────────────────────────
def fath_al_rauf(date: datetime, lat: float, lon: float, sunset_utc: datetime,
                 conjunction_utc: Optional[datetime]) -> dict:
    """Taqribi berbasis parameter Zij Ulugh Beg: bujur rata-rata + ta'dil al-markaz
    (equation of center), konversi ekliptika->ekuatorial memakai MAILUL KULLI
    Ulugh Beg (ε = 23°30'17"), lalu tinggi hilal dihitung PADA SAAT GHURUB.

    Parameter Ulugh Beg yang diterapkan: obliquity 23,5047° dan laju Matahari dari
    tahun tropis Zij-i Sultani (lihat konstanta UB_* di atas). Radix sexagesimal
    manuskrip (tulisan tangan abjad) tidak ditranskrip — bujur rata-rata diangkur
    ke radix J2000 standar; karakter Ulugh Beg hadir lewat obliquity & laju Matahari.
    """
    # JD pada instan ghurub (sertakan pecahan jam) agar posisi Bulan dievaluasi di ghurub
    JD0 = gregorian_to_jd(date.year, date.month, date.day)
    day_frac = (sunset_utc.hour + sunset_utc.minute / 60 + sunset_utc.second / 3600) / 24.0
    JD = JD0 + day_frac
    N = JD - 2451545.0

    Lm = normalize(218.3165 + 13.17640 * N)        # bujur rata-rata Bulan
    Ls = normalize(280.4665 + UB_SOLAR_RATE * N)   # bujur rata-rata Matahari (laju Ulugh Beg)
    omega_perigee = normalize(83.3532 + 0.11140 * N)
    M_moon = normalize(Lm - omega_perigee)         # khassah (anomali Bulan)
    D = normalize(Lm - Ls)                          # elongasi rata-rata

    # ta'dil al-markaz (equation of center), deret ringkas (kelas Ptolemy/Ulugh Beg)
    q = (6.289 * math.sin(dtr(M_moon))
         - 1.274 * math.sin(dtr(2 * D - M_moon))
         + 0.658 * math.sin(dtr(2 * D))
         - 0.214 * math.sin(dtr(2 * M_moon))
         - 0.110 * math.sin(dtr(D)))
    lambda_true = normalize(Lm + q)

    # Ekliptika -> ekuatorial memakai obliquity Ulugh Beg (beta Bulan diabaikan, taqribi)
    epsilon = UB_OBLIQUITY
    alpha = normalize(rtd(math.atan2(
        math.cos(dtr(epsilon)) * math.sin(dtr(lambda_true)),
        math.cos(dtr(lambda_true)))))                       # asensiorekta
    delta = rtd(math.asin(math.sin(dtr(epsilon)) * math.sin(dtr(lambda_true))))  # deklinasi

    # Sudut waktu Bulan PADA SAAT GHURUB (via GMST -> LST)
    GMST = normalize(280.46061837 + 360.98564736629 * N)
    LST = normalize(GMST + lon)
    H = LST - alpha
    H = (H + 180) % 360 - 180                                 # ke rentang -180..180

    phi = lat
    sin_h = (math.sin(dtr(phi)) * math.sin(dtr(delta))
             + math.cos(dtr(phi)) * math.cos(dtr(delta)) * math.cos(dtr(H)))
    alt_geo = rtd(math.asin(max(-1, min(1, sin_h))))
    alt_app = alt_geo + bennett_refraction(alt_geo)

    return {
        "altitude": round(alt_app, 4),
        "classification": "Hisab haqiqi bi al-taqrib (parameter Ulugh Beg)",
        "method": "Taqribi + ta'dil al-markaz; obliquity Ulugh Beg 23°30'17'; tinggi saat ghurub",
        "criterion": "Wujud al-hilal (ijtima' qabla al-ghurub & irtifa' > 0°)",
        "reference": "Abu Hamdan Abdul Jalil b. Abdul Hamid, Fath al-Rauf al-Mannan; "
                     "data: Ulugh Beg, Zij-i Sultani (1437 M) — manuskrip zij_ulugh_begh.pdf; "
                     "E.S. Kennedy, A Survey of Islamic Astronomical Tables (1956).",
        "steps": {
            "JD_ghurub": round(JD, 4),
            "obliquity_ulugh_beg": UB_OBLIQUITY,
            "laju_matahari_per_hari": round(UB_SOLAR_RATE, 6),
            "Lm_bujur_bulan": round(Lm, 4),
            "Ls_bujur_matahari": round(Ls, 4),
            "khassah_anomali": round(M_moon, 4),
            "tadil_markaz_q": round(q, 4),
            "lambda_true_bulan": round(lambda_true, 4),
            "asensiorekta_bulan": round(alpha, 4),
            "deklinasi_bulan": round(delta, 4),
            "sudut_waktu_H": round(H, 4),
            "irtifa_geometris": round(alt_geo, 4),
            "irtifa_tampak": round(alt_app, 4),
            "irtifa_tampak_dms": deg_to_dms(alt_app),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# METODE 3 — IRSYAD AL-MURID  (haqiqi bi al-tadqiq / KONTEMPORER)
# ─────────────────────────────────────────────────────────────────────────────
def irsyad_al_murid(date: datetime, moon_alt_apparent: float, moon_az: float,
                    elongation: float, sun_alt: float) -> dict:
    """Hisab kontemporer (tadqiq): pakai posisi presisi tinggi NASA JPL DE440s.

    Irsyad al-Murid termasuk hisab haqiqi kontemporer (heliosentris, rumus modern
    setara Jean Meeus), BUKAN taqribi. Karena itu representasi paling tepat adalah
    irtifa' toposentrik-tampak dari ephemeris NASA JPL — itulah yang dipakai di sini.
    """
    JD = gregorian_to_jd(date.year, date.month, date.day)
    return {
        "altitude": round(moon_alt_apparent, 4),
        "classification": "Hisab haqiqi bi al-tadqiq (kontemporer)",
        "method": "Kontemporer — ephemeris presisi tinggi NASA JPL DE440s (toposentrik)",
        "criterion": "Imkan rukyat / kontemporer",
        "reference": "Ahmad Ghozali M. Fathullah, Irsyad al-Murid ilā Maʿrifat ʿIlm al-Falak "
                     "ʿalā al-Rashd al-Jadīd; Jean Meeus, Astronomical Algorithms (1991); "
                     "NASA JPL DE440 (Park et al. 2021).",
        "steps": {
            "JD": round(JD, 2),
            "ephemeris": _EPHEMERIS_ACTIVE,
            "irtifa_tampak_deg": round(moon_alt_apparent, 4),
            "irtifa_tampak_dms": deg_to_dms(moon_alt_apparent),
            "azimuth_bulan": round(moon_az, 4),
            "elongasi": round(elongation, 4),
            "tinggi_matahari": round(sun_alt, 4),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# KRITERIA KEPUTUSAN MODERN
# ─────────────────────────────────────────────────────────────────────────────
def muhammadiyah_criterion(moon_alt: float, conj_before_sunset: bool) -> dict:
    """Wujudul Hilal (Muhammadiyah): ijtima' qabla ghurub DAN irtifa' > 0°."""
    visible = conj_before_sunset and moon_alt > 0.0
    reasons = []
    if not conj_before_sunset:
        reasons.append("Ijtima' terjadi SETELAH ghurub")
    if moon_alt <= 0.0:
        reasons.append(f"Irtifa' hilal {moon_alt:.3f}° ≤ 0°")
    if visible:
        reasons.append(f"Ijtima' sebelum ghurub ✓, irtifa' {moon_alt:.3f}° > 0° ✓")
    return {"visible": visible,
            "criteria": {"ijtima_qabla_ghurub": conj_before_sunset,
                         "irtifa_positif": moon_alt > 0},
            "reason": "; ".join(reasons)}


def mabims_criterion(moon_alt: float, elongation: float, conj_before_sunset: bool) -> dict:
    """MABIMS 2021 (imkan rukyat baru): irtifa' ≥ 3° DAN elongasi ≥ 6,4°."""
    alt_ok = moon_alt >= 3.0
    elo_ok = elongation >= 6.4
    visible = alt_ok and elo_ok and conj_before_sunset
    reasons = []
    if not conj_before_sunset: reasons.append("Ijtima' setelah ghurub")
    if not alt_ok: reasons.append(f"Irtifa' {moon_alt:.3f}° < 3°")
    if not elo_ok: reasons.append(f"Elongasi {elongation:.3f}° < 6,4°")
    if visible: reasons.append("Semua syarat MABIMS 2021 terpenuhi")
    return {"visible": visible,
            "criteria": {"irtifa_ge_3": alt_ok, "elongasi_ge_6_4": elo_ok,
                         "ijtima_qabla_ghurub": conj_before_sunset},
            "reason": "; ".join(reasons)}


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT UTAMA
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/calculate")
async def calculate(req: CalculationRequest):
    try:
        tz = pytz.timezone(req.timezone)
        local_date = datetime.strptime(req.date, "%Y-%m-%d")
        location = EarthLocation(lat=req.latitude * u.deg, lon=req.longitude * u.deg,
                                 height=req.elevation * u.m)

        with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
            # 1. Ghurub
            utc_noon = datetime(local_date.year, local_date.month, local_date.day, 6, 0, 0)
            sunset_utc = find_sunset(location, utc_noon)
            sunset_local = sunset_utc.replace(tzinfo=pytz.utc).astimezone(tz)

            # 2. Ijtima'
            conjunction_utc = find_conjunction(local_date, location)
            conjunction_local = (conjunction_utc.replace(tzinfo=pytz.utc).astimezone(tz)
                                 if conjunction_utc else None)

            # 3. Posisi Bulan & Matahari saat ghurub (presisi NASA JPL)
            moon_alt, moon_az = _altaz_single("moon", sunset_utc, location)
            sun_alt, sun_az = _altaz_single("sun", sunset_utc, location)

            # 4. Elongasi
            elongation = float(_separation_array([sunset_utc], location)[0])

            # 5. Moonset & lag time
            moonset_utc = find_moonset(location, sunset_utc)

            # 6. Grafik tinggi
            chart_data = compute_altitude_chart(location, sunset_utc)

        # 7. Umur Bulan, iluminasi, lebar sabit, lag time
        moon_age_hours = ((sunset_utc - conjunction_utc).total_seconds() / 3600.0
                          if conjunction_utc else 0.0)
        phase_angle = 180.0 - elongation
        illumination = (1 - math.cos(dtr(phase_angle))) / 2 * 100
        crescent_width_arcmin = max(0.0, 0.25 * math.cos(dtr(elongation / 2))) * 60
        lag_time_minutes = ((moonset_utc - sunset_utc).total_seconds() / 60.0
                            if moonset_utc else 0.0)
        conj_before_sunset = bool(conjunction_utc < sunset_utc) if conjunction_utc else False

        # 8. Tiga metode kitab (sesuai kategori aslinya)
        classical = {
            "sullam_an_nayyirain": sullam_an_nayyirain(local_date, sunset_utc, conjunction_utc),
            "fath_al_rauf":        fath_al_rauf(local_date, req.latitude, req.longitude, sunset_utc, conjunction_utc),
            "irsyad_al_murid":     irsyad_al_murid(local_date, moon_alt, moon_az, elongation, sun_alt),
        }

        # 9. Keputusan modern
        decisions = {
            "muhammadiyah": muhammadiyah_criterion(moon_alt, conj_before_sunset),
            "mabims":       mabims_criterion(moon_alt, elongation, conj_before_sunset),
        }

        return sanitize({
            "astronomical_data": {
                "conjunction_time_utc":   conjunction_utc.isoformat() if conjunction_utc else None,
                "conjunction_time_local": conjunction_local.isoformat() if conjunction_local else None,
                "conjunction_before_sunset": conj_before_sunset,
                "sunset_time_utc":   sunset_utc.isoformat(),
                "sunset_time_local": sunset_local.isoformat(),
                "moon_altitude_apparent": round(moon_alt, 6),
                "moon_azimuth":           round(moon_az, 6),
                "sun_altitude":           round(sun_alt, 6),
                "sun_azimuth":            round(sun_az, 6),
                "elongation":             round(elongation, 6),
                "moon_age_hours":         round(moon_age_hours, 4),
                "illumination_percent":   round(illumination, 4),
                "crescent_width_arcmin":  round(crescent_width_arcmin, 4),
                "lag_time_minutes":       round(lag_time_minutes, 2),
                "moonset_utc":            moonset_utc.isoformat() if moonset_utc else None,
                "observation_location": {
                    "latitude": req.latitude, "longitude": req.longitude,
                    "elevation": req.elevation, "timezone": req.timezone,
                },
            },
            "classical_results": classical,
            "decisions": decisions,
            "moon_altitude_chart": chart_data,
            "meta": {
                "ephemeris": f"NASA JPL {_EPHEMERIS_ACTIVE.upper()}"
                             if _EPHEMERIS_ACTIVE != "builtin"
                             else "AstroPy builtin (ERFA/SOFA)",
                "refraction": "Bennett (1982)",
                "method_taxonomy": "Seminar Hisab Rukyat Tugu Bogor, 27 April 1992 "
                                   "(Kemenag, Almanak Hisab Rukyat 2010)",
                "computed_at": datetime.utcnow().isoformat() + "Z",
                "api_version": "2.0.0",
            },
        })

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computation error: {e}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LunaNusa Hilal API", "ephemeris": _EPHEMERIS_ACTIVE}


@app.get("/")
async def root():
    return {
        "service": "LunaNusa Hilal Calculation API",
        "version": "2.0.0",
        "ephemeris": f"NASA JPL {_EPHEMERIS_ACTIVE}",
        "endpoints": ["/calculate", "/health", "/methods", "/horizons-check"],
        "horizons_live": HORIZONS_AVAILABLE,
    }


@app.get("/methods")
async def methods():
    """Penjelasan ringkas tiap metode + referensi (untuk layer edukasi)."""
    return {
        "taxonomy": {
            "urfi": "Aritmetika murni, tanpa kondisi hilal.",
            "haqiqi_taqribi": "Tanpa trigonometri bola; berbasis tabel Zij (mis. Ulugh Beg). "
                              "Contoh: Sullam an-Nayyirain, Fath al-Rauf al-Mannan.",
            "haqiqi_tahqiq": "Memakai trigonometri bola, koreksi sedang. "
                             "Contoh: al-Khulasah al-Wafiyah, Nur al-Anwar.",
            "haqiqi_tadqiq": "Trigonometri + koreksi tinggi (kontemporer/heliosentris). "
                             "Contoh: Irsyad al-Murid, Ephemeris, Jean Meeus.",
            "source": "Seminar Hisab Rukyat, Tugu Bogor, 27 April 1992.",
        },
        "references": [
            "Muhammad Mansur al-Batawi, Sullam an-Nayyirain, Jakarta: Dirasah Khairiyah Manshuriyah, 1925.",
            "Shofiyullah, 'Analisis Pemikiran Muhammad Mansur dalam Hisab Awal Bulan Kamariah', AL-WIJDÁN III(2), 2018.",
            "Ahmad Izzuddin, 'Pemikiran Hisab Rukyah Klasik', Jurnal Hukum Islam 13(1), 2015.",
            "Kemenag RI, Almanak Hisab Rukyat, Jakarta: Ditjen Bimas Islam, 2010.",
            "Ahmad Ghozali M. Fathullah, Irsyad al-Murid ilā Maʿrifat ʿIlm al-Falak ʿalā al-Rashd al-Jadīd, Sampang: Lanbulan.",
            "Jean Meeus, Astronomical Algorithms, Willmann-Bell, 1991.",
            "R. S. Park et al., 'The JPL Planetary and Lunar Ephemerides DE440 and DE441', AJ, 2021.",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# CROSS-CHECK LIVE KE NASA JPL HORIZONS
# ─────────────────────────────────────────────────────────────────────────────
def _horizons_altaz(body_id: str, jd_ut: float, lat: float, lon: float, elev_m: float):
    """Alt/Az AIRLESS (tanpa refraksi) dari NASA JPL Horizons untuk satu benda. id:
    '301'=Bulan, '10'=Matahari. Airless dipakai agar cross-check mengisolasi
    ephemeris (geometri), bukan model atmosfer. Kueri LIVE ke server Horizons."""
    obj = Horizons(id=body_id,
                   location={"lon": lon, "lat": lat, "elevation": elev_m / 1000.0},
                   epochs=jd_ut)
    e = obj.ephemerides(refraction=False)
    return float(e["EL"][0]), float(e["AZ"][0])


def _altaz_airless(body_name: str, t: datetime, location: EarthLocation):
    """Alt/Az toposentrik AIRLESS lokal (frame AltAz tanpa pressure -> tanpa refraksi)."""
    obstime = Time(t)
    frame = AltAz(obstime=obstime, location=location)   # pressure default 0 -> no refraction
    b = get_body(body_name, obstime, location).transform_to(frame)
    return float(b.alt.deg), float(b.az.deg)


@app.post("/horizons-check")
async def horizons_check(req: CalculationRequest):
    """Bandingkan hitungan lokal (DE440s) vs kueri LIVE NASA JPL Horizons,
    untuk posisi Bulan & Matahari saat ghurub. Bukti integrasi NASA real-time."""
    if not HORIZONS_AVAILABLE:
        raise HTTPException(status_code=503,
                            detail="astroquery belum terpasang (pip install astroquery)")
    try:
        location = EarthLocation(lat=req.latitude * u.deg, lon=req.longitude * u.deg,
                                 height=req.elevation * u.m)
        local_date = datetime.strptime(req.date, "%Y-%m-%d")
        with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
            utc_noon = datetime(local_date.year, local_date.month, local_date.day, 6, 0, 0)
            sunset_utc = find_sunset(location, utc_noon)
            moon_alt_l, moon_az_l = _altaz_airless("moon", sunset_utc, location)
            sun_alt_l, sun_az_l = _altaz_airless("sun", sunset_utc, location)

        jd_ut = Time(sunset_utc).jd
        moon_alt_h, moon_az_h = _horizons_altaz("301", jd_ut, req.latitude, req.longitude, req.elevation)
        sun_alt_h, sun_az_h = _horizons_altaz("10", jd_ut, req.latitude, req.longitude, req.elevation)

        def cmp(local, nasa):
            return {"local_de440s": round(local, 5), "nasa_horizons": round(nasa, 5),
                    "diff_arcsec": round((local - nasa) * 3600, 1)}

        return sanitize({
            "sunset_utc": sunset_utc.isoformat(),
            "jd_ut": round(jd_ut, 6),
            "moon": {"altitude": cmp(moon_alt_l, moon_alt_h), "azimuth": cmp(moon_az_l, moon_az_h)},
            "sun":  {"altitude": cmp(sun_alt_l, sun_alt_h),   "azimuth": cmp(sun_az_l, sun_az_h)},
            "source_local": f"NASA JPL {_EPHEMERIS_ACTIVE.upper()} (AstroPy, airless)",
            "source_remote": "NASA JPL Horizons (live query, airless)",
            "note": "Perbandingan posisi geometris (airless/tanpa refraksi) — selisih seharusnya < beberapa detik busur, membuktikan ephemeris lokal == NASA JPL.",
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Horizons query gagal: {e}")


# ── Preflight eksplisit (jaga-jaga di belakang proxy) ───────────────────────
@app.options("/calculate")
async def options_calculate(request: Request):
    origin = request.headers.get("origin", "*")
    resp = Response(status_code=204)
    resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
    resp.headers["Access-Control-Max-Age"] = "600"
    return resp
