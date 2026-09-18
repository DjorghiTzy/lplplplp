/* =========================================================================
 * photos.js — tempat menaruh foto bukti (foto barang, screenshot Odoo, nota).
 *
 * Disimpan di IndexedDB browser, dikelompokkan per NOMOR RETUR.
 * PENTING: ini penampungan sementara di perangkat ini saja — bukan backup.
 * Tujuan akhir foto tetap dilampirkan ke record Odoo / Spreadsheet.
 * ========================================================================= */
const Photos = (() => {
  'use strict';

  const DB = 'gudang-retur', STORE = 'bukti', VER = 1;
  const MAX_SIDE = 1800;        // sisi terpanjang setelah dikecilkan
  const KEEP_AS_IS = 400 * 1024; // di bawah ini tidak diutak-atik

  const KATEGORI = [
    { key:'barang',     label:'Foto barang retur' },
    { key:'screenshot', label:'Screenshot form Odoo' },
    { key:'nota',       label:'Foto nota' },
    { key:'lain',       label:'Lainnya' },
  ];

  let dbp = null;
  function open(){
    if(dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if(!('indexedDB' in window)) return rej(new Error('IndexedDB tidak tersedia'));
      const req = indexedDB.open(DB, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const s = db.createObjectStore(STORE, { keyPath:'id', autoIncrement:true });
          s.createIndex('noRetur', 'noRetur', { unique:false });
          s.createIndex('addedAt', 'addedAt', { unique:false });
        }
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return dbp;
  }

  function tx(mode, fn){
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      try{ out = fn(store); }catch(e){ return rej(e); }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    }));
  }

  /* Kecilkan gambar besar supaya penyimpanan browser tidak cepat penuh. */
  function shrink(file){
    if(!file.type.startsWith('image/') || file.size <= KEEP_AS_IS) return Promise.resolve(file);
    return new Promise(res => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        if(scale === 1 && file.size < 1.5 * 1024 * 1024) return res(file);
        const cv = document.createElement('canvas');
        cv.width  = Math.round(img.width  * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b => res(b || file), 'image/jpeg', .88);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  const ext = type => ({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp',
                         'image/heic':'heic', 'application/pdf':'pdf' }[type] || 'jpg');

  return {
    KATEGORI,
    labelKategori: k => (KATEGORI.find(x => x.key === k) || KATEGORI[3]).label,

    async add(file, { noRetur = '', kategori = 'lain', catatan = '' } = {}){
      const blob = await shrink(file);
      const rec = {
        noRetur: (noRetur || '').trim() || '(tanpa nomor)',
        kategori, catatan,
        name: file.name || 'tempel.png',
        type: blob.type || file.type || 'image/jpeg',
        size: blob.size,
        addedAt: Date.now(),
        blob,
      };
      const id = await tx('readwrite', s => s.add(rec));
      return { ...rec, id };
    },

    listBy(noRetur){
      const key = (noRetur || '').trim() || '(tanpa nomor)';
      return tx('readonly', s => new Promise((res, rej) => {
        const out = [];
        const req = s.index('noRetur').openCursor(IDBKeyRange.only(key));
        req.onsuccess = () => { const c = req.result; if(c){ out.push(c.value); c.continue(); } else res(out); };
        req.onerror = () => rej(req.error);
      })).then(p => p);
    },

    all(){
      return tx('readonly', s => new Promise((res, rej) => {
        const out = [];
        const req = s.openCursor();
        req.onsuccess = () => { const c = req.result; if(c){ out.push(c.value); c.continue(); } else res(out); };
        req.onerror = () => rej(req.error);
      })).then(p => p);
    },

    remove(id){ return tx('readwrite', s => s.delete(id)); },

    /* Nama file mengikuti nomor retur supaya bukti tidak tertukar. */
    fileName(rec, urut){
      const no = (rec.noRetur || 'RETUR').replace(/[^\w-]+/g, '_');
      return `${no}_${rec.kategori}${urut ? '-' + urut : ''}.${ext(rec.type)}`;
    },

    download(rec, urut){
      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a');
      a.href = url; a.download = this.fileName(rec, urut);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },

    async usage(){
      if(!navigator.storage?.estimate) return null;
      try{ return await navigator.storage.estimate(); }catch{ return null; }
    },
  };
})();
