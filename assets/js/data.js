/* =========================================================================
 * data.js — Sumber kebenaran tunggal (single source of truth) untuk
 * seluruh alur Gudang Retur. Ubah HANYA file ini kalau SOP berubah.
 * Tree, wizard, form entry, aturan silang, poster cetak, dan checklist
 * semuanya dibangun dari sini.
 * ========================================================================= */

const META = {
  version: '2.0',
  updated: '18 September 2026',
  owner: 'Admin Gudang',
};

/* Referensi cepat yang dipakai di banyak tempat */
const REF = {
  db: 'Solusi Teknologi Babel  /  OriginalLine',
  menuGD: 'Gudang Retur : Pindah Retur Penjualan GD Ke Gudang Retur',
  menuM1: 'Gudang Retur : Pindah Retur Penjualan Mobil 1 Ke Gudang Retur',
  menuM2: 'Gudang Retur : Pindah Retur Penjualan Mobil 2 Ke Gudang Retur',
  locGD: 'GDP/Stock',
  locRT: 'RT-GD/Stock',
  noPrefix: 'RT',
};

/* =========================================================================
 * NOMOR RETUR — benang merah antar Spreadsheet, Odoo, nota, dan screenshot.
 * Format: RT-BBTT-NNN   contoh: RT-0926-014  (bulan 09, tahun 26, urutan 014)
 * ========================================================================= */
const NOMOR = {
  format: 'RT-BBTT-NNN',
  contoh: 'RT-0926-014',
  regex: /^RT-\d{4}-\d{3}$/,
  build(date, urut){
    const bb = String(date.getMonth() + 1).padStart(2, '0');
    const tt = String(date.getFullYear() % 100).padStart(2, '0');
    return `${REF.noPrefix}-${bb}${tt}-${String(urut).padStart(3, '0')}`;
  },
  /* Empat tempat yang wajib memuat nomor yang sama persis */
  jejak: [
    'Kolom pertama baris Spreadsheet',
    'Field <b>Source Document</b> di form Odoo',
    'Tulisan di nota (nota retur maupun nota pengganti)',
    'Nama file screenshot bukti',
  ],
};

/* =========================================================================
 * STEPS — pustaka langkah yang dipakai ulang oleh beberapa cabang.
 * Ditulis SEKALI di sini, lalu dipanggil lewat step('key', { id }).
 * Ini yang mencegah satu langkah punya dua versi berbeda di dua cabang.
 * ========================================================================= */
const STEPS = {
  'odoo-db': {
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
  },

  'isi-form': {
    type: 'process',
    title: 'Isi Contact, Product, Note, dan Source Document',
    sub: 'New → Contact → Add a product → Note',
    detail: {
      summary: 'Bagian yang paling sering salah entry. Isi berurutan, jangan melompat.',
      steps: [
        'Isi <b>Contact</b> — nama customer pemilik barang retur.',
        'Isi <b>Source Document</b> dengan <b>nomor retur</b> dari Spreadsheet (mis. <code>RT-0926-014</code>).',
        'Tab <b>Operations</b> → <b>Add a Product</b>: pilih produk, isi <b>Demand</b> sesuai qty fisik.',
        'Isi <b>Note</b> — alasan retur, kondisi barang, dan nomor retur.',
      ],
      fields: [
        { label: 'Contact', value: 'Nama customer (wajib)' },
        { label: 'Source Document', value: 'Nomor retur (wajib)' },
        { label: 'Demand', value: 'Qty sesuai fisik barang (wajib)' },
        { label: 'Note', value: 'Alasan retur + kondisi + nomor retur (wajib)' },
      ],
      checklist: [
        'Contact sudah diisi',
        'Source Document = nomor retur yang sama dengan Spreadsheet',
        'Produk sudah benar (cek kode / barcode, bukan cuma nama)',
        'Qty Demand = qty fisik',
        'Note sudah diisi lengkap',
      ],
      warn: [
        'Produk dengan nama mirip sangat banyak. Verifikasi lewat kode/barcode, jangan dari nama saja.',
        'Source Document kosong = transfer ini tidak bisa ditelusuri balik ke baris Spreadsheet-nya.',
        'Note kosong = bulan depan tidak ada yang ingat kenapa barang ini diretur.',
      ],
    },
  },

  'validate': {
    type: 'process',
    title: 'Mark as Todo → Validate',
    sub: 'Draft → Ready → Done',
    detail: {
      summary: 'Dua klik terakhir di Odoo. Setelah Validate, stok benar-benar berpindah.',
      steps: [
        'Klik <b>Mark as Todo</b> — status berubah Draft → Ready.',
        'Baca ulang sekali lagi: Contact, Source Document, Produk, Qty, Source & Destination Location.',
        'Klik <b>Validate</b> — status menjadi <b>Done</b>.',
        'Salin nomor Reference transfer (<code>WH/INT/…</code>) balik ke baris Spreadsheet.',
      ],
      checklist: [
        'Status sudah Done',
        'Nomor Reference sudah disalin balik ke Spreadsheet',
      ],
      warn: ['Validate tidak bisa di-undo sembarangan. Baca ulang SEBELUM klik, bukan sesudah.'],
    },
  },
};

