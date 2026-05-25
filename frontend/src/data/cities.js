/**
 * Daftar kota Indonesia (38 ibu kota provinsi + kota besar) untuk pemilih lokasi.
 * Zona waktu mengikuti pembagian resmi:
 *   WIB  (Asia/Jakarta)  : Sumatera, Jawa, Kalimantan Barat & Tengah
 *   WITA (Asia/Makassar) : Bali, NTB, NTT, Sulawesi, Kalimantan Selatan/Timur/Utara
 *   WIT  (Asia/Jayapura) : Maluku, Maluku Utara, Papua (semua provinsi)
 * Koordinat = titik pusat kota (cukup akurat untuk jadwal sholat; selisih
 * beberapa km hanya menggeser waktu < 1 menit).
 */

const WIB = "Asia/Jakarta";
const WITA = "Asia/Makassar";
const WIT = "Asia/Jayapura";

// { name, prov, lat, lon, tz, cap? }  cap=true → ibu kota provinsi
export const CITIES = [
  // ── Aceh ──
  { name: "Banda Aceh", prov: "Aceh", lat: 5.5483, lon: 95.3238, tz: WIB, cap: true },
  { name: "Lhokseumawe", prov: "Aceh", lat: 5.1801, lon: 97.1507, tz: WIB },
  { name: "Langsa", prov: "Aceh", lat: 4.4683, lon: 97.9683, tz: WIB },

  // ── Sumatera Utara ──
  { name: "Medan", prov: "Sumatera Utara", lat: 3.5952, lon: 98.6722, tz: WIB, cap: true },
  { name: "Binjai", prov: "Sumatera Utara", lat: 3.6001, lon: 98.4854, tz: WIB },
  { name: "Pematangsiantar", prov: "Sumatera Utara", lat: 2.9595, lon: 99.0687, tz: WIB },
  { name: "Tebing Tinggi", prov: "Sumatera Utara", lat: 3.3285, lon: 99.1625, tz: WIB },
  { name: "Sibolga", prov: "Sumatera Utara", lat: 1.7427, lon: 98.7792, tz: WIB },

  // ── Sumatera Barat ──
  { name: "Padang", prov: "Sumatera Barat", lat: -0.9471, lon: 100.4172, tz: WIB, cap: true },
  { name: "Bukittinggi", prov: "Sumatera Barat", lat: -0.3055, lon: 100.3692, tz: WIB },
  { name: "Payakumbuh", prov: "Sumatera Barat", lat: -0.2208, lon: 100.6308, tz: WIB },

  // ── Riau & Kepri ──
  { name: "Pekanbaru", prov: "Riau", lat: 0.5071, lon: 101.4478, tz: WIB, cap: true },
  { name: "Dumai", prov: "Riau", lat: 1.6667, lon: 101.4500, tz: WIB },
  { name: "Tanjung Pinang", prov: "Kepulauan Riau", lat: 0.9186, lon: 104.4558, tz: WIB, cap: true },
  { name: "Batam", prov: "Kepulauan Riau", lat: 1.0456, lon: 104.0305, tz: WIB },

  // ── Jambi ──
  { name: "Jambi", prov: "Jambi", lat: -1.6101, lon: 103.6131, tz: WIB, cap: true },
  { name: "Sungai Penuh", prov: "Jambi", lat: -2.0617, lon: 101.3953, tz: WIB },

  // ── Sumatera Selatan & Babel ──
  { name: "Palembang", prov: "Sumatera Selatan", lat: -2.9761, lon: 104.7754, tz: WIB, cap: true },
  { name: "Lubuklinggau", prov: "Sumatera Selatan", lat: -3.2966, lon: 102.8615, tz: WIB },
  { name: "Prabumulih", prov: "Sumatera Selatan", lat: -3.4321, lon: 104.2356, tz: WIB },
  { name: "Pangkal Pinang", prov: "Kep. Bangka Belitung", lat: -2.1316, lon: 106.1169, tz: WIB, cap: true },

  // ── Bengkulu & Lampung ──
  { name: "Bengkulu", prov: "Bengkulu", lat: -3.8004, lon: 102.2655, tz: WIB, cap: true },
  { name: "Bandar Lampung", prov: "Lampung", lat: -5.3971, lon: 105.2668, tz: WIB, cap: true },
  { name: "Metro", prov: "Lampung", lat: -5.1131, lon: 105.3066, tz: WIB },

  // ── DKI Jakarta ──
  { name: "Jakarta", prov: "DKI Jakarta", lat: -6.2088, lon: 106.8456, tz: WIB, cap: true },

  // ── Banten ──
  { name: "Serang", prov: "Banten", lat: -6.1100, lon: 106.1503, tz: WIB, cap: true },
  { name: "Tangerang", prov: "Banten", lat: -6.1783, lon: 106.6319, tz: WIB },
  { name: "Tangerang Selatan", prov: "Banten", lat: -6.2884, lon: 106.7180, tz: WIB },
  { name: "Cilegon", prov: "Banten", lat: -6.0025, lon: 106.0110, tz: WIB },

  // ── Jawa Barat ──
  { name: "Bandung", prov: "Jawa Barat", lat: -6.9175, lon: 107.6191, tz: WIB, cap: true },
  { name: "Bekasi", prov: "Jawa Barat", lat: -6.2383, lon: 106.9756, tz: WIB },
  { name: "Depok", prov: "Jawa Barat", lat: -6.4025, lon: 106.7942, tz: WIB },
  { name: "Bogor", prov: "Jawa Barat", lat: -6.5950, lon: 106.8166, tz: WIB },
  { name: "Cimahi", prov: "Jawa Barat", lat: -6.8722, lon: 107.5425, tz: WIB },
  { name: "Cirebon", prov: "Jawa Barat", lat: -6.7320, lon: 108.5523, tz: WIB },
  { name: "Sukabumi", prov: "Jawa Barat", lat: -6.9277, lon: 106.9300, tz: WIB },
  { name: "Tasikmalaya", prov: "Jawa Barat", lat: -7.3274, lon: 108.2207, tz: WIB },

  // ── Jawa Tengah ──
  { name: "Semarang", prov: "Jawa Tengah", lat: -6.9667, lon: 110.4167, tz: WIB, cap: true },
  { name: "Surakarta (Solo)", prov: "Jawa Tengah", lat: -7.5755, lon: 110.8243, tz: WIB },
  { name: "Magelang", prov: "Jawa Tengah", lat: -7.4706, lon: 110.2178, tz: WIB },
  { name: "Salatiga", prov: "Jawa Tengah", lat: -7.3305, lon: 110.5084, tz: WIB },
  { name: "Pekalongan", prov: "Jawa Tengah", lat: -6.8886, lon: 109.6753, tz: WIB },
  { name: "Tegal", prov: "Jawa Tengah", lat: -6.8694, lon: 109.1402, tz: WIB },
  { name: "Purwokerto", prov: "Jawa Tengah", lat: -7.4214, lon: 109.2345, tz: WIB },

  // ── DI Yogyakarta ──
  { name: "Yogyakarta", prov: "DI Yogyakarta", lat: -7.7956, lon: 110.3695, tz: WIB, cap: true },

  // ── Jawa Timur ──
  { name: "Surabaya", prov: "Jawa Timur", lat: -7.2575, lon: 112.7521, tz: WIB, cap: true },
  { name: "Malang", prov: "Jawa Timur", lat: -7.9666, lon: 112.6326, tz: WIB },
  { name: "Kediri", prov: "Jawa Timur", lat: -7.8480, lon: 112.0178, tz: WIB },
  { name: "Madiun", prov: "Jawa Timur", lat: -7.6298, lon: 111.5239, tz: WIB },
  { name: "Mojokerto", prov: "Jawa Timur", lat: -7.4722, lon: 112.4338, tz: WIB },
  { name: "Blitar", prov: "Jawa Timur", lat: -8.0954, lon: 112.1609, tz: WIB },
  { name: "Probolinggo", prov: "Jawa Timur", lat: -7.7543, lon: 113.2159, tz: WIB },
  { name: "Pasuruan", prov: "Jawa Timur", lat: -7.6453, lon: 112.9075, tz: WIB },
  { name: "Batu", prov: "Jawa Timur", lat: -7.8672, lon: 112.5239, tz: WIB },
  { name: "Jember", prov: "Jawa Timur", lat: -8.1727, lon: 113.7002, tz: WIB },
  { name: "Banyuwangi", prov: "Jawa Timur", lat: -8.2192, lon: 114.3691, tz: WIB },

  // ── Kalimantan Barat (WIB) ──
  { name: "Pontianak", prov: "Kalimantan Barat", lat: -0.0263, lon: 109.3425, tz: WIB, cap: true },
  { name: "Singkawang", prov: "Kalimantan Barat", lat: 0.9057, lon: 108.9837, tz: WIB },

  // ── Kalimantan Tengah (WIB) ──
  { name: "Palangka Raya", prov: "Kalimantan Tengah", lat: -2.2089, lon: 113.9167, tz: WIB, cap: true },

  // ── Kalimantan Selatan (WITA) ──
  { name: "Banjarmasin", prov: "Kalimantan Selatan", lat: -3.3186, lon: 114.5944, tz: WITA, cap: true },
  { name: "Banjarbaru", prov: "Kalimantan Selatan", lat: -3.4572, lon: 114.8290, tz: WITA },

  // ── Kalimantan Timur (WITA) ──
  { name: "Samarinda", prov: "Kalimantan Timur", lat: -0.5022, lon: 117.1536, tz: WITA, cap: true },
  { name: "Balikpapan", prov: "Kalimantan Timur", lat: -1.2379, lon: 116.8529, tz: WITA },
  { name: "Bontang", prov: "Kalimantan Timur", lat: 0.1340, lon: 117.4983, tz: WITA },

  // ── Kalimantan Utara (WITA) ──
  { name: "Tanjung Selor", prov: "Kalimantan Utara", lat: 2.8375, lon: 117.3664, tz: WITA, cap: true },
  { name: "Tarakan", prov: "Kalimantan Utara", lat: 3.3000, lon: 117.6333, tz: WITA },

  // ── Bali ──
  { name: "Denpasar", prov: "Bali", lat: -8.6705, lon: 115.2126, tz: WITA, cap: true },
  { name: "Singaraja", prov: "Bali", lat: -8.1120, lon: 115.0882, tz: WITA },

  // ── Nusa Tenggara Barat ──
  { name: "Mataram", prov: "Nusa Tenggara Barat", lat: -8.5833, lon: 116.1167, tz: WITA, cap: true },
  { name: "Bima", prov: "Nusa Tenggara Barat", lat: -8.4600, lon: 118.7268, tz: WITA },

  // ── Nusa Tenggara Timur ──
  { name: "Kupang", prov: "Nusa Tenggara Timur", lat: -10.1772, lon: 123.6070, tz: WITA, cap: true },
  { name: "Ende", prov: "Nusa Tenggara Timur", lat: -8.8432, lon: 121.6627, tz: WITA },
  { name: "Maumere", prov: "Nusa Tenggara Timur", lat: -8.6199, lon: 122.2111, tz: WITA },

  // ── Sulawesi Selatan ──
  { name: "Makassar", prov: "Sulawesi Selatan", lat: -5.1477, lon: 119.4327, tz: WITA, cap: true },
  { name: "Parepare", prov: "Sulawesi Selatan", lat: -4.0135, lon: 119.6255, tz: WITA },
  { name: "Palopo", prov: "Sulawesi Selatan", lat: -2.9925, lon: 120.1969, tz: WITA },

  // ── Sulawesi Tengah ──
  { name: "Palu", prov: "Sulawesi Tengah", lat: -0.9003, lon: 119.8779, tz: WITA, cap: true },

  // ── Sulawesi Tenggara ──
  { name: "Kendari", prov: "Sulawesi Tenggara", lat: -3.9778, lon: 122.5150, tz: WITA, cap: true },
  { name: "Bau-Bau", prov: "Sulawesi Tenggara", lat: -5.4708, lon: 122.6166, tz: WITA },

  // ── Sulawesi Utara ──
  { name: "Manado", prov: "Sulawesi Utara", lat: 1.4748, lon: 124.8421, tz: WITA, cap: true },
  { name: "Bitung", prov: "Sulawesi Utara", lat: 1.4406, lon: 125.1217, tz: WITA },
  { name: "Kotamobagu", prov: "Sulawesi Utara", lat: 0.7333, lon: 124.3167, tz: WITA },

  // ── Gorontalo & Sulawesi Barat ──
  { name: "Gorontalo", prov: "Gorontalo", lat: 0.5435, lon: 123.0568, tz: WITA, cap: true },
  { name: "Mamuju", prov: "Sulawesi Barat", lat: -2.6748, lon: 118.8885, tz: WITA, cap: true },

  // ── Maluku (WIT) ──
  { name: "Ambon", prov: "Maluku", lat: -3.6954, lon: 128.1814, tz: WIT, cap: true },
  { name: "Tual", prov: "Maluku", lat: -5.6306, lon: 132.7517, tz: WIT },

  // ── Maluku Utara (WIT) ──
  { name: "Sofifi", prov: "Maluku Utara", lat: 0.7333, lon: 127.5667, tz: WIT, cap: true },
  { name: "Ternate", prov: "Maluku Utara", lat: 0.7900, lon: 127.3667, tz: WIT },

  // ── Papua (WIT) ──
  { name: "Jayapura", prov: "Papua", lat: -2.5337, lon: 140.7181, tz: WIT, cap: true },
  { name: "Biak", prov: "Papua", lat: -1.1900, lon: 136.0900, tz: WIT },

  // ── Papua Barat ──
  { name: "Manokwari", prov: "Papua Barat", lat: -0.8615, lon: 134.0620, tz: WIT, cap: true },

  // ── Papua Barat Daya ──
  { name: "Sorong", prov: "Papua Barat Daya", lat: -0.8762, lon: 131.2558, tz: WIT, cap: true },

  // ── Papua Tengah ──
  { name: "Nabire", prov: "Papua Tengah", lat: -3.3667, lon: 135.4833, tz: WIT, cap: true },
  { name: "Timika", prov: "Papua Tengah", lat: -4.5466, lon: 136.8862, tz: WIT },

  // ── Papua Pegunungan ──
  { name: "Wamena", prov: "Papua Pegunungan", lat: -4.0989, lon: 138.9389, tz: WIT, cap: true },

  // ── Papua Selatan ──
  { name: "Merauke", prov: "Papua Selatan", lat: -8.4932, lon: 140.4018, tz: WIT, cap: true },
];

/** Cari kota berdasar substring nama / provinsi (case-insensitive), urut ibu kota dulu. */
export function searchCities(query, limit = 40) {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.filter((c) => c.cap).slice(0, limit);
  return CITIES
    .filter((c) => c.name.toLowerCase().includes(q) || c.prov.toLowerCase().includes(q))
    .slice(0, limit);
}
