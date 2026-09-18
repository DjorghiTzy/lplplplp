# Alur Gudang Retur

Peta keputusan interaktif untuk alur gudang retur: dari kolom **Status Kerusakan Barang**
di Spreadsheet sampai transfer tervalidasi di **Odoo**.

Dibuat untuk satu tujuan: **meminimalisir kesalahan entry data.**

## Isi aplikasi

| Mode | Fungsi |
|---|---|
| **Diagram Pohon** | Seluruh alur dalam bentuk pohon. Bisa dibuka/tutup per cabang, digeser, di-zoom, dan dicari. Klik kartu untuk melihat langkah detail, field Odoo yang wajib dicek, checklist, dan peringatan kesalahan umum. |
| **Simulasi** | Mode tanya–jawab. Jawab pertanyaan satu per satu, aplikasi menunjukkan langkah Odoo yang benar beserta dokumen wajibnya (nota / screenshot). Cocok dipakai saat entry harian. |
| **Catatan & PR** | Ringkasan status peta, daftar hal yang masih perlu dikonfirmasi, dan kumpulan aturan anti-salah entry yang dikumpulkan otomatis dari seluruh node. |

## Cabang yang sudah terpetakan

1. **Sudah Tukar · Stok Mobil 1 / 2** → menu `Gudang Retur : Pindah Retur Penjualan GD Ke Gudang Retur`
   → New → Contact → Add a Product + Note → Mark as Todo → Validate → barang masuk Gudang Retur.
2. **Belum Tukar** → menu `… Pindah Retur Penjualan Mobil 1 / Mobil 2 Ke Gudang Retur`, lalu bercabang:
   - stok pengganti barang sama **tersedia** → ganti barang sama, **wajib nota**, barang pengganti diserahkan ke tim logistik;
   - stok pengganti **tidak tersedia** → ganti barang beda, **wajib nota + screenshot** form Odoo.
3. **Cancel** → ditandai, detail alur menunggu penjelasan.
4. **Potong Nota** → ditandai, detail alur menunggu penjelasan.

Cabang 3 dan 4 sengaja dibiarkan kosong, bukan ditebak. Pertanyaan yang perlu dijawab untuk
melengkapinya ada di tab **Catatan & PR**.

## Cara menambah / mengubah alur

Semua isi peta berasal dari satu file: **`assets/js/data.js`**.
Tambah atau ubah node di sana, commit, dan seluruh tampilan (diagram, simulasi, checklist,
halaman catatan) ikut ter-update — tidak perlu menyentuh kode tampilan.

Bentuk satu node:

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

Alur simulasi diatur di objek `WIZARD` pada file yang sama. Setiap pilihan menunjuk ke
`next` (pertanyaan berikutnya) atau `result` (id node di pohon), jadi tidak ada SOP yang ditulis dua kali.

## Menjalankan secara lokal

Tidak ada build step dan tidak ada dependency. Cukup buka `index.html`, atau:

```bash
npx http-server -p 8080 .
```

## Deploy

Static site murni. Di Vercel: import repo ini, Framework Preset **Other**,
Build Command kosong, Output Directory `.` — setiap push ke branch akan otomatis ter-deploy.

## Pintasan

- Seret kanvas untuk menggeser, scroll untuk zoom
- `+` / `-` zoom, `0` pas-kan ke layar
- `Esc` menutup panel detail
- Panah kiri/kanan saat kartu difokus untuk menutup/membuka cabang
