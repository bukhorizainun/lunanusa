/**
 * Kitab Klasik Page
 * Referensi edukatif metode falak Nusantara untuk santri & masyarakat awam.
 * Data pengarang/judul/era/klasifikasi diverifikasi dari sumber akademik.
 */

import { useState } from "react";

/* ───────────────────────── Data Kitab (terverifikasi) ───────────────────────── */
const KITABS = [
  {
    key: "sullam",
    arabic: "سُلَّمُ النَّيِّرَيْن",
    roman: "Sullam an-Nayyirain",
    full: "Sullam an-Nayyirain fī Maʿrifat al-Ijtimāʿ wa al-Kusūfain",
    author: "Muhammad Mansur al-Batawi (Guru Mansur)",
    era: "1344 H / 1925 M",
    origin: "Betawi (Jakarta)",
    method: "Hisab Hakiki Taqribi",
    accuracy: "≈ ±2° (cenderung lebih tinggi)",
    color: "amber",
    description: `Kitab falak paling masyhur di Nusantara, disusun Muhammad Mansur bin Abdul Hamid
al-Batawi (w. 1967 M) — dikenal "Guru Mansur". Data astronominya berasal dari Zij Ulugh Beg
as-Samarqandi (w. 1449 M) yang markaznya dipindah ke Jakarta. Penentuan awal bulan memakai kriteria
ijtimāʿ qabla al-ghurūb: bila ijtimak (konjungsi) terjadi sebelum Matahari terbenam, malam itu sudah
masuk bulan baru — tanpa syarat ketinggian hilal tertentu.`,
    steps: [
      { n: "1", title: "Saat Ijtimak (al-ʿAlāmah al-Muʿaddalah)", formula: "dari tabel: ʿalāmah, hiṣṣah, khāṣṣah, markaz, auj",
        desc: "Hitung waktu ijtimak dari tabel harakat (gerak) Bulan & Matahari Zij Ulugh Beg, satuan burj–darajah–daqiqah." },
      { n: "2", title: "Kriteria Awal Bulan", formula: "ijtimāʿ qabla al-ghurūb",
        desc: "Jika ijtimak jatuh sebelum ghurub → malam itu masuk bulan baru (mengikuti waktu gurubiyah)." },
      { n: "3", title: "Irtifaʿ (Tinggi) Hilal", formula: "h = (jam ijtimak → ghurub) × 0,5°",
        desc: "Rumus taqribi asli kitab (Risalah 1, hal. 8): tiap jam selisih = ½ derajat tinggi." },
      { n: "4", title: "Mukts (Lama Hilal di Ufuk)", formula: "mukts = h × 4 menit",
        desc: "Lama hilal di atas ufuk setelah ghurub = tinggi hilal dikalikan 4 menit per derajat." },
    ],
    limitations: `Data Ulugh Beg tidak pernah dikoreksi sejak 1925, sehingga tinggi hilal cenderung lebih
tinggi dari metode kontemporer. Mansur sendiri menulis tanbih (peringatan) agar saat ijtimak dikoreksi
dengan mengamati pertengahan gerhana. Tidak memakai trigonometri bola maupun paralaks toposentrik.`,
    refs: [
      "M. Mansur al-Batawi, Sullam an-Nayyirain Risalah 1, Jakarta: Dirasah Khairiyah Manshuriyah, 1925.",
      "Shofiyullah, “Analisis Pemikiran Muhammad Mansur dalam Hisab Awal Bulan Kamariah”, AL-WIJDÁN III(2), 2018.",
    ],
  },
  {
    key: "fathurrauf",
    arabic: "فَتْحُ الرَّؤُوفِ المَنَّان",
    roman: "Fath al-Rauf al-Mannan",
    full: "Fath al-Raʾūf al-Mannān fī Maʿrifat Awwal al-Syuhūr wa al-Kusūfain",
    author: "Abu Hamdan Abdul Jalil bin Abdul Hamid (Kudus)",
    era: "Pertengahan abad 20 M (w. 1394 H / 1974 M)",
    origin: "Bulumanis, Tayu, Pati / Kudus — Jawa Tengah",
    method: "Hisab Hakiki Taqribi",
    accuracy: "≈ ±1–2°",
    color: "teal",
    description: `Disusun KH. Abu Hamdan Abdul Jalil bin Abdul Hamid dari Kudus (w. 1974 M di Makkah),
yang pernah menjadi ketua Lajnah Falakiyah PBNU. Seperti Sullam, kitab ini berbasis Zij Ulugh Beg dan
teori geosentris Ptolemy, tetapi lebih halus karena menambahkan taʿdīl al-markaz (equation of center /
koreksi anomali) sehingga posisi Bulan lebih teliti dibanding mean-motion murni.`,
    steps: [
      { n: "1", title: "Bujur Rata-rata Bulan & Matahari", formula: "λ̄☽ , λ̄☉ dari tabel harakat",
        desc: "Ambil gerak rata-rata Bulan dan Matahari dari tabel Zij untuk tanggal yang dihitung." },
      { n: "2", title: "Khāṣṣah (Anomali)", formula: "M = λ̄☽ − bujur ḥaḍīḍ (perigee)",
        desc: "Jarak Bulan dari titik terdekatnya (perigee), dasar koreksi anomali." },
      { n: "3", title: "Taʿdīl al-Markaz", formula: "q = 6,289° sin M − 1,274° sin(2D−M) + …",
        desc: "Equation of center — koreksi yang membedakan Fath al-Rauf dari Sullam." },
      { n: "4", title: "Bujur Sejati & Deklinasi", formula: "λ☽ = λ̄☽ + q ; δ = arcsin(sin ε sin λ☽)",
        desc: "Bujur Bulan terkoreksi, lalu konversi ke ekuatorial memakai mailul kulli Ulugh Beg ε = 23°30'17\"." },
      { n: "5", title: "Tinggi Hilal saat Ghurub", formula: "sin h = sin φ sin δ + cos φ cos δ cos H",
        desc: "Tinggi hilal dievaluasi pada saat Matahari terbenam memakai sudut waktu H." },
    ],
    limitations: `Masih kategori taqribi: data Zij Ulugh Beg lama, tanpa koreksi tinggi (perturbasi
lengkap, lintang Bulan β, paralaks), sehingga cenderung over-estimasi. Pada LunaNusa diterapkan parameter
Ulugh Beg yang terdokumentasi (obliquity 23°30'17\" & laju Matahari dari tahun tropis Zij-i Sultani);
radix sexagesimal manuskrip tulisan tangan tidak ditranskrip (tak terbaca mesin), jadi bujur rata-rata
diangkur ke radix modern. Nilai bersifat ilustratif kelas taqribi.`,
    refs: [
      "Abu Hamdan Abdul Jalil b. Abdul Hamid, Fath al-Raʾūf al-Mannān, Kudus.",
      "Ulugh Beg, Zīj-i Sulṭānī (Samarkand, 1437 M) — manuskrip zij_ulugh_begh.pdf.",
      "E. S. Kennedy, A Survey of Islamic Astronomical Tables, 1956.",
      "Kemenag RI, Almanak Hisab Rukyat, Jakarta: Ditjen Bimas Islam, 2010 (klasifikasi seminar Bogor 1992).",
    ],
  },
  {
    key: "irsyadul",
    arabic: "إِرْشَادُ المُرِيد",
    roman: "Irsyad al-Murid",
    full: "Irsyād al-Murīd ilā Maʿrifat ʿIlm al-Falak ʿalā al-Raṣd al-Jadīd",
    author: "Ahmad Ghozali bin Muhammad Fathullah al-Sampani",
    era: "Awal abad 21 M (~1430-an H)",
    origin: "Lanbulan, Sampang — Madura",
    method: "Hisab Hakiki Tadqiq (Kontemporer)",
    accuracy: "Setara ephemeris modern (≈ detik busur)",
    color: "purple",
    description: `Karya KH. Ahmad Ghozali Muhammad Fathullah dari Lanbulan, Sampang (Madura). Berbeda
dari dua kitab di atas, Irsyad al-Murid TERMASUK hisab hakiki kontemporer (tadqiq) — berbasis teori
heliosentris dan rumus matematis modern (setara algoritma Jean Meeus / ELP–VSOP), TANPA tabel. Judulnya
“ʿalā al-Raṣd al-Jadīd” (berdasarkan pengamatan baru) menegaskan sifat kontemporernya. Kitab ini
penyempurnaan karya Ghozali sebelumnya (Faidl al-Karim, Tsamarat al-Fikar) yang dinilai kurang teliti.`,
    steps: [
      { n: "1", title: "Julian Day & Epoch J2000", formula: "JD ; T = (JD − 2451545)/36525",
        desc: "Konversi tanggal ke Julian Day sebagai dasar perhitungan presisi." },
      { n: "2", title: "Posisi Presisi Bulan & Matahari", formula: "ephemeris (DE440 / ELP–VSOP)",
        desc: "Posisi dihitung dari deret perturbasi lengkap atau ephemeris numerik NASA JPL." },
      { n: "3", title: "Koreksi Toposentrik & Paralaks", formula: "geosentris → toposentris (φ, λ, elevasi)",
        desc: "Posisi disesuaikan ke lokasi pengamat di permukaan Bumi, termasuk paralaks Bulan." },
      { n: "4", title: "Refraksi Atmosfer", formula: "R = Bennett(h)",
        desc: "Koreksi pembiasan cahaya oleh atmosfer untuk tinggi tampak (mar’i)." },
      { n: "5", title: "Tinggi Tampak Hilal", formula: "h_mar’i = h_toposentris + R",
        desc: "Tinggi hilal akhir yang dibandingkan dengan kriteria visibilitas (mis. MABIMS)." },
    ],
    limitations: `Membutuhkan komputasi rumus modern (bukan sekadar penjumlahan tabel), sehingga lebih
rumit dihitung manual. Pada LunaNusa, kategori kontemporer ini diwakili oleh perhitungan presisi
ephemeris NASA JPL DE440s — representasi paling tepat dari kelas tadqiq.`,
    refs: [
      "Ahmad Ghozali M. Fathullah, Irsyād al-Murīd ilā Maʿrifat ʿIlm al-Falak ʿalā al-Raṣd al-Jadīd, Sampang: Lanbulan.",
      "Jean Meeus, Astronomical Algorithms, Willmann-Bell, 1991.",
      "R. S. Park dkk., “The JPL Planetary and Lunar Ephemerides DE440 and DE441”, AJ, 2021.",
    ],
  },
];

