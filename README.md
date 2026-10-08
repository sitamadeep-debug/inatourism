# INA-Edutour | Hybrid Edutourism Platform

Platform Edutourism Hybrid interaktif yang dirancang khusus untuk ekosistem **Politeknik Pariwisata (Poltekpar)** di Indonesia di bawah naungan Kementerian Pariwisata dan Ekonomi Kreatif RI.

## 🌟 Fitur Utama
- **Eksplorasi Destinasi Bali & Nasional**: Galeri visual destinasi lengkap dengan koordinat GPS, fokus studi analitis, dan foto resolusi tinggi.
- **Peta Interaktif & 360° Explorer**: Didukung oleh Leaflet.js dengan rute perjalanan dan simulasi panorama 360°.
- **Dukungan Bilingual (ID / EN)**: Pengalihan bahasa instan antara Bahasa Indonesia dan Bahasa Inggris.
- **3 Peran Pengguna (Multi-Role)**:
  - **Mahasiswa**: Eksplorasi tur virtual, narasi audio pemandu lapangan, dan pengumpulan jurnal refleksi.
  - **Dosen**: Bimbingan kelas studi dan penilaian berbasis rubrik kriteria terstandarisasi.
  - **Koordinator**: Manajemen checklist kesiapan tur 3-fase dan analisis keterlibatan.
- **Sinkronisasi Realtime Supabase**: Terintegrasi langsung dengan database PostgreSQL Supabase dengan perlindungan Row Level Security (RLS) serta fallback penyimpanan lokal.
- **Siap Deploy**: Dilengkapi konfigurasi perutean Vercel (`vercel.json`).

## 🏛️ Jaringan Politeknik Pariwisata
1. **Poltekpar Bali** (Fokus: Manajemen Budaya, Subak & Ekowisata)
2. **Poltekpar NHI Bandung** (Fokus: Warisan Budaya & Seni Kuliner)
3. **Poltekpar Makassar** (Fokus: Geoturisme Bahari & Geopark Maros-Pangkep)
4. **Poltekpar Medan** (Fokus: Geoturisme Kaldera Toba)
5. **Poltekpar Lombok** (Fokus: Pariwisata Berkelanjutan & Budaya Sasak)
6. **Poltekpar Palembang** (Fokus: Sejarah Sriwijaya & Wisata Olahraga)

## 🚀 Cara Menjalankan Secara Lokal
Cukup jalankan server web statis lokal pada direktori proyek:
```bash
# Menggunakan Python
python -m http.server 3000

# Atau menggunakan Node.js
npx serve .
```
Lalu buka browser Anda di `http://localhost:3000`.

## 📦 Struktur Berkas
- `index.html`: Entry point antarmuka aplikasi.
- `app.js`: Logika interaktivitas, routing tampilan, dan penanganan event.
- `style.css`: Lembar gaya kustom responsif dengan tema dinamis tiap kampus.
- `data.js`: Basis data statis destinasi, koordinat GPS, rubrik studi, dan kamus terjemahan.
- `supabaseClient.js`: Modul inisialisasi dan sinkronisasi data cloud Supabase.
- `supabase_schema.sql`: Skema SQL database Supabase.
- `vercel.json`: Konfigurasi rute deployment Vercel.
