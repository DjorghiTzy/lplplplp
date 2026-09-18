# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tentang proyek

Peta keputusan interaktif untuk **alur gudang retur** — dari kolom `Status Kerusakan Barang`
di Spreadsheet sampai Internal Transfer tervalidasi di **Odoo**. Tujuannya bukan sekadar
dokumentasi: aplikasi ini dipakai saat entry data harian untuk **mencegah salah entry**.

Situs statis murni: tanpa build step, tanpa dependency npm. Semua file JS dimuat langsung
oleh `index.html` sebagai classic script (bukan ES module), jadi **urutan tag `<script>`
menentukan** — `data.js` sebelum `app.js`, `photos.js` sebelum `app.js`, vendor paling awal.

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
node --check assets/js/photos.js
node --check sw.js
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('manifest.webmanifest','utf8'))"
```

Buka lewat `http://localhost`/`127.0.0.1`, jangan `file://` — service worker dan IndexedDB
tidak aktif di `file://`.

Memeriksa isi `data.js` tanpa browser (const di file ini tidak bisa di-`require`):

```bash
node -e "const s=require('fs').readFileSync('assets/js/data.js','utf8');(0,eval)(s+';console.log(RULES.length, SHEET_COLUMNS.length)')"
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
assets/js/data.js          → SELURUH isi SOP + aturan (lihat daftar global di bawah)
assets/js/photos.js        → modul Photos: simpan foto bukti di IndexedDB (berdiri sendiri)
assets/js/app.js           → IIFE yang merender semuanya; tidak berisi kalimat SOP satu pun
assets/vendor/qrcode-generator.js → QR untuk poster cetak (MIT, Kazuhiko Arase) — jangan diedit
assets/css/style.css       → token warna + animasi + gaya cetak
sw.js, manifest.webmanifest→ offline / PWA
index.html                 → shell statis
```

Global yang diekspor `data.js`: `META`, `REF`, `NOMOR`, `STEPS`, `step()`, `FLOW`, `WIZARD`,
`JALUR_BUNTU`, `FORM`, `RULES`, `SHEET_COLUMNS`, `OUTPUT`, `OPEN_QUESTIONS_INTRO`.

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

`REF` menampung string yang dipakai berulang (nama database, nama menu Odoo, kode lokasi
`GDP/Stock` / `RT-GD/Stock`). Pakai `REF` daripada mengetik ulang string itu.

### Pustaka langkah (`STEPS` + `step()`)

Langkah yang muncul di lebih dari satu cabang (`odoo-db`, `isi-form`, `validate`) ditulis
sekali di `STEPS`, lalu dipanggil `step('odoo-db', { id:'c1-odoo', children:[…] })`.
Fungsi `step()` menyalin node dan menggabung `detail` dengan override.

**Jangan pernah menyalin-tempel langkah yang sama ke dua cabang.** Kalau sebuah langkah mulai
muncul dua kali, pindahkan ke `STEPS` dulu. Duplikasi persis itu yang menyebabkan satu
langkah punya dua versi berbeda saat SOP berubah.

### Nomor retur (`NOMOR`)

Format `RT-BBTT-NNN`, menjadi kunci penghubung antara Spreadsheet, Odoo (`Source Document`),
nota, dan nama file foto. `NOMOR.build()` menyusunnya; di `app.js` objek `Nomor` membungkusnya
dengan penghitung urutan di localStorage (`returSeq:<BBTT>`), `peek()` untuk menyarankan nomor
berikutnya dan `commit()` saat nomor benar-benar dipakai.

### Entry harian (`FORM`, `RULES`, `SHEET_COLUMNS`, `OUTPUT`)

- `FORM` — field yang diminta setelah pertanyaan selesai. `when(ctx)` menentukan field muncul
  atau tidak; `auto: 'retur' | 'today'` mengisi nilai awal.
- `RULES` — pemeriksaan silang. `when(ctx)` bernilai **true berarti ADA pelanggaran**.
  `level`: `danger` (jangan dilanjutkan) / `warn` / `info`.
- `SHEET_COLUMNS` — urutan kolom baris Spreadsheet. Ini satu-satunya tempat yang perlu diubah
  kalau urutan kolom Spreadsheet pemilik proses berbeda.
- `OUTPUT` — teks siap tempel (Note Odoo, baris Spreadsheet). Satu sumber untuk kedua tujuan,
  supaya isinya mustahil berbeda.

`ctx` yang dilewatkan ke `when()` dan `OUTPUT` adalah gabungan jawaban wizard (`carry`),
isian form, dan dua nilai turunan dari penyimpanan foto: `fotoScreenshot` dan `fotoCount`.
Karena itu menaruh foto berkategori `screenshot` otomatis mematikan aturan
`beda-tanpa-screenshot`.

### Skema wizard (`WIZARD`)

Mesin state sederhana: `steps[id].options[]` masing-masing punya `next` (id pertanyaan
berikutnya) **atau** `result` (id node di `FLOW`). Hasil simulasi dirender dari node tujuan,
jadi langkah SOP tidak pernah ditulis dua kali. `carry` mengisi breadcrumb jawaban.
Menambah cabang baru di `FLOW` biasanya berarti menambah opsi di sini juga.

Wizard punya **tiga fase** (`wz.phase`): `q` (pertanyaan) → `form` (isi data + foto) →
`result` (aturan silang, langkah, teks siap tempel, checklist, foto). Cabang yang ada di
`JALUR_BUNTU` (Cancel, Potong Nota) melompati fase `form` karena alurnya memang belum ada.
Tombol Kembali menuruni fase dulu, baru menarik pertanyaan dari `wz.stack`.