/* ───────────────────────── Glosarium istilah ───────────────────────── */
const GLOSSARY = [
  ["Ijtimak (konjungsi)", "Saat Bulan & Matahari berada pada bujur ekliptika yang sama — awal siklus bulan baru."],
  ["Ghurub", "Terbenamnya Matahari; acuan utama pengamatan hilal."],
  ["Hilal", "Bulan sabit tipis pertama yang tampak setelah ijtimak, penanda awal bulan Hijriah."],
  ["Irtifaʿ", "Tinggi/ketinggian hilal di atas ufuk (horizon), diukur dalam derajat."],
  ["Elongasi", "Jarak sudut Bulan–Matahari; makin besar, sabit makin tebal dan mudah dilihat."],
  ["Mukts", "Lama hilal berada di atas ufuk setelah ghurub (menit) — makin lama, makin mudah dirukyat."],
  ["Wujudul Hilal", "Kriteria Muhammadiyah: ijtimak sebelum ghurub & hilal sudah di atas ufuk (h > 0°)."],
  ["MABIMS 2021", "Kriteria imkan rukyat: tinggi ≥ 3° dan elongasi ≥ 6,4° (Brunei, Indonesia, Malaysia, Singapura)."],
  ["Markaz / Zij", "Markaz = epoch/titik acuan perhitungan; Zij = tabel data astronomi (mis. Zij Ulugh Beg)."],
  ["Taqribi vs Tadqiq", "Taqribi = pendekatan berbasis tabel tanpa trigonometri bola; tadqiq = kontemporer presisi tinggi."],
];

