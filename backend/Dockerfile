# ── LunaNusa Backend — Production Dockerfile ──
FROM python:3.11-slim

LABEL maintainer="LunaNusa"
LABEL description="Hilal calculation API — AstroPy + FastAPI + NASA JPL DE440s"

# Cache AstroPy/ephemeris di dalam /app agar ikut ter-chown ke appuser
ENV XDG_CACHE_HOME=/app/.cache \
    EPHEMERIS=de440s \
    PYTHONUNBUFFERED=1

# System dependencies untuk astropy / numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependency Python (termasuk jplephem untuk ephemeris JPL)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pra-unduh ephemeris NASA JPL DE440s ke dalam image (hindari unduhan saat runtime)
RUN python -c "from astropy.coordinates import solar_system_ephemeris, get_body; from astropy.time import Time; solar_system_ephemeris.set('de440s'); get_body('moon', Time('2025-01-01T00:00:00')); print('DE440s cached')" || echo "WARN: DE440s pre-download skipped (offline build)"

# Copy kode aplikasi
COPY . .

# Non-root user
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Render menyetel $PORT; bind ke situ (fallback 8000 untuk run lokal/Docker manual).
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://localhost:%s/health' % os.getenv('PORT','8000'))" || exit 1

# Shell-form agar ${PORT} ter-ekspansi. 1 worker untuk hemat RAM (free tier 512MB).
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 60
