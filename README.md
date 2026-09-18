# Alur Gudang Retur

Peta keputusan interaktif untuk alur gudang retur: dari kolom **Status Kerusakan Barang**
di Spreadsheet sampai transfer tervalidasi di **Odoo**.

Dibuat untuk satu tujuan: **meminimalisir kesalahan entry data.**

## Isi aplikasi

| Mode | Fungsi |
|---|---|
| **Diagram Pohon** | Seluruh alur dalam bentuk pohon. Bisa dibuka/tutup per cabang, digeser, di-zoom, dan dicari. Klik kartu untuk melihat langkah detail, field Odoo yang wajib dicek, checklist, dan peringatan kesalahan umum. |
| **Simulasi** | Tanya–jawab → isi data → hasil. Menghasilkan teks siap tempel untuk Odoo dan Spreadsheet, menjalankan pemeriksaan silang, dan menyediakan tempat menaruh foto bukti. |
| **Catatan & PR** | Status peta, versi SOP, aturan nomor retur, arsip foto bukti, daftar aturan silang, hal yang perlu dikonfirmasi, dan tombol cetak poster A4. |

## Nomor retur — benang merah

Satu kejadian retur meninggalkan empat jejak: baris Spreadsheet, transfer Odoo, nota, dan
screenshot. Tanpa satu nomor yang sama di keempatnya, menelusuri satu kesalahan berarti
membuka semuanya satu per satu.

Format: **`RT-BBTT-NNN`** (contoh `RT-0926-014` → bulan 09, tahun 26, urutan 014).
Nomor wajib muncul di kolom pertama Spreadsheet, field **Source Document** Odoo, tulisan di
nota, dan nama file screenshot. Aplikasi menyarankan nomor berikutnya secara otomatis.

## Teks siap tempel

Titik salah ketik terbesar adalah mengetik hal yang sama dua kali — sekali di Odoo, sekali
di Spreadsheet. Mode Simulasi meminta data sekali, lalu mengeluarkan tiga blok yang tinggal
disalin: **Note untuk Odoo**, **Source Document**, dan **baris Spreadsheet** (dipisah tab,
tinggal tempel ke sel pertama). Sumbernya satu, jadi Odoo dan Spreadsheet mustahil berbeda.

Urutan kolom baris Spreadsheet diatur di `SHEET_COLUMNS` pada `assets/js/data.js` —
sesuaikan kalau urutan kolom Spreadsheet kamu berbeda.

## Pemeriksaan silang

Beberapa kesalahan hanya terlihat kalau dua jawaban dibaca bersamaan. Aplikasi memeriksanya
otomatis setiap kali kamu mengisi data, misalnya:

- nota pengganti sudah terbit tapi status masih "Belum Tukar" → kontradiksi
- ganti barang beda tanpa screenshot → bukti tidak sah
- produk pengganti tertulis sama dengan produk yang diretur
- format nomor retur tidak sesuai

Aturannya ada di `RULES` pada `assets/js/data.js`.

## Tempat menaruh foto

Foto bukti (foto barang retur, screenshot form Odoo, foto nota) bisa ditaruh langsung di
mode Simulasi: klik, seret file ke area foto, atau tekan <kbd>Ctrl</kbd>+<kbd>V</kbd>
setelah mengambil screenshot. Foto dikelompokkan per nomor retur, bisa diunduh dengan nama
file yang sudah mengikuti nomor retur, dan terkumpul di tab **Catatan & PR → Arsip bukti foto**.

Foto besar dikecilkan otomatis sebelum disimpan.

> **Penting:** foto disimpan di penyimpanan peramban (IndexedDB) pada perangkat itu saja.
> Ini penampungan sementara supaya bukti tidak tercecer antara kamera dan Odoo — **bukan backup**.
> Membersihkan data situs akan menghapusnya. Tujuan akhir foto tetap dilampirkan ke record Odoo.

## Bisa dipakai di gudang

- **Offline** — service worker menyimpan aplikasi di perangkat, jadi tetap terbuka saat sinyal jelek.
  Bisa dipasang sebagai aplikasi lewat menu "Install / Tambahkan ke layar utama".
