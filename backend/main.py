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
from datetime import datetime, timedelta, date
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
    "https://bukhorizainun.github.io,"          # GitHub Pages (frontend)
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


class PrayerTimesRequest(BaseModel):
    date:        str   = Field(..., description="YYYY-MM-DD (tanggal Masehi)")
    latitude:    float = Field(..., ge=-90,  le=90)
    longitude:   float = Field(..., ge=-180, le=180)
    elevation:   float = Field(default=0, ge=0)
    timezone:    str   = Field(default="Asia/Jakarta")
    convention:  str   = Field(default="Kemenag",
                               description="Kemenag | MWL | Egypt | Karachi | ISNA | UmmAlQura")
    asr_madhhab: str   = Field(default="Syafii", description="Syafii (bayangan 1x) | Hanafi (2x)")
    ihtiyat_minutes: int = Field(default=2, ge=0, le=10,
                                 description="Menit ihtiyat (pengaman) ala Kemenag")


class QiblaRequest(BaseModel):
    latitude:  float = Field(..., ge=-90,  le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: float = Field(default=0, ge=0)
    date:      Optional[str] = Field(default=None,
                                     description="Opsional YYYY-MM-DD: jika diisi, hitung waktu "
                                                 "bayangan kiblat (Rashdul Kiblat) harian.")
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
        "endpoints": ["/calculate", "/prayer-times", "/qibla", "/health", "/methods", "/horizons-check"],
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
# JADWAL SHOLAT & ARAH KIBLAT
# ─────────────────────────────────────────────────────────────────────────────
# Ka'bah (Masjidil Haram) — koordinat geodetik WGS84.
KAABA_LAT = 21.422487
KAABA_LON = 39.826206

# Konvensi sudut depresi Matahari untuk Subuh (fajr) & Isya, diukur sebagai
# sudut Matahari DI BAWAH ufuk (geometris). Sumber rangkuman: PrayTimes.org;
# Kemenag RI memakai 20°/18° (Almanak Hisab Rukyat).
PRAYER_CONVENTIONS = {
    "Kemenag":   {"fajr": 20.0, "isha": 18.0, "label": "Kementerian Agama RI"},
    "MWL":       {"fajr": 18.0, "isha": 17.0, "label": "Muslim World League"},
    "Egypt":     {"fajr": 19.5, "isha": 17.5, "label": "Egyptian General Authority"},
    "Karachi":   {"fajr": 18.0, "isha": 18.0, "label": "Univ. of Islamic Sciences, Karachi"},
    "ISNA":      {"fajr": 15.0, "isha": 15.0, "label": "Islamic Society of North America"},
    "UmmAlQura": {"fajr": 18.5, "isha": None, "isha_interval_min": 90,
                  "label": "Umm al-Qura, Makkah"},
}
# Faktor panjang bayangan untuk Ashar (panjang bayangan = faktor × tinggi benda,
# di atas panjang bayangan saat istiwa').
ASR_FACTOR = {"Syafii": 1.0, "Jumhur": 1.0, "Maliki": 1.0, "Hanafi": 2.0}

# Matahari "terbit/terbenam" untuk jadwal sholat: piringan ATAS menyentuh ufuk →
# tinggi pusat Matahari = -(refraksi 34' + semidiameter 16') = -0,8333°.
SUN_HORIZON = -0.8333

# Kompas 16 arah (azimut dari Utara sejati).
COMPASS_16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
              "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def compass_point(bearing: float) -> str:
    return COMPASS_16[int((bearing % 360) / 22.5 + 0.5) % 16]


def qibla_bearing(lat: float, lon: float) -> float:
    """Azimut kiblat: arah ke Ka'bah dari Utara sejati (searah jarum jam).

    Initial bearing great-circle pada bola; akurat untuk penentuan arah kiblat.
    """
    phi = dtr(lat)
    dlon = dtr(KAABA_LON - lon)
    y = math.sin(dlon)
    x = math.cos(phi) * math.tan(dtr(KAABA_LAT)) - math.sin(phi) * math.cos(dlon)
    return normalize(rtd(math.atan2(y, x)))


def great_circle_km(lat: float, lon: float) -> float:
    """Jarak permukaan (haversine) dari (lat,lon) ke Ka'bah, kilometer."""
    R = 6371.0088
    p1, p2 = dtr(lat), dtr(KAABA_LAT)
    dp = dtr(KAABA_LAT - lat)
    dl = dtr(KAABA_LON - lon)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _sun_altaz_airless_array(times: List[datetime], location: EarthLocation):
    """(alt, az) Matahari AIRLESS (tanpa refraksi) untuk banyak waktu sekaligus.

    Airless dipakai karena sudut konvensi sholat (-0,8333°, -18°, -20° …)
    didefinisikan sebagai sudut geometris Matahari terhadap ufuk.
    """
    obstime = Time(times)
    frame = AltAz(obstime=obstime, location=location)   # tanpa pressure → no refraction
    sun = get_body("sun", obstime, location).transform_to(frame)
    return np.atleast_1d(sun.alt.deg), np.atleast_1d(sun.az.deg)


def _local_day_grid(local_date: datetime, tz, step_min: int = 1) -> List[datetime]:
    """Grid waktu (datetime UTC naif) menutupi satu hari kalender LOKAL."""
    day0 = tz.localize(datetime(local_date.year, local_date.month, local_date.day, 0, 0, 0))
    n = int(24 * 60 / step_min) + 1
    return [(day0 + timedelta(minutes=step_min * i)).astimezone(pytz.utc).replace(tzinfo=None)
            for i in range(n)]


def _parabolic_extremum(times: List[datetime], values: np.ndarray, i: int) -> datetime:
    """Refine waktu puncak (transit Matahari) via interpolasi parabolik 3-titik."""
    if i <= 0 or i >= len(values) - 1:
        return times[i]
    y0, y1, y2 = float(values[i - 1]), float(values[i]), float(values[i + 1])
    denom = y0 - 2 * y1 + y2
    if denom == 0:
        return times[i]
    offset = 0.5 * (y0 - y2) / denom                      # satuan indeks, ~[-1,1]
    dt = (times[i + 1] - times[i]).total_seconds()
    return times[i] + timedelta(seconds=offset * dt)


def _sun_declination(t_utc: datetime, location: EarthLocation) -> float:
    """Deklinasi Matahari (derajat) pada instan tertentu — untuk rumus Ashar."""
    sun = get_body("sun", Time(t_utc), location)
    return float(sun.dec.deg)


def _az_crossing_times(times, az, alt, target):
    """Waktu saat azimut Matahari melewati `target` (derajat), hanya saat di atas ufuk."""
    out = []
    for i in range(1, len(az)):
        if alt[i] <= 0.0 and alt[i - 1] <= 0.0:
            continue
        a = ((float(az[i - 1]) - target + 180.0) % 360.0) - 180.0
        b = ((float(az[i]) - target + 180.0) % 360.0) - 180.0
        if abs(b - a) > 180.0:                            # lompatan wrap-around → abaikan
            continue
        if (a <= 0.0 <= b) or (a >= 0.0 >= b):
            if (b - a) == 0:
                continue
            frac = (0.0 - a) / (b - a)
            dt = (times[i] - times[i - 1]).total_seconds()
            tc = times[i - 1] + timedelta(seconds=dt * frac)
            ac = float(alt[i - 1]) + (float(alt[i]) - float(alt[i - 1])) * frac
            if ac > 0.0:
                out.append((tc, ac))
    return out


def compute_prayer_times(req: PrayerTimesRequest) -> dict:
    tz = pytz.timezone(req.timezone)
    local_date = datetime.strptime(req.date, "%Y-%m-%d")
    location = EarthLocation(lat=req.latitude * u.deg, lon=req.longitude * u.deg,
                             height=req.elevation * u.m)
    conv = PRAYER_CONVENTIONS.get(req.convention, PRAYER_CONVENTIONS["Kemenag"])
    asr_factor = ASR_FACTOR.get(req.asr_madhhab, 1.0)

    with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
        times = _local_day_grid(local_date, tz, step_min=1)
        alt, az = _sun_altaz_airless_array(times, location)

        i_tr = int(np.argmax(alt))                        # transit (kulminasi) → Dzuhur
        transit_utc = _parabolic_extremum(times, alt, i_tr)
        decl = _sun_declination(transit_utc, location)

        # Tinggi Matahari saat Ashar: cot(h) = faktor + tan|φ − δ|
        asr_alt = rtd(math.atan(1.0 / (asr_factor + math.tan(abs(dtr(req.latitude - decl))))))

        # Koreksi kerendahan ufuk (dip) untuk observer di ketinggian: ~1,76'·√(h_m)
        dip = 1.76 * math.sqrt(max(req.elevation, 0.0)) / 60.0
        horizon = SUN_HORIZON - dip

        def morning(target):
            return _find_crossing(times[:i_tr + 1], alt[:i_tr + 1], target, rising=True)

        def evening(target):
            return _find_crossing(times[i_tr:], alt[i_tr:], target, rising=False)

        terbit_utc  = morning(horizon)
        maghrib_utc = evening(horizon)
        subuh_utc   = morning(-conv["fajr"])
        ashar_utc   = evening(asr_alt)
        dhuha_utc   = morning(4.5)                         # awal Dhuha: Matahari +4,5°
        if conv.get("isha") is not None:
            isya_utc = evening(-conv["isha"])
        else:                                              # Umm al-Qura: Maghrib + interval tetap
            isya_utc = (maghrib_utc + timedelta(minutes=conv["isha_interval_min"])
                        if maghrib_utc else None)

    # ── Ihtiyat (pengaman) ── tambah ke waktu mulai; kurangi untuk terbit ──────
    ih = timedelta(minutes=req.ihtiyat_minutes)
    subuh   = subuh_utc   + ih if subuh_utc   else None
    dzuhur  = transit_utc + ih
    ashar   = ashar_utc   + ih if ashar_utc   else None
    maghrib = maghrib_utc + ih if maghrib_utc else None
    isya    = isya_utc    + ih if isya_utc    else None
    terbit  = terbit_utc  - ih if terbit_utc  else None
    dhuha   = dhuha_utc   + ih if dhuha_utc   else None
    imsak   = (subuh - timedelta(minutes=10)) if subuh else None

    def fmt(dt_utc):
        if dt_utc is None:
            return None
        loc = dt_utc.replace(tzinfo=pytz.utc).astimezone(tz)
        return {"time": loc.strftime("%H:%M"), "iso": loc.isoformat()}

    return {
        "date": req.date,
        "times": {
            "imsak":   fmt(imsak),
            "subuh":   fmt(subuh),
            "terbit":  fmt(terbit),
            "dhuha":   fmt(dhuha),
            "dzuhur":  fmt(dzuhur),
            "ashar":   fmt(ashar),
            "maghrib": fmt(maghrib),
            "isya":    fmt(isya),
        },
        "convention": {
            "key":        req.convention,
            "label":      conv["label"],
            "fajr_angle": conv["fajr"],
            "isha_angle": conv.get("isha"),
            "asr_madhhab": req.asr_madhhab,
            "asr_factor":  asr_factor,
            "ihtiyat_minutes": req.ihtiyat_minutes,
        },
        "sun": {
            "transit_local":   fmt(transit_utc),
            "declination_deg": round(decl, 4),
            "asr_altitude_deg": round(asr_alt, 4),
            "horizon_deg":     round(horizon, 4),
        },
        "location": {
            "latitude": req.latitude, "longitude": req.longitude,
            "elevation": req.elevation, "timezone": req.timezone,
        },
        "meta": {
            "ephemeris": f"NASA JPL {_EPHEMERIS_ACTIVE.upper()}"
                         if _EPHEMERIS_ACTIVE != "builtin"
                         else "AstroPy builtin (ERFA/SOFA)",
            "note": "Sudut sholat geometris (airless). Maghrib/Terbit pada tinggi pusat "
                    f"{round(horizon, 4)}° (piringan atas di ufuk + koreksi dip).",
            "computed_at": datetime.utcnow().isoformat() + "Z",
        },
    }


def compute_qibla(req: QiblaRequest) -> dict:
    bearing = qibla_bearing(req.latitude, req.longitude)
    out = {
        "qibla_bearing_deg": round(bearing, 4),
        "qibla_bearing_dms": deg_to_dms(bearing),
        "compass_point":     compass_point(bearing),
        "distance_km":       round(great_circle_km(req.latitude, req.longitude), 1),
        "kaaba": {"latitude": KAABA_LAT, "longitude": KAABA_LON},
        "observer": {"latitude": req.latitude, "longitude": req.longitude},
        "method": "Initial bearing great-circle dari Utara sejati (searah jarum jam).",
    }

    # Bonus: waktu bayangan kiblat harian (Rashdul Kiblat lokal) bila tanggal diberi.
    if req.date:
        tz = pytz.timezone(req.timezone)
        local_date = datetime.strptime(req.date, "%Y-%m-%d")
        location = EarthLocation(lat=req.latitude * u.deg, lon=req.longitude * u.deg,
                                 height=req.elevation * u.m)
        with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
            times = _local_day_grid(local_date, tz, step_min=1)
            alt, az = _sun_altaz_airless_array(times, location)

        def to_local(items):
            return [{"time": t.replace(tzinfo=pytz.utc).astimezone(tz).strftime("%H:%M:%S"),
                     "sun_altitude": round(a, 2)} for (t, a) in items]

        # Bayangan benda tegak berlawanan arah azimut Matahari.
        # Bayangan menunjuk KIBLAT  ⇔  azimut Matahari = bearing + 180°.
        out["shadow_aligns_qibla"] = to_local(_az_crossing_times(times, az, alt, (bearing + 180.0) % 360.0))
        # Matahari TEPAT di arah kiblat ⇒ bayangan membelakangi kiblat.
        out["sun_in_qibla_direction"] = to_local(_az_crossing_times(times, az, alt, bearing))
        out["date"] = req.date
        out["note_shadow"] = ("Pada waktu 'shadow_aligns_qibla', bayangan benda tegak menunjuk "
                              "PERSIS ke arah kiblat — kalibrasi kiblat tanpa kompas.")

    return out


@app.post("/prayer-times")
async def prayer_times(req: PrayerTimesRequest):
    try:
        return sanitize(compute_prayer_times(req))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computation error: {e}")


@app.post("/qibla")
async def qibla(req: QiblaRequest):
    try:
        return sanitize(compute_qibla(req))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computation error: {e}")


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
def _preflight(request: Request) -> Response:
    origin = request.headers.get("origin", "*")
    resp = Response(status_code=204)
    resp.headers["Access-Control-Allow-Origin"] = origin
    resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
    resp.headers["Access-Control-Max-Age"] = "600"
    return resp


@app.options("/calculate")
async def options_calculate(request: Request):
    return _preflight(request)


@app.options("/prayer-times")
async def options_prayer_times(request: Request):
    return _preflight(request)


@app.options("/qibla")
async def options_qibla(request: Request):
    return _preflight(request)


# ─────────────────────────────────────────────────────────────────────────────
# KALENDER HIJRIAH OTOMATIS
#   Konversi tabular (Kuwaiti algorithm, kalender Hijriah sipil) sebagai rangka,
#   lalu awal bulan DIKOREKSI secara astronomis: ijtimak (NASA JPL) + kriteria
#   visibilitas hilal (Wujudul Hilal / MABIMS) pada lokasi & ghurub setempat.
# ─────────────────────────────────────────────────────────────────────────────
HIJRI_MONTHS = ["Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
                "Jumadil Awal", "Jumadil Akhir", "Rajab", "Syaban",
                "Ramadhan", "Syawal", "Zulkaidah", "Zulhijah"]
# Indeks via isoweekday()%7 → Ahad=0 … Sabtu=6
WEEKDAYS_ID = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]


