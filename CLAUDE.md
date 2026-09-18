# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tentang proyek

Peta keputusan interaktif untuk **alur gudang retur** — dari kolom `Status Kerusakan Barang`
di Spreadsheet sampai Internal Transfer tervalidasi di **Odoo**. Tujuannya bukan sekadar
dokumentasi: aplikasi ini dipakai saat entry data harian untuk **mencegah salah entry**.

Situs statis murni: tanpa build step, tanpa dependency, tanpa framework. Tiga file JS/CSS
dimuat langsung oleh `index.html` sebagai classic script (bukan ES module).

Bahasa seluruh konten, UI, commit message, dan komentar kode: **Bahasa Indonesia**.
Pertahankan itu saat menambah apa pun.

## Perintah

Tidak ada build, lint, atau test runner yang terpasang. Yang tersedia:

```bash
# jalankan lokal
npx http-server -p 8080 .        # lalu buka http://127.0.0.1:8080

# cek sintaks setelah mengubah JS (satu-satunya "test" cepat yang ada)
node --check assets/js/app.js
node --check assets/js/data.js
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"
```

### Smoke test browser

Playwright terpasang global di environment ini (`/opt/node22/lib/node_modules/playwright`)
dan Chromium ada di `/opt/pw-browsers`. **Jangan jalankan `playwright install`.**
Pola yang dipakai sebelumnya: jalankan `http-server` di background, lalu skrip `.mjs` yang
meng-import `chromium` dari path global itu, mengumpulkan `pageerror` + `console` error,
menekan tab/node/tombol, dan menyimpan screenshot ke scratchpad.

Selalu smoke test setelah mengubah `app.js` atau layout CSS — bug di sini bersifat visual
dan tidak akan tertangkap oleh `node --check`. Error `ERR_CERT_AUTHORITY_INVALID` dari
Google Fonts adalah wajar di sandbox (proxy), bukan bug.

### Deploy

Vercel, terhubung otomatis ke repo. Framework Preset **Other**, Build Command kosong,
Output Directory `.`. Setiap push ke branch menghasilkan preview deployment.
`vercel.json` hanya mengatur `cleanUrls` dan header cache untuk `/assets/*`.

## Arsitektur

### Aturan utama: data terpisah dari tampilan

```
assets/js/data.js   → SELURUH isi SOP (global: REF, FLOW, WIZARD, OPEN_QUESTIONS_INTRO)
assets/js/app.js    → IIFE yang merender data itu; tidak berisi kalimat SOP satu pun
assets/css/style.css→ token warna + animasi
index.html          → shell statis; data.js WAJIB dimuat sebelum app.js
```

**Mengubah SOP = mengubah `data.js` saja.** Diagram pohon, mode simulasi, checklist,
pencarian, statistik, daftar "perlu dikonfirmasi", dan daftar "aturan anti-salah entry"
semuanya diturunkan dari struktur yang sama. Jangan pernah menulis ulang langkah SOP di
`app.js`, `README.md`, atau di dua node berbeda — duplikasi itulah yang menyebabkan
inkonsistensi data yang ingin dihindari proyek ini.

### Skema node (`FLOW`, data.js:21)

Pohon rekursif lewat `children`. Field yang dikenali:

| Field | Keterangan |
|---|---|
| `id` | unik; dipakai sebagai key localStorage, target wizard, dan key garis penghubung |
| `type` | `start` \| `decision` \| `condition` \| `process` \| `outcome` \| `pending` — menentukan warna aksen (`--c-<type>`) dan label KIND |
| `title`, `sub` | isi kartu; boleh berisi HTML inline (dirender via `innerHTML`) |
| `badges[]` | `{label, tone}`; tone: `ok` \| `warn` \| `danger` \| `info` \| `muted` |
| `detail.summary` | paragraf ringkasan |
| `detail.steps[]` | langkah bernomor |
| `detail.fields[]` | `{label, value}` — field Odoo yang wajib diverifikasi |
| `detail.checklist[]` | item centang; **disimpan per indeks** |
| `detail.warn[]` | kesalahan yang sering terjadi → ikut masuk tab "Catatan & PR" |
| `detail.confirm[]` | pertanyaan terbuka → ikut masuk tab "Catatan & PR" |

`REF` (data.js:8) menampung string yang dipakai berulang (nama database, nama menu Odoo,
kode lokasi `GDP/Stock` / `RT-GD/Stock`). Pakai `REF` daripada mengetik ulang string itu.

### Skema wizard (`WIZARD`, data.js:448)

Mesin state sederhana: `steps[id].options[]` masing-masing punya `next` (id pertanyaan
berikutnya) **atau** `result` (id node di `FLOW`). Hasil simulasi dirender dari node tujuan,
jadi langkah SOP tidak pernah ditulis dua kali. `carry` mengisi breadcrumb jawaban.
Menambah cabang baru di `FLOW` biasanya berarti menambah opsi di sini juga.

### Pipeline render pohon (`render()`, app.js:173)