Field form dirender sekali lalu **tidak pernah di-render ulang saat mengetik** — hanya nilai
di `wz.form` dan blok `#wzAlerts` yang diperbarui, supaya fokus kursor tidak lompat. Ini aman
karena `when()` pada `FORM` hanya bergantung pada jawaban wizard, yang tidak berubah selama
fase form.

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

### Nama class bentrok — pernah menggigit sekali

`.tab` sudah dipakai untuk tab navigasi (`display:flex`). Penanda kolom di blok teks siap
tempel sempat memakai nama yang sama dan berubah jadi flex, membuat setiap sel pecah ke
barisnya sendiri. Sekarang namanya `.tabmark`. Sebelum menambah nama class generik
(`.tab`, `.box`, `.check`, `.field`), grep dulu — stylesheet ini satu berkas tanpa scoping.

### Offline / PWA

`sw.js` memakai network-first untuk navigasi (pembaruan langsung terlihat) dan
stale-while-revalidate untuk aset. **Saat menambah berkas baru yang harus tersedia offline,
tambahkan ke array `INTI` dan naikkan `VERSI`** — kalau tidak, perangkat lama tetap memegang
cache lama. Service worker hanya didaftarkan di https atau localhost.

### Poster cetak

`buildPrintSheet()` membangun `#printSheet` dari data (bukan HTML statis), `doPrint()`
mencetaknya. Gaya cetak ada di blok `@media print` di akhir `style.css`; di luar cetak
`#printSheet` `display:none`. QR dibuat dari `location.href` saat itu juga, jadi tidak ada
domain yang di-hardcode. Verifikasi hasil cetak lewat `page.pdf()` di Playwright, bukan
screenshot biasa — screenshot media print tidak mengecat latar putih.

### Tinggi topbar — jangan di-hardcode lagi

Sempat ada angka 63px yang disalin ke tiga tempat, dan langsung meleset begitu topbar
berubah (tingginya 66px di desktop, 68px di bawah 900px, 127px saat tab membungkus di HP).
Sekarang: `body` adalah flex kolom (`.topbar` flex:none, `.stage` flex:1), dan `app.js`
(`trackTopbar()`) menulis tinggi topbar yang sebenarnya ke custom property `--topbar-h`
lewat ResizeObserver — hanya `.panel` yang memakainya.

**Jangan mengembalikan tinggi topbar sebagai angka tetap di CSS.** Kalau ada elemen baru yang
perlu tahu tinggi topbar, pakai `var(--topbar-h)`.

Lebar kartu ada di token `--node-w` (264px desktop, 230px ≤640px). JS membaca lebar asli
lewat `offsetWidth`, jadi cukup mengubah tokennya.

### Posisi judul aplikasi — sedang kosong atas permintaan

Judul dan logo **sengaja tidak dipasang** di pojok kiri atas; pemilik proses ingin
menentukan sendiri letaknya nanti. Topbar sekarang grid `1fr auto 1fr`: slot kiri kosong
(`.topbar-slot`), tab di tengah, search + tema di kanan. Gaya `.brand`, `.brand-mark`, dan
`.brand-text` sengaja dipertahankan di `style.css` supaya judul tinggal ditempel begitu
posisinya diputuskan.

**Jangan mengembalikan judul ke pojok kiri atas tanpa diminta.**

### Panel detail

Desktop: drawer kanan yang dimulai di bawah topbar, sehingga search dan tombol tema tetap
bisa diklik. `.panel-scrim` sengaja `pointer-events:none` di desktop — penutupan lewat klik
luar ditangani listener `pointerdown` di `document`. Di ≤640px panel menjadi bottom sheet
dan scrim baru aktif. `select()` memanggil `ensureVisible()` supaya kartu terpilih tidak
tertutup panel.

### Penyimpanan foto (`photos.js`)

IndexedDB `gudang-retur`, object store `bukti`, dikelompokkan lewat index `noRetur`.
Gambar di atas 400 KB dikecilkan ke sisi terpanjang 1800 px sebelum disimpan.
`Photos.fileName()` menamai unduhan mengikuti nomor retur.

Foto hanya ada di peramban perangkat itu. Jangan menyebutnya backup di teks UI mana pun —
statusnya penampungan sementara sebelum dilampirkan ke Odoo, dan aplikasi harus terus
mengatakan itu apa adanya.

### localStorage

- `chk:<nodeId>:<index>` → status centang checklist
- `theme` → `"dark"` / `"light"`
- `returSeq:<BBTT>` → urutan nomor retur terakhir yang dipakai pada bulan itu

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

1. Tempat simpan screenshot belum ditetapkan resmi; aplikasi merekomendasikan attachment di
   record Odoo, tapi masih ditandai sebagai pertanyaan terbuka sampai dikonfirmasi.
2. Status **Stok Mobil 1/2** dipetakan ke menu `…GD Ke Gudang Retur` sesuai penjelasan
   pemilik proses, padahal source location-nya kemungkinan lokasi mobil. Menunggu konfirmasi
   (tercatat di `detail.confirm` node `c1`).
3. Cabang **Cancel** (`c3`) dan **Potong Nota** (`c4`) baru berupa placeholder `pending`
   berikut daftar pertanyaannya.

## Git

Pengembangan dilakukan di branch `claude/warehouse-return-flow-diagram-zzdwd1`
(bukan default branch). Commit message ditulis dalam Bahasa Indonesia, baris pertama
berupa kalimat imperatif singkat.

Akses GitHub di sesi remote memakai MCP tools (`mcp__github__*`); `gh` CLI tidak tersedia.