/* ───────────────────────── Komponen warna ───────────────────────── */
const colorMap = {
  amber:  { border: "border-amber-500/20",  text: "text-amber-400",  bg: "bg-amber-900/10",  dot: "bg-amber-400" },
  teal:   { border: "border-teal-500/20",   text: "text-teal-400",   bg: "bg-teal-900/10",   dot: "bg-teal-400" },
  purple: { border: "border-purple-500/20", text: "text-purple-400", bg: "bg-purple-900/10", dot: "bg-purple-400" },
};

function KitabCard({ k }) {
  const [open, setOpen] = useState(false);
  const c = colorMap[k.color];

  return (
    <div className={`border ${c.border} rounded-sm overflow-hidden`}>
      <div className={`${c.bg} px-6 py-5 cursor-pointer`} onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`text-2xl font-light mb-1 ${c.text}`} style={{ fontFamily: "'Scheherazade New', 'Amiri', serif", direction: "rtl" }}>
              {k.arabic}
            </div>
            <div className="text-white/80 text-lg font-light tracking-wide" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {k.roman}
            </div>
            <div className="text-white/40 text-xs mt-1 tracking-wider">{k.full}</div>
          </div>
          <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center mt-1 ${c.text} text-lg transition-transform duration-300 ${open ? "rotate-45" : ""}`}>
            +
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <Chip label={k.author} />
          <Chip label={k.era} />
          <Chip label={k.origin} />
          <span className={`text-[10px] tracking-wider px-2.5 py-1 rounded-sm border ${c.border} ${c.text}`}>
            {k.method}
          </span>
        </div>
      </div>

      {open && (
        <div className="bg-[#0D2035] px-6 py-6 space-y-6">
          <p className="text-white/50 text-sm leading-relaxed">{k.description}</p>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
            <div><span className="text-white/30 uppercase tracking-wider">Akurasi: </span><span className={c.text}>{k.accuracy}</span></div>
          </div>

          <div>
            <h4 className={`text-xs tracking-[0.2em] uppercase ${c.text} mb-3`}>Langkah Perhitungan</h4>
            <div className="space-y-3">
              {k.steps.map(s => (
                <div key={s.n} className="flex gap-4">
                  <div className={`w-6 h-6 rounded-full ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className={`text-[10px] ${c.text}`}>{s.n}</span>
                  </div>
                  <div>
                    <div className="text-white/70 text-sm mb-0.5">{s.title}</div>
                    <div className="font-mono text-[11px] text-[#D4AF37]/70 mb-1 bg-[#0B1C2D] px-2.5 py-1 rounded-sm inline-block">{s.formula}</div>
                    <div className="text-white/35 text-xs">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`border-l-2 ${c.border} pl-4`}>
            <div className={`text-[10px] tracking-wider uppercase ${c.text} mb-1`}>Keterbatasan</div>
            <p className="text-white/35 text-xs leading-relaxed">{k.limitations}</p>
          </div>

          <div className={`border-l-2 ${c.border} pl-4`}>
            <div className={`text-[10px] tracking-wider uppercase ${c.text} mb-1`}>Rujukan</div>
            <ul className="text-white/35 text-[11px] leading-relaxed list-disc list-inside space-y-0.5">
              {k.refs.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label }) {
  return (
    <span className="text-[10px] tracking-wider text-white/30 bg-white/5 px-2 py-0.5 rounded-sm">
      {label}
    </span>
  );
}