def _greg_to_jd(gy: int, gm: int, gd: int) -> int:
    """Tanggal Masehi (Gregorian) → Julian Day Number (integer)."""
    a = (14 - gm) // 12
    y = gy + 4800 - a
    m = gm + 12 * a - 3
    return gd + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def _jd_to_greg(jd: int):
    """JDN → (tahun, bulan, hari) Masehi."""
    a = jd + 32044
    b = (4 * a + 3) // 146097
    c = a - (146097 * b) // 4
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = 100 * b + d - 4800 + m // 10
    return year, month, day


# Kalender Hijriah TABULAR (sipil / Kuwaiti). Epoch 1 Muharram 1 H = JD 1948440.
def _greg_to_hijri(gy: int, gm: int, gd: int):
    jd = _greg_to_jd(gy, gm, gd)
    l = jd - 1948440 + 10632
    n = (l - 1) // 10631
    l = l - 10631 * n + 354
    j = ((10985 - l) // 5316) * ((50 * l) // 17719) + (l // 5670) * ((43 * l) // 15238)
    l = l - ((30 - j) // 15) * ((17719 * j) // 50) - (j // 16) * ((15238 * j) // 43) + 29
    hm = (24 * l) // 709
    hd = l - (709 * hm) // 24
    hy = 30 * n + j - 30
    return hy, hm, hd


def _hijri_to_jd(hy: int, hm: int, hd: int) -> int:
    return ((11 * hy + 3) // 30) + 354 * hy + 30 * hm - (hm - 1) // 2 + hd + 1948440 - 385


def _hijri_to_greg(hy: int, hm: int, hd: int):
    return _jd_to_greg(_hijri_to_jd(hy, hm, hd))


def _weekday_id(d: date) -> str:
    return WEEKDAYS_ID[d.isoweekday() % 7]


class HijriConvertRequest(BaseModel):
    direction: str = Field("g2h", description="g2h (Masehi→Hijriah) | h2g (Hijriah→Masehi)")
    # untuk g2h:
    date: Optional[str] = Field(None, description="YYYY-MM-DD (Masehi) bila direction=g2h")
    # untuk h2g:
    hijri_year:  Optional[int] = Field(None, ge=1, le=2000)
    hijri_month: Optional[int] = Field(None, ge=1, le=12)
    hijri_day:   Optional[int] = Field(None, ge=1, le=30)


class HijriCalendarRequest(BaseModel):
    hijri_year:  int = Field(..., ge=1300, le=1600)
    hijri_month: int = Field(..., ge=1, le=12)
    latitude:    float = Field(default=-6.2, ge=-90, le=90)
    longitude:   float = Field(default=106.8, ge=-180, le=180)
    elevation:   float = Field(default=0, ge=0)
    timezone:    str   = Field(default="Asia/Jakarta")
    criterion:   str   = Field(default="MABIMS",
                               description="MABIMS | Muhammadiyah | Tabular")


def _hilal_decision(eve: date, location: EarthLocation, criterion: str,
                    conj: Optional[datetime] = None):
    """Evaluasi hilal pada ghurub tanggal `eve`. Kembalikan (visible, detail).
    `conj` (ijtimak) boleh di-pass agar tak dihitung ulang untuk tiap malam."""
    utc_noon = datetime(eve.year, eve.month, eve.day, 6, 0, 0)
    with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
        sunset_utc = find_sunset(location, utc_noon)
        if conj is None:
            conj = find_conjunction(datetime(eve.year, eve.month, eve.day), location)
        moon_alt, _ = _altaz_single("moon", sunset_utc, location)
        elong = float(_separation_array([sunset_utc], location)[0])
    conj_before = bool(conj < sunset_utc) if conj else False
    if criterion == "MABIMS":
        crit = mabims_criterion(moon_alt, elong, conj_before)
    else:  # Muhammadiyah / Wujudul Hilal
        crit = muhammadiyah_criterion(moon_alt, conj_before)
    return crit["visible"], {
        "sunset_utc": conj and sunset_utc.isoformat(),
        "moon_altitude": round(moon_alt, 3),
        "elongation": round(elong, 3),
        "conjunction_utc": conj.isoformat() if conj else None,
        "conjunction_before_sunset": conj_before,
        "reason": crit["reason"],
    }


def _month_start(hy: int, hm: int, location: EarthLocation, tz, criterion: str):
    """Tanggal Masehi (date) awal bulan Hijriah (hy, hm) menurut `criterion`.
    Tabular = aritmetika murni; MABIMS/Muhammadiyah = ijtimak + visibilitas."""
    gy, gm, gd = _hijri_to_greg(hy, hm, 1)
    tabular = date(gy, gm, gd)
    if criterion == "Tabular":
        return tabular, None

    # Ijtimak di sekitar awal bulan tabular (find_conjunction cari ±5 hari).
    with solar_system_ephemeris.set(_EPHEMERIS_ACTIVE):
        conj = find_conjunction(datetime(tabular.year, tabular.month, tabular.day), location)
    if conj is None:
        return tabular, None
    conj_local = conj.replace(tzinfo=pytz.utc).astimezone(tz)
    conj_date = conj_local.date()

    detail = None
    # Cek ghurub pada hari ijtimak, lalu hari berikutnya (rukyat 29/30).
    for off in (0, 1):
        eve = conj_date + timedelta(days=off)
        visible, det = _hilal_decision(eve, location, criterion, conj=conj)
        if off == 0:
            detail = det
        if visible:
            return eve + timedelta(days=1), det   # hari sipil berikut = tanggal 1
    # Istikmal: bulan sebelumnya digenapkan 30 hari.
    return conj_date + timedelta(days=2), detail


def compute_hijri_calendar(req: HijriCalendarRequest) -> dict:
    tz = pytz.timezone(req.timezone)
    location = EarthLocation(lat=req.latitude * u.deg, lon=req.longitude * u.deg,
                             height=req.elevation * u.m)

    start, start_detail = _month_start(req.hijri_year, req.hijri_month, location, tz, req.criterion)
    nh_y, nh_m = (req.hijri_year, req.hijri_month + 1) if req.hijri_month < 12 \
        else (req.hijri_year + 1, 1)
    nxt, _ = _month_start(nh_y, nh_m, location, tz, req.criterion)

    length = (nxt - start).days
    if length not in (29, 30):                       # jaga-jaga dari anomali numerik
        length = max(29, min(30, length))

    tabular_g = date(*_hijri_to_greg(req.hijri_year, req.hijri_month, 1))
    today = datetime.now(tz).date()

    days = []
    for i in range(length):
        g = start + timedelta(days=i)
        days.append({
            "hijri_day": i + 1,
            "gregorian": g.isoformat(),
            "weekday": _weekday_id(g),
            "weekday_index": g.isoweekday() % 7,     # Ahad=0 … Sabtu=6 (untuk grid)
            "is_today": g == today,
        })

    return {
        "hijri_year":  req.hijri_year,
        "hijri_month": req.hijri_month,
        "month_name":  HIJRI_MONTHS[req.hijri_month - 1],
        "criterion":   req.criterion,
        "start_gregorian":   start.isoformat(),
        "tabular_gregorian": tabular_g.isoformat(),
        "delta_days_vs_tabular": (start - tabular_g).days,
        "days_in_month": length,
        "start_weekday_index": start.isoweekday() % 7,
        "days": days,
        "hilal_at_start": start_detail,
        "location": {"latitude": req.latitude, "longitude": req.longitude,
                     "elevation": req.elevation, "timezone": req.timezone},
        "meta": {
            "ephemeris": f"NASA JPL {_EPHEMERIS_ACTIVE.upper()}"
                         if _EPHEMERIS_ACTIVE != "builtin"
                         else "AstroPy builtin (ERFA/SOFA)",
            "note": ("Kalender tabular (Kuwaiti) dikoreksi awal bulannya secara astronomis "
                     "via ijtimak + kriteria " + req.criterion + ". Tabular = aritmetika murni."),
            "computed_at": datetime.utcnow().isoformat() + "Z",
        },
    }


@app.post("/hijri-convert")
async def hijri_convert(req: HijriConvertRequest):
    try:
        if req.direction == "h2g":
            if None in (req.hijri_year, req.hijri_month, req.hijri_day):
                raise ValueError("hijri_year, hijri_month, hijri_day wajib untuk h2g")
            gy, gm, gd = _hijri_to_greg(req.hijri_year, req.hijri_month, req.hijri_day)
            g = date(gy, gm, gd)
            return {
                "gregorian": g.isoformat(),
                "weekday": _weekday_id(g),
                "hijri": {"year": req.hijri_year, "month": req.hijri_month,
                          "day": req.hijri_day,
                          "month_name": HIJRI_MONTHS[req.hijri_month - 1]},
                "note": "Kalender Hijriah tabular (sipil). Awal bulan rukyat bisa ±1 hari.",
            }
        # g2h
        ds = req.date or datetime.utcnow().strftime("%Y-%m-%d")
        d = datetime.strptime(ds, "%Y-%m-%d").date()
        hy, hm, hd = _greg_to_hijri(d.year, d.month, d.day)
        return {
            "gregorian": d.isoformat(),
            "weekday": _weekday_id(d),
            "hijri": {"year": hy, "month": hm, "day": hd,
                      "month_name": HIJRI_MONTHS[hm - 1],
                      "formatted": f"{hd} {HIJRI_MONTHS[hm - 1]} {hy} H"},
            "note": "Kalender Hijriah tabular (sipil). Awal bulan rukyat bisa ±1 hari.",
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/hijri-calendar")
async def hijri_calendar(req: HijriCalendarRequest):
    try:
        return sanitize(compute_hijri_calendar(req))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computation error: {e}")


@app.options("/hijri-convert")
async def options_hijri_convert(request: Request):
    return _preflight(request)


@app.options("/hijri-calendar")
async def options_hijri_calendar(request: Request):
    return _preflight(request)
