/* =========================================================================
 * data.js — Sumber kebenaran tunggal (single source of truth) untuk
 * seluruh alur Gudang Retur. Ubah HANYA file ini kalau SOP berubah.
 * Tree, wizard, pencarian, dan checklist semuanya dibangun dari sini.
 * ========================================================================= */

/* Referensi cepat yang dipakai di banyak tempat */
const REF = {
  db: 'Solusi Teknologi Babel  /  OriginalLine',
  menuGD: 'Gudang Retur : Pindah Retur Penjualan GD Ke Gudang Retur',
  menuM1: 'Gudang Retur : Pindah Retur Penjualan Mobil 1 Ke Gudang Retur',
  menuM2: 'Gudang Retur : Pindah Retur Penjualan Mobil 2 Ke Gudang Retur',
  locGD: 'GDP/Stock',
  locRT: 'RT-GD/Stock',
};

/* -------------------------------------------------------------------------
 * Pohon alur.
 * type: start | decision | condition | process | outcome | pending
 * ---------------------------------------------------------------------- */
const FLOW = {
  id: 'root',
  type: 'start',
  title: 'Barang Retur Masuk',
  sub: 'Titik awal seluruh alur',
  detail: {
    summary:
      'Setiap barang retur yang masuk WAJIB dicatat dulu di Spreadsheet sebelum disentuh di Odoo. ' +
      'Spreadsheet adalah sumber keputusan; Odoo hanya mengeksekusi keputusan itu.',
    steps: [
      'Terima barang retur dari customer / tim logistik.',
      'Buka Spreadsheet retur, cari atau buat baris untuk barang tersebut.',
      'Pastikan nama customer, nama barang, dan qty sudah cocok dengan fisik barang.',
      'Isi / baca kolom <b>Status Kerusakan Barang</b> — kolom ini yang menentukan cabang alur.',
    ],
    checklist: [
      'Fisik barang sudah dihitung dan cocok dengan Spreadsheet',
      'Nama customer di Spreadsheet sudah benar',
      'Kolom Status Kerusakan Barang sudah terisi',
    ],
    warn: [
      'Jangan pernah mulai dari Odoo. Kalau Spreadsheet belum diisi, data akan tidak konsisten dan sulit ditelusuri.',
    ],
  },
  children: [
    {
      id: 'decision-status',
      type: 'decision',
      title: 'Status Kerusakan Barang?',
      sub: 'Kolom penentu di Spreadsheet',
      detail: {
        summary:
          'Ini satu-satunya percabangan utama. Ada 4 kemungkinan nilai status, dan masing-masing ' +
          'punya menu Odoo serta konsekuensi dokumen yang berbeda.',
        steps: [
          'Baca nilai kolom Status Kerusakan Barang.',
          'Cocokkan dengan salah satu dari 4 cabang di sebelah kanan.',
          'Kalau nilainya tidak persis salah satu dari 4 ini — <b>STOP</b>, tanya dulu. Jangan menebak.',
        ],
        fields: [
          { label: 'Nilai yang sah', value: 'Sudah Tukar · Stok Mobil 1 / 2 · Belum Tukar · Cancel · Potong Nota' },
        ],
        warn: [
          'Status yang salah = menu Odoo yang salah = stok nyangkut di lokasi yang salah. Ini penyebab error entry nomor satu.',
        ],
      },
      children: [
        /* ============================ CABANG 1 ============================ */
        {
          id: 'c1',
          type: 'condition',
          title: 'Sudah Tukar  ·  Stok Mobil 1 / 2',
          sub: '2 status, 1 perlakuan yang sama',
          badges: [{ label: '2 status digabung', tone: 'info' }],
          detail: {
            summary:
              'Status <b>Sudah Tukar</b> dan <b>Stok Mobil 1 / Mobil 2</b> diperlakukan identik. ' +
              'Khusus Stok Mobil, sudah tukar atau belum tukar TIDAK berpengaruh — perlakuannya tetap sama.',
            steps: [
              'Pastikan statusnya memang "Sudah Tukar" atau "Stok Mobil 1 / 2".',
              'Kalau Stok Mobil: abaikan kolom sudah/belum tukar, alurnya tetap sama.',
              'Lanjut ke Odoo.',
            ],
            warn: [
              'Jangan tertukar dengan cabang "Belum Tukar" — menu Odoo-nya beda dan lokasi asalnya beda.',
            ],
            confirm: [
              'Cabang ini memakai menu <b>GD Ke Gudang Retur</b> (bukan menu Mobil), sesuai SOP yang kamu berikan. ' +
              'Untuk status Stok Mobil 1/2, mohon konfirmasi sekali lagi: barang fisiknya berangkat dari ' +
              'gudang pusat (GDP/Stock) atau dari lokasi mobil? Kalau dari lokasi mobil, menunya seharusnya menu Mobil.',
            ],
          },
          children: [
            {
              id: 'c1-odoo',
              type: 'process',
              title: 'Buka Odoo — pilih database',
              sub: REF.db,
              detail: {
                summary: 'Database harus cocok dengan asal barang. Salah database = data masuk ke perusahaan yang salah.',
                steps: [
                  'Login Odoo.',
                  'Pilih database sesuai barangnya: <b>Solusi Teknologi Babel</b> atau <b>OriginalLine</b>.',
                  'Cek pojok kanan atas — nama perusahaan yang aktif harus sesuai.',
                ],
                fields: [{ label: 'Database', value: REF.db }],
                checklist: ['Database yang aktif sudah sesuai dengan database barang'],
                warn: ['Membatalkan transfer yang sudah divalidasi di database salah itu merepotkan. Cek di awal, bukan di akhir.'],
              },
              children: [
                {
                  id: 'c1-menu',
                  type: 'process',
                  title: 'Menu: GD Ke Gudang Retur',
                  sub: REF.menuGD,
                  detail: {
                    summary: 'Masuk ke Inventory → Overview, lalu pilih kartu operation type yang tepat.',
                    steps: [
                      'Inventory → Overview.',
                      `Cari kartu <b>${REF.menuGD}</b>.`,
                      'Klik tombol <b>Open</b> di kartu tersebut.',
                      'Klik <b>New</b> untuk membuat Internal Transfer baru.',
                    ],
                    fields: [
                      { label: 'Operation Type', value: REF.menuGD },
                      { label: 'Source Location', value: REF.locGD },
                      { label: 'Destination Location', value: REF.locRT },
                    ],
                    checklist: [
                      'Operation Type terbaca "…GD Ke Gudang Retur"',
                      `Source Location = ${REF.locGD}`,
                      `Destination Location = ${REF.locRT}`,
                    ],
                    warn: ['Jangan pakai tombol New dari list Internal Transfer umum — operation type bisa terisi default yang salah.'],
                  },
                  children: [
                    {
                      id: 'c1-isi',
                      type: 'process',
                      title: 'Isi Contact, Product, dan Note',
                      sub: 'New → Contact → Add a product → Note',
                      detail: {
                        summary: 'Bagian yang paling sering salah entry. Isi berurutan, jangan melompat.',
                        steps: [
                          'Isi <b>Contact</b> — nama customer pemilik barang retur.',
                          'Tab <b>Operations</b> → <b>Add a Product</b>: pilih produk, isi <b>Demand</b> sesuai qty fisik.',
                          'Isi <b>Note</b> (tab Note) — tulis alasan retur, kondisi barang, dan referensi baris Spreadsheet.',
                          'Opsional tapi disarankan: isi <b>Source Document</b> dengan nomor nota / referensi asal.',
                        ],
                        fields: [
                          { label: 'Contact', value: 'Nama customer (wajib)' },
                          { label: 'Demand', value: 'Qty sesuai fisik barang (wajib)' },
                          { label: 'Note', value: 'Alasan retur + kondisi barang (wajib)' },
                          { label: 'Source Document', value: 'Nomor nota / referensi (disarankan)' },
                        ],
                        checklist: [
                          'Contact sudah diisi',
                          'Produk sudah benar (cek kode / barcode, bukan cuma nama)',
                          'Qty Demand = qty fisik',
                          'Note sudah diisi lengkap',
                        ],
                        warn: [
                          'Produk dengan nama mirip sangat banyak. Verifikasi lewat kode/barcode, jangan dari nama saja.',
                          'Note kosong = bulan depan tidak ada yang ingat kenapa barang ini diretur.',
                        ],
                      },
                      children: [
                        {
                          id: 'c1-validate',
                          type: 'process',
                          title: 'Mark as Todo → Validate',
                          sub: 'Draft → Ready → Done',
                          detail: {
                            summary: 'Dua klik terakhir di Odoo. Setelah Validate, stok benar-benar berpindah.',
                            steps: [
                              'Klik <b>Mark as Todo</b> — status berubah Draft → Ready.',
                              'Baca ulang sekali lagi: Contact, Produk, Qty, Source & Destination Location.',
                              'Klik <b>Validate</b> — status menjadi <b>Done</b>.',
                              'Catat nomor Reference transfer (WH/INT/xxxxx) ke Spreadsheet.',
                            ],
                            checklist: [
                              'Status sudah Done',
                              'Nomor Reference sudah dicatat balik ke Spreadsheet',
                            ],
                            warn: ['Validate tidak bisa di-undo sembarangan. Baca ulang SEBELUM klik, bukan sesudah.'],
                          },
                          children: [
                            {
                              id: 'c1-done',
                              type: 'outcome',
                              title: 'Barang masuk Gudang Retur',
                              sub: 'Selesai — fisik + sistem sinkron',
                              badges: [{ label: 'Selesai', tone: 'ok' }],
                              detail: {
                                summary: 'Alur selesai. Fisik barang dan catatan sistem sudah sama-sama berada di Gudang Retur.',
                                steps: [
                                  'Pindahkan fisik barang ke rak Gudang Retur.',
                                  'Tandai baris di Spreadsheet sebagai selesai + tempel nomor Reference Odoo.',
                                ],
                                checklist: [
                                  'Fisik barang sudah berada di rak Gudang Retur',
                                  'Spreadsheet sudah ditandai selesai',
                                ],
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ============================ CABANG 2 ============================ */
        {
          id: 'c2',
          type: 'condition',
          title: 'Belum Tukar',
          sub: 'Cabang paling panjang',
          badges: [{ label: 'Bercabang', tone: 'warn' }],
          detail: {
            summary:
              'Status <b>Belum Tukar</b> berarti customer masih menunggu barang pengganti. ' +
              'Selain memindahkan barang rusak ke Gudang Retur, kamu juga punya kewajiban mengeluarkan barang pengganti.',
            steps: [
              'Pastikan status memang "Belum Tukar" (dan bukan Stok Mobil).',
              'Barang rusak berangkat dari lokasi Mobil 1 / Mobil 2, jadi menunya menu Mobil.',
              'Setelah transfer beres, lanjut ke pertanyaan stok pengganti.',
            ],
            warn: ['Cabang ini punya dua pekerjaan: (1) barang rusak masuk gudang retur, (2) barang pengganti keluar ke customer. Jangan berhenti di nomor 1 saja.'],
          },
          children: [
            {
              id: 'c2-odoo',
              type: 'process',
              title: 'Buka Odoo — pilih database',
              sub: REF.db,
              detail: {
                summary: 'Sama seperti cabang lain: database harus cocok dengan asal barang.',
                steps: [
                  'Login Odoo.',
                  'Pilih database: <b>Solusi Teknologi Babel</b> atau <b>OriginalLine</b>.',
                  'Verifikasi nama perusahaan aktif di pojok kanan atas.',
                ],
                fields: [{ label: 'Database', value: REF.db }],
                checklist: ['Database yang aktif sudah sesuai'],
              },
              children: [
                {
                  id: 'c2-menu',
                  type: 'process',
                  title: 'Menu: Mobil 1 / Mobil 2 Ke Gudang Retur',
                  sub: 'Pilih sesuai mobil pembawa barang',
                  detail: {
                    summary:
                      'Pilih kartu operation type sesuai mobil yang membawa barang retur tersebut. ' +
                      'Mobil 1 dan Mobil 2 adalah lokasi stok yang berbeda — salah pilih membuat stok mobil jadi minus/berlebih.',
                    steps: [
                      'Inventory → Overview.',
                      `Pilih kartu <b>${REF.menuM1}</b> atau <b>${REF.menuM2}</b> sesuai mobilnya.`,
                      'Klik <b>Open</b> → <b>New</b>.',
                      'Isi Contact, Add a Product (+ qty), dan Note — sama persis seperti cabang Sudah Tukar.',
                      'Klik <b>Mark as Todo</b> lalu <b>Validate</b>.',
                    ],
                    fields: [
                      { label: 'Operation Type', value: 'Pindah Retur Penjualan Mobil 1 / Mobil 2 Ke Gudang Retur' },
                      { label: 'Source Location', value: 'Lokasi stok Mobil 1 / Mobil 2' },
                      { label: 'Destination Location', value: REF.locRT },
                    ],
                    checklist: [
                      'Nomor mobil di operation type = mobil yang benar-benar membawa barang',
                      'Contact, produk, qty, dan note sudah diisi',
                      'Transfer sudah berstatus Done',
                    ],
                    warn: ['Mobil 1 vs Mobil 2 tertukar adalah error yang baru ketahuan saat stock opname. Cek dua kali.'],
                  },
                  children: [
                    {
                      id: 'c2-decision',
                      type: 'decision',
                      title: 'Stok pengganti barang SAMA tersedia?',
                      sub: 'Penentu jenis nota yang dibuat',
                      detail: {
                        summary:
                          'Pertanyaan ini menentukan apakah kamu mengganti dengan barang yang sama persis, ' +
                          'atau terpaksa mengganti dengan barang lain.',
                        steps: [
                          'Cek stok barang yang sama (kode produk identik) di Odoo.',
                          'Pastikan yang kamu lihat adalah stok <b>tersedia</b> (On Hand dikurangi yang sudah dibooking), bukan sekadar On Hand.',
                          'Jawab: tersedia → cabang kiri, tidak tersedia → cabang kanan.',
                        ],
                        warn: ['Jangan memutuskan dari ingatan. Selalu cek angka stok di Odoo saat itu juga.'],
                      },
                      children: [
                        {
                          id: 'c2-sama',
                          type: 'outcome',
                          title: 'Ganti Barang SAMA',
                          sub: 'Stok tersedia',
                          badges: [
                            { label: 'Wajib nota', tone: 'warn' },
                            { label: 'Selesai', tone: 'ok' },
                          ],
                          detail: {
                            summary:
                              'Stok pengganti dengan kode produk yang sama tersedia. Ganti dengan barang identik, ' +
                              'buat nota, lalu serahkan barang pengganti ke tim logistik untuk dikirim ke customer.',
                            steps: [
                              'Siapkan barang pengganti dengan kode produk yang <b>sama persis</b>.',
                              '<b>Wajib buat nota</b> untuk barang pengganti tersebut.',
                              'Serahkan barang pengganti ke <b>tim logistik</b> untuk dikirim ke customer.',
                              'Catat nomor nota + nomor transfer Odoo ke Spreadsheet.',
                              'Ubah status di Spreadsheet dari "Belum Tukar" menjadi "Sudah Tukar".',
                            ],
                            checklist: [
                              'Nota sudah dibuat',
                              'Kode produk pengganti sama persis dengan barang retur',
                              'Barang pengganti sudah diserahkan ke tim logistik',
                              'Nomor nota tercatat di Spreadsheet',
                              'Status Spreadsheet sudah diubah menjadi Sudah Tukar',
                            ],
                            warn: [
                              'Nota adalah bukti serah terima. Tanpa nota, barang pengganti hilang jejak di antara gudang dan logistik.',
                              'Jangan lupa mengubah status Spreadsheet — kalau tidak, barang yang sama bisa diproses dua kali.',
                            ],
                          },
                        },
                        {
                          id: 'c2-beda',
                          type: 'outcome',
                          title: 'Ganti Barang BEDA',
                          sub: 'Stok tidak tersedia',
                          badges: [
                            { label: 'Wajib nota', tone: 'warn' },
                            { label: 'Wajib screenshot', tone: 'danger' },
                            { label: 'Selesai', tone: 'ok' },
                          ],
                          detail: {
                            summary:
                              'Stok barang yang sama habis, jadi customer diganti dengan barang lain. ' +
                              'Karena barangnya berbeda, bukti harus lebih kuat: nota <b>dan</b> screenshot.',
                            steps: [
                              'Tentukan barang pengganti dan konfirmasi ke customer / sales.',
                              '<b>Wajib buat nota</b> untuk barang pengganti.',
                              '<b>Wajib screenshot</b> form transfer di Odoo — persis seperti contoh screenshot yang kamu berikan (form Internal Transfer dengan Operation Type, Source & Destination Location, dan baris produk terlihat jelas).',
                              'Simpan / lampirkan screenshot tersebut sesuai tempat penyimpanan bukti yang berlaku.',
                              'Serahkan barang pengganti ke tim logistik.',
                              'Catat nomor nota + nomor transfer + lokasi file screenshot ke Spreadsheet.',
                            ],
                            checklist: [
                              'Penggantian barang beda sudah dikonfirmasi ke customer / sales',
                              'Nota sudah dibuat',
                              'Screenshot form Odoo sudah diambil dan tersimpan',
                              'Screenshot menampilkan Operation Type + Source/Destination Location + baris produk',
                              'Barang pengganti sudah diserahkan ke tim logistik',
                              'Semua nomor bukti tercatat di Spreadsheet',
                            ],
                            warn: [
                              'Screenshot bukan formalitas. Barang beda = harga bisa beda = potensi selisih nilai stok. Screenshot adalah pembelanya saat diaudit.',
                              'Screenshot yang terpotong dan tidak menampilkan Operation Type dianggap tidak sah.',
                            ],
                            confirm: [
                              'Screenshot disimpan di mana? (folder Drive, lampiran chat, atau attachment di record Odoo) — belum ditentukan.',
                              'Apakah perlu approval sales/atasan sebelum mengganti dengan barang berbeda?',
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ============================ CABANG 3 ============================ */
        {
          id: 'c3',
          type: 'condition',
          title: 'Cancel',
          sub: 'Menunggu detail',
          badges: [{ label: 'Belum lengkap', tone: 'muted' }],
          detail: {
            summary: 'Status <b>Cancel</b> sudah teridentifikasi sebagai cabang, tetapi langkah detailnya belum kamu jelaskan.',
            steps: ['Sementara ini: jangan proses sendiri. Tanyakan dulu sebelum menyentuh Odoo.'],
            confirm: [
              'Apakah transfer di Odoo tetap dibuat lalu di-Cancel, atau tidak dibuat sama sekali?',
              'Barang fisik dikembalikan ke customer, atau tetap masuk Gudang Retur?',
              'Apakah nota yang sudah terbit perlu dibatalkan / ditarik?',
              'Siapa yang berwenang menyetujui status Cancel?',
            ],
          },
          children: [
            {
              id: 'c3-pending',
              type: 'pending',
              title: 'Detail alur menyusul',
              sub: 'Siap diisi kapan saja',
              detail: {
                summary: 'Node ini sengaja dikosongkan. Begitu kamu jelaskan alurnya, isinya tinggal ditambahkan di data.js dan seluruh aplikasi ikut ter-update.',
              },
            },
          ],
        },

        /* ============================ CABANG 4 ============================ */
        {
          id: 'c4',
          type: 'condition',
          title: 'Potong Nota',
          sub: 'Menunggu detail',
          badges: [{ label: 'Belum lengkap', tone: 'muted' }],
          detail: {
            summary: 'Status <b>Potong Nota</b> sudah teridentifikasi sebagai cabang, tetapi langkah detailnya belum kamu jelaskan.',
            steps: ['Sementara ini: jangan proses sendiri. Tanyakan dulu sebelum menyentuh Odoo.'],
            confirm: [
              'Potong nota dilakukan di nota lama atau diterbitkan nota kredit baru?',
              'Apakah barang fisik tetap masuk Gudang Retur?',
              'Apakah tetap perlu transfer di Odoo? Kalau ya, menu yang mana?',
              'Bukti apa yang wajib disimpan (screenshot / nota revisi / approval)?',
            ],
          },
          children: [
            {
              id: 'c4-pending',
              type: 'pending',
              title: 'Detail alur menyusul',
              sub: 'Siap diisi kapan saja',
              detail: {
                summary: 'Node ini sengaja dikosongkan. Tinggal ditambahkan di data.js saat alurnya sudah jelas.',
              },
            },
          ],
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------
 * Wizard — mode simulasi tanya-jawab.
 * Setiap langkah menunjuk ke node tujuan di pohon supaya tidak ada duplikasi SOP.
 * ---------------------------------------------------------------------- */
const WIZARD = {
  start: 'q-status',
  steps: {
    'q-status': {
      question: 'Apa isi kolom Status Kerusakan Barang di Spreadsheet?',
      hint: 'Baca persis seperti yang tertulis. Kalau ragu, jangan menebak.',
      options: [
        { label: 'Sudah Tukar', next: 'q-db', carry: { jalur: 'Sudah Tukar' } },
        { label: 'Stok Mobil 1 / 2', next: 'q-db', carry: { jalur: 'Stok Mobil 1 / 2' } },
        { label: 'Belum Tukar', next: 'q-mobil', carry: { jalur: 'Belum Tukar' } },
        { label: 'Cancel', result: 'c3' , carry: { jalur: 'Cancel' } },
        { label: 'Potong Nota', result: 'c4', carry: { jalur: 'Potong Nota' } },
      ],
    },
    'q-db': {
      question: 'Barang ini milik database yang mana?',
      hint: 'Harus dipilih sebelum membuat transfer apa pun.',
      options: [
        { label: 'Solusi Teknologi Babel', result: 'c1', carry: { database: 'Solusi Teknologi Babel' } },
        { label: 'OriginalLine', result: 'c1', carry: { database: 'OriginalLine' } },
      ],
    },
    'q-mobil': {
      question: 'Barang retur dibawa oleh mobil yang mana?',
      hint: 'Menentukan operation type Mobil 1 atau Mobil 2.',
      options: [
        { label: 'Mobil 1', next: 'q-stok', carry: { mobil: 'Mobil 1' } },
        { label: 'Mobil 2', next: 'q-stok', carry: { mobil: 'Mobil 2' } },
      ],
    },
    'q-stok': {
      question: 'Stok pengganti dengan barang yang SAMA tersedia?',
      hint: 'Cek langsung di Odoo, jangan dari ingatan.',
      options: [
        { label: 'Tersedia', result: 'c2-sama', carry: { pengganti: 'Barang sama' } },
        { label: 'Tidak tersedia', result: 'c2-beda', carry: { pengganti: 'Barang beda' } },
      ],
    },
  },
};

/* Hal-hal yang masih perlu dikonfirmasi — dikumpulkan otomatis dari node. */
const OPEN_QUESTIONS_INTRO =
  'Daftar ini dikumpulkan otomatis dari seluruh node yang masih punya catatan "perlu dikonfirmasi". ' +
  'Selesaikan satu per satu supaya alurnya tidak punya celah.';