- **Poster A4** — tombol *Cetak poster A4* di tab Catatan & PR menghasilkan satu halaman
  hitam-putih berisi empat cabang, aturan wajib, dan QR code menuju versi interaktif.
  Cocok ditempel di dinding dekat rak retur.

## Cara menambah / mengubah alur

Semua isi peta berasal dari satu file: **`assets/js/data.js`**.
Tambah atau ubah node di sana, commit, dan seluruh tampilan (diagram, simulasi, aturan
silang, checklist, poster) ikut ter-update.

```js
{
  id: 'id-unik',
  type: 'process',            // start | decision | condition | process | outcome | pending
  title: 'Judul kartu',
  sub: 'Keterangan singkat',
  badges: [{ label: 'Wajib nota', tone: 'warn' }],   // tone: ok | warn | danger | info | muted
  detail: {
    summary: 'Penjelasan singkat.',
    steps: ['Langkah 1', 'Langkah 2'],
    fields: [{ label: 'Operation Type', value: '…' }],
    checklist: ['Yang dicentang sebelum lanjut'],
    warn: ['Kesalahan yang sering terjadi di langkah ini'],
    confirm: ['Hal yang masih perlu dikonfirmasi'],
  },
  children: [ /* node turunan */ ],
}
```

Langkah yang muncul di beberapa cabang (buka database, isi form, Validate) ditulis **sekali**
di objek `STEPS`, lalu dipanggil dengan `step('odoo-db', { id: 'c1-odoo' })`. Jangan menyalin
langkah yang sama ke dua cabang — itu sumber inkonsistensi yang ingin dicegah aplikasi ini.

Objek lain di file yang sama: `NOMOR` (format nomor retur), `FORM` (field data entry),
`RULES` (pemeriksaan silang), `SHEET_COLUMNS` dan `OUTPUT` (teks siap tempel),
`WIZARD` (alur pertanyaan), `META` (versi SOP).

## Cabang yang sudah terpetakan

1. **Sudah Tukar · Stok Mobil 1 / 2** → menu `Gudang Retur : Pindah Retur Penjualan GD Ke Gudang Retur`
   → New → Contact + Source Document + produk + Note → Mark as Todo → Validate.
2. **Belum Tukar** → menu `… Pindah Retur Penjualan Mobil 1 / Mobil 2 Ke Gudang Retur`, lalu bercabang:
   - stok pengganti barang sama **tersedia** → ganti barang sama, **wajib nota**, diserahkan ke tim logistik;
   - stok pengganti **tidak tersedia** → ganti barang beda, **wajib nota + screenshot**.
3. **Cancel** → ditandai, detail alur menunggu penjelasan.
4. **Potong Nota** → ditandai, detail alur menunggu penjelasan.

Cabang 3 dan 4 sengaja dibiarkan kosong, bukan ditebak. Pertanyaan yang perlu dijawab untuk
melengkapinya ada di tab **Catatan & PR**.

## Menjalankan secara lokal

Tidak ada build step dan tidak ada dependency yang perlu dipasang.

```bash
npx http-server -p 8080 .
```

(Buka lewat `http://localhost`, bukan `file://`, supaya service worker dan penyimpanan foto aktif.)

## Deploy

Static site murni. Di Vercel: import repo ini, Framework Preset **Other**,
Build Command kosong, Output Directory `.` — setiap push ke branch akan otomatis ter-deploy.

## Pintasan

- Seret kanvas untuk menggeser, scroll untuk zoom
- `+` / `-` zoom, `0` pas-kan ke layar
- `Esc` menutup panel detail
- <kbd>Ctrl</kbd>+<kbd>V</kbd> saat mengisi form untuk menempel screenshot
- Panah kiri/kanan saat kartu difokus untuk menutup/membuka cabang

## Pihak ketiga

`assets/vendor/qrcode-generator.js` — QR Code Generator for JavaScript,
© 2009 Kazuhiko Arase, lisensi MIT. Dipakai untuk QR pada poster cetak.