Tujuh tahap berurutan, jangan diubah urutannya:

1. buat kartu untuk node yang baru terlihat (`makeCard`)
2. **ukur** `offsetWidth/offsetHeight` tiap kartu → disimpan ke `pos`
3. `layout()` — hitung x/y
4. terapkan `transform` (kartu baru: animasi keluar dari posisi induk, dengan stagger)
5. buang kartu yang tidak lagi terlihat (animasi menyusut ke induk lalu `remove()`)
6. sinkronkan garis penghubung (`linkEls`, key = `"<parentId>><childId>"`)
7. set ukuran `<svg>` sesuai bounding box

Layout (`layout()`, app.js:119) adalah tidy tree DFS sederhana: `x = depth * (w + GAP_X)`,
daun mengambil `cursor` global lalu memajukannya, induk diletakkan di tengah anak pertama
dan terakhir. Tinggi kartu harus sudah terukur sebelum layout — karena itu tahap 2 wajib
ada sebelum tahap 3.

### Kontrak animasi — gotcha penting

- **`transform` pada `.node` diatur inline oleh JS.** Jangan pernah menambah `@keyframes`
  yang menganimasikan `transform` pada `.node`; keyframe akan menimpa posisi layout dan
  kartu melompat. Efek sorot memakai `box-shadow` (`matchPulse`) justru karena alasan ini.
- Animasi masuk memakai pola: `transition:none` → set transform awal → baca `offsetHeight`
  (paksa reflow) → kembalikan transition → set transform akhir.
- Garis penghubung tidak bisa mengandalkan CSS `transition: d` (dukungan browser tidak
  merata), jadi `tweenPath()` (app.js:155) menginterpolasi 4 titik kontrol dengan rAF.
  Garis baru digambar dengan `stroke-dashoffset` (`--len` + class `link-draw`).
- Semua animasi dimatikan oleh blok `prefers-reduced-motion` di akhir `style.css`.

### Angka ajaib yang harus dijaga selaras

Tinggi topbar **63px** muncul di tiga tempat di `style.css`: `.stage` (baris ~153),
`.panel` (~367–369), dan `.stage` di media query ≤640px (memakai 124px karena tab
membungkus ke baris kedua). Kalau tinggi topbar berubah, ubah ketiganya bersamaan.

Lebar kartu ada di token `--node-w` (264px desktop, 230px ≤640px). JS membaca lebar asli
lewat `offsetWidth`, jadi cukup mengubah tokennya.

### Panel detail

Desktop: drawer kanan yang dimulai di bawah topbar, sehingga search dan tombol tema tetap
bisa diklik. `.panel-scrim` sengaja `pointer-events:none` di desktop — penutupan lewat klik
luar ditangani listener `pointerdown` di `document`. Di ≤640px panel menjadi bottom sheet
dan scrim baru aktif. `select()` memanggil `ensureVisible()` supaya kartu terpilih tidak
tertutup panel.

### localStorage

- `chk:<nodeId>:<index>` → status centang checklist
- `theme` → `"dark"` / `"light"`

**Checklist disimpan per indeks.** Menyisipkan atau mengurutkan ulang item di
`detail.checklist` membuat centang lama menempel ke kalimat yang salah. Kalau perlu
mengubah urutan, lebih aman mengganti `id` node tersebut.

Semua akses localStorage dibungkus try/catch (`store`, app.js:29) — jangan menambah akses
langsung tanpa pembungkus itu.

## Aturan konten (domain)

Aplikasi ini dipakai untuk mengambil keputusan nyata di gudang. Karena itu:

- **Jangan pernah mengarang langkah SOP.** Cabang yang detailnya belum dijelaskan pemilik
  proses ditandai `type: 'pending'` dan pertanyaannya ditulis di `detail.confirm` pada node
  induknya — bukan ditebak lalu ditulis seolah pasti.
- Kalau menemukan kejanggalan pada SOP yang diberikan, tulis di `detail.confirm`, jangan
  diam-diam "diperbaiki" di data.
- `detail.warn` untuk kesalahan yang benar-benar pernah/mungkin terjadi, bukan nasihat umum.

### Yang masih terbuka saat ini

1. Status **Stok Mobil 1/2** dipetakan ke menu `…GD Ke Gudang Retur` sesuai penjelasan
   pemilik proses, padahal source location-nya kemungkinan lokasi mobil. Menunggu konfirmasi
   (tercatat di `detail.confirm` node `c1`).
2. Cabang **Cancel** (`c3`) dan **Potong Nota** (`c4`) baru berupa placeholder `pending`
   berikut daftar pertanyaannya.

## Git

Pengembangan dilakukan di branch `claude/warehouse-return-flow-diagram-zzdwd1`
(bukan default branch). Commit message ditulis dalam Bahasa Indonesia, baris pertama
berupa kalimat imperatif singkat.

Akses GitHub di sesi remote memakai MCP tools (`mcp__github__*`); `gh` CLI tidak tersedia.