/* Ambil langkah dari pustaka, boleh ditimpa sebagian (id, sub, children, dst). */
function step(key, over = {}){
  const base = STEPS[key];
  if(!base) throw new Error('STEPS tidak punya key: ' + key);
  return { ...base, ...over, detail: { ...base.detail, ...(over.detail || {}) } };
}

/* =========================================================================
 * FLOW — pohon alur.
 * type: start | decision | condition | process | outcome | pending
 * ========================================================================= */
const FLOW = {
  id: 'root',
  type: 'start',
  title: 'Barang Retur Masuk',
  sub: 'Terbitkan nomor retur lebih dulu',
  detail: {
    summary:
      'Setiap barang retur yang masuk WAJIB dicatat dulu di Spreadsheet sebelum disentuh di Odoo. ' +
      'Spreadsheet adalah sumber keputusan; Odoo hanya mengeksekusi keputusan itu.',
    steps: [
      'Terima barang retur dari customer / tim logistik.',
      'Buka Spreadsheet retur, buat baris baru.',
      `Terbitkan <b>nomor retur</b> dengan format <code>${NOMOR.format}</code> (contoh <code>${NOMOR.contoh}</code>) di kolom pertama.`,
      'Pastikan nama customer, nama barang, dan qty sudah cocok dengan fisik barang.',
      'Isi / baca kolom <b>Status Kerusakan Barang</b> — kolom ini yang menentukan cabang alur.',
    ],
    fields: [
      { label: 'Format nomor', value: NOMOR.format },
      { label: 'Contoh', value: NOMOR.contoh },
    ],
    checklist: [
      'Nomor retur sudah diterbitkan dan ditulis di Spreadsheet',
      'Fisik barang sudah dihitung dan cocok dengan Spreadsheet',
      'Nama customer di Spreadsheet sudah benar',
      'Kolom Status Kerusakan Barang sudah terisi',
    ],
    warn: [
      'Jangan pernah mulai dari Odoo. Kalau Spreadsheet belum diisi, data akan tidak konsisten dan sulit ditelusuri.',
      'Satu kejadian retur = satu nomor retur. Jangan menumpuk dua barang berbeda di satu nomor.',
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
              'Cabang ini memakai menu <b>GD Ke Gudang Retur</b> (bukan menu Mobil), sesuai SOP yang diberikan. ' +
              'Untuk status Stok Mobil 1/2, mohon konfirmasi sekali lagi: barang fisiknya berangkat dari ' +
              'gudang pusat (GDP/Stock) atau dari lokasi mobil? Kalau dari lokasi mobil, menunya seharusnya menu Mobil.',
            ],
          },
          children: [
            step('odoo-db', { id: 'c1-odoo', children: [
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
                  step('isi-form', { id: 'c1-isi', children: [
                    step('validate', { id: 'c1-validate', children: [
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
                            'Nomor retur, nomor transfer Odoo, dan nota sudah saling cocok',
                          ],
                        },
                      },
                    ]}),
                  ]}),
                ],
              },
            ]}),
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
            step('odoo-db', { id: 'c2-odoo', children: [
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
                  ],
                  fields: [
                    { label: 'Operation Type', value: 'Pindah Retur Penjualan Mobil 1 / Mobil 2 Ke Gudang Retur' },
                    { label: 'Source Location', value: 'Lokasi stok Mobil 1 / Mobil 2' },
                    { label: 'Destination Location', value: REF.locRT },
                  ],
                  checklist: [
                    'Nomor mobil di operation type = mobil yang benar-benar membawa barang',
                    `Destination Location = ${REF.locRT}`,
                  ],
                  warn: ['Mobil 1 vs Mobil 2 tertukar adalah error yang baru ketahuan saat stock opname. Cek dua kali.'],
                },
                children: [
                  step('isi-form', { id: 'c2-isi', children: [
                    step('validate', { id: 'c2-validate', children: [
                      {
                        id: 'c2-decision',
                        type: 'decision',
                        title: 'Stok pengganti barang SAMA tersedia?',
                        sub: 'Penentu jenis bukti yang dibuat',
                        detail: {
                          summary:
                            'Pertanyaan ini menentukan apakah kamu mengganti dengan barang yang sama persis, ' +
                            'atau terpaksa mengganti dengan barang lain.',
                          steps: [
                            'Cek stok barang yang sama (kode produk identik) di Odoo.',
                            'Pastikan yang kamu lihat adalah stok <b>tersedia</b> (On Hand dikurangi yang sudah dibooking), bukan sekadar On Hand.',
                            'Jawab: tersedia → cabang atas, tidak tersedia → cabang bawah.',
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
                                '<b>Wajib buat nota</b> untuk barang pengganti tersebut, cantumkan nomor retur di nota.',
                                'Serahkan barang pengganti ke <b>tim logistik</b> untuk dikirim ke customer.',
                                'Catat nomor nota + nomor transfer Odoo ke Spreadsheet.',
                                'Ubah status di Spreadsheet dari "Belum Tukar" menjadi "Sudah Tukar".',
                              ],
                              checklist: [
                                'Nota sudah dibuat dan memuat nomor retur',
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
                                '<b>Wajib buat nota</b> untuk barang pengganti, cantumkan nomor retur di nota.',
                                '<b>Wajib screenshot</b> form transfer di Odoo — form Internal Transfer dengan Operation Type, Source & Destination Location, dan baris produk terlihat jelas.',
                                'Simpan screenshot dengan nama file = nomor retur, lalu lampirkan sebagai attachment di record Odoo-nya.',
                                'Serahkan barang pengganti ke tim logistik.',
                                'Catat nomor nota + nomor transfer + barang pengganti ke Spreadsheet.',
                              ],
                              checklist: [
                                'Penggantian barang beda sudah dikonfirmasi ke customer / sales',
                                'Nota sudah dibuat dan memuat nomor retur',
                                'Screenshot form Odoo sudah diambil',
                                'Screenshot menampilkan Operation Type + Source/Destination Location + baris produk',
                                'Nama file screenshot = nomor retur',
                                'Barang pengganti sudah diserahkan ke tim logistik',
                                'Semua nomor bukti tercatat di Spreadsheet',
                              ],
                              warn: [
                                'Screenshot bukan formalitas. Barang beda = harga bisa beda = potensi selisih nilai stok. Screenshot adalah pembelanya saat diaudit.',
                                'Screenshot yang terpotong dan tidak menampilkan Operation Type dianggap tidak sah.',
                              ],
                              confirm: [
                                'Tempat simpan screenshot belum ditetapkan resmi. Rekomendasi: lampirkan sebagai <b>attachment di record Odoo</b>, bukan folder terpisah — attachment ikut record selamanya dan tidak tercecer saat orangnya ganti.',
                                'Apakah perlu approval sales/atasan sebelum mengganti dengan barang berbeda?',
                              ],
                            },
                          },
                        ],
                      },
                    ]}),
                  ]}),
                ],
              },
            ]}),
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
            summary: 'Status <b>Cancel</b> sudah teridentifikasi sebagai cabang, tetapi langkah detailnya belum dijelaskan.',
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
                summary: 'Node ini sengaja dikosongkan. Begitu alurnya dijelaskan, isinya tinggal ditambahkan di data.js dan seluruh aplikasi ikut ter-update.',
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
            summary: 'Status <b>Potong Nota</b> sudah teridentifikasi sebagai cabang, tetapi langkah detailnya belum dijelaskan.',
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