export default function KitabPage() {
  return (
    <div className="min-h-screen bg-[#0B1C2D] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10 flex items-start gap-4">
          <div className="w-px h-12 bg-[#D4AF37]/40 mt-1" />
          <div>
            <h2 className="text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase mb-1">المصادر الفلكية</h2>
            <h1 className="text-white text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Referensi Kitab Falak
            </h1>
            <p className="text-white/30 text-sm mt-2 leading-relaxed max-w-xl">
              Penjelasan untuk santri & masyarakat awam: bagaimana awal bulan Hijriah ditentukan,
              dari kitab taqribi klasik hingga hisab kontemporer berbasis data NASA.
            </p>
          </div>
        </div>

        {/* Taksonomi metode hisab (seminar Bogor 1992) */}
        <div className="mb-10 border border-[#D4AF37]/10 rounded-sm bg-[#0D2035] p-6">
          <h3 className="text-[#D4AF37]/70 text-xs tracking-[0.2em] uppercase mb-1">Tingkatan Metode Hisab</h3>
          <p className="text-white/30 text-[11px] mb-4">Klasifikasi resmi — Seminar Hisab Rukyat, Tugu Bogor, 27 April 1992 (Kemenag RI).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              ["1. Hisab ʿUrfi", "Aritmetika murni (umur bulan 29/30 berselang-seling), tanpa menghitung kondisi hilal.", "text-white/40"],
              ["2. Hakiki Taqribi", "Berbasis tabel Zij (Ulugh Beg), tanpa trigonometri bola. → Sullam, Fath al-Rauf.", "text-amber-400"],
              ["3. Hakiki Tahqiq", "Memakai trigonometri bola, koreksi sedang. → al-Khulasah al-Wafiyah, Nur al-Anwar.", "text-teal-400"],
              ["4. Hakiki Tadqiq (Kontemporer)", "Trigonometri + koreksi tinggi / ephemeris. → Irsyad al-Murid, Ephemeris, Jean Meeus.", "text-purple-400"],
            ].map(([t, d, col]) => (
              <div key={t} className="bg-[#0B1C2D] rounded-sm px-4 py-3">
                <div className={`text-sm mb-1 ${col}`}>{t}</div>
                <div className="text-white/40 leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ringkasan perbandingan */}
        <div className="grid grid-cols-3 gap-px bg-[#D4AF37]/10 mb-8 rounded-sm overflow-hidden">
          {[
            { label: "Sullam an-Nayyirain", acc: "±2°",   terms: "Taqribi · tabel",   date: "1925" },
            { label: "Fath al-Rauf",        acc: "±1–2°", terms: "Taqribi · taʿdīl", date: "~1950" },
            { label: "Irsyad al-Murid",     acc: "presisi", terms: "Kontemporer",     date: "~2000" },
          ].map(({ label, acc, terms, date }) => (
            <div key={label} className="bg-[#0D2035] px-5 py-4 text-center">
              <div className="text-white/60 text-xs mb-2 font-light">{label}</div>
              <div className="text-[#D4AF37] text-lg font-light">{acc}</div>
              <div className="text-white/25 text-[10px] tracking-wider mt-1">{terms} · {date}</div>
            </div>
          ))}
        </div>

        {/* Kartu kitab */}
        <div className="space-y-4">
          {KITABS.map(k => <KitabCard key={k.key} k={k} />)}
        </div>

        {/* Kriteria keputusan modern */}
        <div className="mt-12">
          <div className="border-t border-[#D4AF37]/10 pt-8">
            <h2 className="text-white/60 text-sm tracking-[0.2em] uppercase mb-6" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Kriteria Keputusan Modern
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0D2035] border border-emerald-500/20 rounded-sm p-5">
                <div className="text-emerald-400 text-xs tracking-[0.2em] uppercase mb-2">Muhammadiyah</div>
                <div className="text-white/70 text-sm mb-3">Hisab Hakiki — Wujudul Hilal</div>
                <div className="space-y-1.5 text-xs text-white/40">
                  <div>✓ Ijtimak (konjungsi) terjadi sebelum ghurub</div>
                  <div>✓ Tinggi hilal saat ghurub ≥ 0°</div>
                  <div className="text-white/25 mt-2">Bila hilal sudah di atas ufuk saat ghurub, bulan baru dimulai.</div>
                </div>
              </div>
              <div className="bg-[#0D2035] border border-teal-500/20 rounded-sm p-5">
                <div className="text-teal-400 text-xs tracking-[0.2em] uppercase mb-2">MABIMS 2021</div>
                <div className="text-white/70 text-sm mb-3">Imkan al-Rukyat (3 – 6,4)</div>
                <div className="space-y-1.5 text-xs text-white/40">
                  <div>✓ Tinggi hilal ≥ 3°</div>
                  <div>✓ Elongasi Bulan–Matahari ≥ 6,4°</div>
                  <div className="text-white/25 mt-2">MABIMS = Menteri Agama Brunei, Indonesia, Malaysia, Singapura (pembaruan 2021).</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glosarium */}
        <div className="mt-12">
          <div className="border-t border-[#D4AF37]/10 pt-8">
            <h2 className="text-white/60 text-sm tracking-[0.2em] uppercase mb-6" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Glosarium Istilah
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {GLOSSARY.map(([term, def]) => (
                <div key={term} className="border-b border-white/5 pb-2">
                  <div className="text-[#D4AF37]/80 text-sm">{term}</div>
                  <div className="text-white/40 text-xs leading-relaxed mt-0.5">{def}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Catatan & sumber data */}
        <div className="mt-12 border-t border-[#D4AF37]/10 pt-8">
          <h2 className="text-white/60 text-sm tracking-[0.2em] uppercase mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Catatan & Sumber Data
          </h2>
          <ul className="text-white/40 text-xs leading-relaxed list-disc list-inside space-y-1.5">
            <li>Data astronomi presisi memakai ephemeris <span className="text-[#5FBFBF]">NASA JPL DE440</span> (Park dkk., 2021) melalui AstroPy.</li>
            <li>Sullam an-Nayyirain dihitung dengan rumus taqribi aslinya (0,5°/jam &amp; mukts ×4 menit).</li>
            <li>Irsyad al-Murid (kontemporer) diwakili oleh perhitungan presisi ephemeris NASA JPL.</li>
            <li>Fath al-Rauf: memakai parameter terdokumentasi Zij Ulugh Beg (obliquity 23°30'17") + deret taʿdīl; radix manuskrip tulisan tangan tak ditranskrip — nilai ilustratif kelas taqribi.</li>
            <li>Halaman <span className="text-[#5FBFBF]">Astronomy</span> punya tombol cross-check <em>live</em> ke <span className="text-[#5FBFBF]">NASA JPL Horizons</span> — membuktikan hitungan lokal cocok dengan server NASA hingga &lt; 1 detik busur.</li>
            <li>Klasifikasi metode mengacu Kemenag RI, <em>Almanak Hisab Rukyat</em> (2010), hasil seminar Bogor 1992.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