/* =========================================================================
 * WIZARD — mode simulasi tanya-jawab.
 * Setiap pilihan menunjuk ke `next` (pertanyaan lain) atau `result` (id node).
 * ========================================================================= */
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
        { label: 'Cancel', result: 'c3', carry: { jalur: 'Cancel' } },
        { label: 'Potong Nota', result: 'c4', carry: { jalur: 'Potong Nota' } },
      ],
    },
    'q-db': {
      question: 'Barang ini milik database yang mana?',
      hint: 'Harus dipilih sebelum membuat transfer apa pun.',
      options: [
        { label: 'Solusi Teknologi Babel', result: 'c1-done', carry: { database: 'Solusi Teknologi Babel' } },
        { label: 'OriginalLine', result: 'c1-done', carry: { database: 'OriginalLine' } },
      ],
    },
    'q-mobil': {
      question: 'Barang retur dibawa oleh mobil yang mana?',
      hint: 'Menentukan operation type Mobil 1 atau Mobil 2.',
      options: [
        { label: 'Mobil 1', next: 'q-db2', carry: { mobil: 'Mobil 1' } },
        { label: 'Mobil 2', next: 'q-db2', carry: { mobil: 'Mobil 2' } },
      ],
    },
    'q-db2': {
      question: 'Barang ini milik database yang mana?',
      hint: 'Harus dipilih sebelum membuat transfer apa pun.',
      options: [
        { label: 'Solusi Teknologi Babel', next: 'q-stok', carry: { database: 'Solusi Teknologi Babel' } },
        { label: 'OriginalLine', next: 'q-stok', carry: { database: 'OriginalLine' } },
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

/* Cabang yang belum ditetapkan alurnya — form entry dilewati. */
const JALUR_BUNTU = ['Cancel', 'Potong Nota'];

/* =========================================================================
 * FORM — data yang dikumpulkan setelah pertanyaan selesai.
 * Dipakai untuk membuat teks siap tempel + menjalankan aturan silang.
 * `when` menentukan field muncul atau tidak.
 * ========================================================================= */
const FORM = [
  { key:'noRetur',  label:'Nomor retur',        type:'text',  auto:'retur', required:true,
    hint:`Format ${NOMOR.format}, contoh ${NOMOR.contoh}` },
  { key:'tanggal',  label:'Tanggal',            type:'date',  auto:'today', required:true },
  { key:'customer', label:'Customer',           type:'text',  required:true, hint:'Sama persis dengan field Contact di Odoo' },
  { key:'produk',   label:'Produk (kode / nama)', type:'text', required:true },
  { key:'qty',      label:'Qty',                type:'number', required:true },
  { key:'alasan',   label:'Alasan retur / kondisi barang', type:'textarea', required:true },
  { key:'produkPengganti', label:'Produk pengganti', type:'text',
    when: c => c.pengganti === 'Barang beda', required:true },
  { key:'noNota',   label:'Nomor nota pengganti', type:'text',
    when: c => c.jalur === 'Belum Tukar', hint:'Kosongkan kalau nota belum dibuat' },
  { key:'noTransfer', label:'Nomor transfer Odoo', type:'text', hint:'WH/INT/… — isi setelah Validate' },
  { key:'konfirmasiOk', label:'Penggantian barang beda sudah dikonfirmasi ke customer / sales',
    type:'check', when: c => c.pengganti === 'Barang beda' },
  { key:'screenshotOk', label:'Screenshot form Odoo sudah diambil dan dilampirkan',
    type:'check', when: c => c.pengganti === 'Barang beda' },
  { key:'statusDiubah', label:'Status Spreadsheet sudah diubah menjadi "Sudah Tukar"',
    type:'check', when: c => c.jalur === 'Belum Tukar' },
];

/* =========================================================================
 * RULES — aturan silang. Menangkap kesalahan yang hanya terlihat kalau
 * dua jawaban dibaca bersamaan. `when` true berarti ADA pelanggaran.
 * level: danger (jangan dilanjutkan) | warn (periksa lagi) | info
 * ========================================================================= */
const RULES = [
  {
    id: 'nota-tanpa-status',
    level: 'danger',
    title: 'Nota sudah terbit tapi status masih "Belum Tukar"',
    msg: 'Barang pengganti sudah dikeluarkan, jadi status di Spreadsheet WAJIB diubah menjadi "Sudah Tukar". Kalau tidak, barang yang sama bisa diproses dua kali.',
    when: c => c.jalur === 'Belum Tukar' && !!c.noNota && !c.statusDiubah,
  },
  {
    id: 'beda-tanpa-screenshot',
    level: 'danger',
    title: 'Ganti barang beda tanpa screenshot',
    msg: 'Penggantian dengan barang berbeda tidak sah tanpa screenshot form Odoo. Ambil screenshot, taruh di bagian Bukti Foto, lalu lampirkan ke record Odoo sebelum barang diserahkan ke logistik.',
    /* `fotoScreenshot` diisi aplikasi: true kalau sudah ada foto berkategori screenshot. */
    when: c => c.pengganti === 'Barang beda' && !c.screenshotOk && !c.fotoScreenshot,
  },
  {
    id: 'beda-tanpa-konfirmasi',
    level: 'warn',
    title: 'Barang beda belum dikonfirmasi ke customer',
    msg: 'Customer menerima barang yang tidak dia beli. Konfirmasi ke customer atau sales dulu sebelum barang dikirim.',
    when: c => c.pengganti === 'Barang beda' && !c.konfirmasiOk,
  },
  {
    id: 'belum-tukar-tanpa-nota',
    level: 'warn',
    title: 'Belum ada nomor nota pengganti',
    msg: 'Cabang "Belum Tukar" wajib menghasilkan nota pengganti. Kalau nota memang belum dibuat, jangan tandai baris ini selesai.',
    when: c => c.jalur === 'Belum Tukar' && !c.noNota,
  },
  {
    id: 'nomor-salah-format',
    level: 'warn',
    title: 'Format nomor retur tidak sesuai',
    msg: `Nomor retur harus berformat ${NOMOR.format} (contoh ${NOMOR.contoh}). Format yang tidak seragam membuat pencarian antar Spreadsheet, Odoo, dan nota gagal.`,
    when: c => !!c.noRetur && !NOMOR.regex.test(c.noRetur),
  },
  {
    id: 'qty-tidak-wajar',
    level: 'danger',
    title: 'Qty tidak wajar',
    msg: 'Qty harus lebih besar dari 0 dan sama persis dengan jumlah fisik barang yang diterima.',
    when: c => c.qty !== undefined && c.qty !== '' && Number(c.qty) <= 0,
  },
  {
    id: 'produk-pengganti-sama',
    level: 'warn',
    title: 'Produk pengganti tertulis sama dengan produk retur',
    msg: 'Kamu memilih cabang "Ganti Barang Beda", tapi produk pengganti yang ditulis sama dengan produk yang diretur. Salah satu dari keduanya keliru.',
    when: c => c.pengganti === 'Barang beda' && !!c.produkPengganti && !!c.produk &&
               c.produkPengganti.trim().toLowerCase() === c.produk.trim().toLowerCase(),
  },
  {
    id: 'transfer-belum-dicatat',
    level: 'info',
    title: 'Nomor transfer Odoo belum diisi',
    msg: 'Setelah Validate, salin nomor Reference (WH/INT/…) ke Spreadsheet supaya baris ini bisa ditelusuri balik ke Odoo.',
    when: c => !c.noTransfer,
  },
  {
    id: 'jalur-buntu',
    level: 'danger',
    title: 'Alur untuk status ini belum ditetapkan',
    msg: 'Status Cancel dan Potong Nota belum punya SOP resmi. Jangan proses sendiri — tanyakan dulu ke pemilik proses.',
    when: c => JALUR_BUNTU.includes(c.jalur),
  },
];

/* =========================================================================
 * SHEET_COLUMNS — urutan kolom saat baris ditempel ke Spreadsheet.
 * SESUAIKAN urutan di sini kalau kolom Spreadsheet kamu berbeda.
 * ========================================================================= */
const SHEET_COLUMNS = [
  { label:'Nomor Retur',      get: c => c.noRetur || '' },
  { label:'Tanggal',          get: c => c.tanggal || '' },
  { label:'Customer',         get: c => c.customer || '' },
  { label:'Produk',           get: c => c.produk || '' },
  { label:'Qty',              get: c => c.qty || '' },
  { label:'Status Kerusakan', get: c => (c.jalur === 'Belum Tukar' && c.statusDiubah) ? 'Sudah Tukar' : (c.jalur || '') },
  { label:'Mobil',            get: c => c.mobil || '' },
  { label:'Database',         get: c => c.database || '' },
  { label:'Penggantian',      get: c => c.pengganti || '' },
  { label:'Produk Pengganti', get: c => c.produkPengganti || '' },
  { label:'No. Nota',         get: c => c.noNota || '' },
  { label:'No. Transfer Odoo',get: c => c.noTransfer || '' },
  { label:'Alasan Retur',     get: c => (c.alasan || '').replace(/\s*\n\s*/g, ' ') },
];

/* =========================================================================
 * OUTPUT — teks siap tempel. Sumbernya satu, jadi isi Odoo dan Spreadsheet
 * mustahil berbeda.
 * ========================================================================= */
const OUTPUT = {
  odooNote(c){
    const l = [];
    l.push(`[${c.noRetur || '(nomor retur belum diisi)'}] Retur ${c.customer || '-'}`);
    l.push(`Produk : ${c.produk || '-'}  x${c.qty || '-'}`);
    l.push(`Status : ${c.jalur || '-'}${c.mobil ? ' — ' + c.mobil : ''}`);
    l.push(`Alasan : ${(c.alasan || '-').replace(/\s*\n\s*/g, ' ')}`);
    if(c.pengganti) l.push(`Pengganti : ${c.pengganti}${c.produkPengganti ? ' — ' + c.produkPengganti : ''}`);
    if(c.noNota) l.push(`Nota pengganti : ${c.noNota}`);
    l.push(`Dicatat : ${c.tanggal || '-'}`);
    return l.join('\n');
  },
  sheetRow: c => SHEET_COLUMNS.map(col => col.get(c)).join('\t'),
  sheetHeader: () => SHEET_COLUMNS.map(col => col.label).join('\t'),
};

/* Hal-hal yang masih perlu dikonfirmasi — dikumpulkan otomatis dari node. */
const OPEN_QUESTIONS_INTRO =
  'Daftar ini dikumpulkan otomatis dari seluruh node yang masih punya catatan "perlu dikonfirmasi". ' +
  'Selesaikan satu per satu supaya alurnya tidak punya celah.';
