/* =========================================================================
 * app.js — render diagram pohon, panel detail, simulasi, dan catatan.
 * Semua isi SOP datang dari data.js; file ini hanya mengurus tampilan.
 * ========================================================================= */
(() => {
'use strict';

/* ------------------------------ util ------------------------------ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KIND = {
  start:'Titik Awal', decision:'Percabangan', condition:'Kondisi',
  process:'Langkah Kerja', outcome:'Hasil Akhir', pending:'Menunggu Detail',
};
const ICON = {
  chevron:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 5l7 7-7 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4 10-10"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>',
  ask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 3.6 2.7c-.5.2-.8.7-.8 1.3v.4M12 17h.01"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><path d="M7.5 7.5h.01"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2Z"/><path d="M9 4v14M15 6v14"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m12 3 2.2 4.8L19 10l-4.8 2.2L12 17l-2.2-4.8L5 10l4.8-2.2Z"/></svg>',
  image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-5 5-2-2-5 5"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 19h16"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="7" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
};
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v);}catch{ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} },
};
let toastTimer;
function toast(msg){
  let t = $('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
}
const strip = h => String(h || '').replace(/<[^>]+>/g, '');

/* ------------------------------ index pohon ------------------------------ */
const NODES = new Map();   // id -> { data, parent, depth }
(function index(n, parent = null, depth = 0){
  NODES.set(n.id, { data:n, parent, depth });
  (n.children || []).forEach(c => index(c, n.id, depth + 1));
})(FLOW);

const searchText = id => {
  const n = NODES.get(id).data, d = n.detail || {};
  return strip([
    n.title, n.sub, d.summary,
    (d.steps||[]).join(' '), (d.checklist||[]).join(' '),
    (d.warn||[]).join(' '), (d.confirm||[]).join(' '),
    (d.fields||[]).map(f => f.label + ' ' + f.value).join(' '),
  ].join(' ')).toLowerCase();
};
const ancestors = id => { const out = []; let p = NODES.get(id).parent; while(p){ out.push(p); p = NODES.get(p).parent; } return out; };

/* ------------------------------ state ------------------------------ */
const open = new Set();                 // id node yang cabangnya terbuka
const state = { k:1, tx:0, ty:0, selected:null, view:'tree' };
const GAP_X = 78, GAP_Y = 16;
const els = new Map();                  // id -> element kartu
const linkEls = new Map();              // "parent>child" -> { el, pts }
const pos = new Map();                  // id -> { x, y, w, h }

/* buka cabang utama secara default */
['root','decision-status'].forEach(id => open.add(id));

const dom = {
  wrap:$('#treeWrap'), canvas:$('#canvas'), svg:$('#links'), nodes:$('#nodes'),
  panel:$('#panel'), scrim:$('#panelScrim'),
};

/* ------------------------------ kartu node ------------------------------ */
function makeCard(id){
  const { data:n } = NODES.get(id);
  const kids = (n.children || []).length;
  const card = document.createElement('div');
  card.className = 'node';
  card.dataset.id = id;
  card.dataset.type = n.type;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.innerHTML = `
    <span class="node-kind">${KIND[n.type] || ''}</span>
    <div class="node-title">${n.title}</div>
    ${n.sub ? `<p class="node-sub">${n.sub}</p>` : ''}
    ${(n.badges||[]).length ? `<div class="node-badges">${
      n.badges.map(b => `<span class="badge ${b.tone}">${b.label}</span>`).join('')}</div>` : ''}
    ${kids ? `<button class="node-toggle" aria-label="Buka/tutup cabang">${ICON.plus}</button>
              <span class="node-count">${kids}</span>` : ''}
  `;
  card.addEventListener('click', e => {
    if(e.target.closest('.node-toggle')){ toggle(id); return; }
    select(id);
  });
  card.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(id); }
    if(e.key === 'ArrowRight' && kids){ e.preventDefault(); if(!open.has(id)) toggle(id); }
    if(e.key === 'ArrowLeft'  && kids){ e.preventDefault(); if(open.has(id))  toggle(id); }
  });
  return card;
}

/* ------------------------------ layout ------------------------------ */
function visibleTree(){
  const list = [];
  (function walk(n){
    list.push(n.id);
    if(open.has(n.id)) (n.children || []).forEach(walk);
  })(FLOW);
  return list;
}

function layout(){
  const vis = visibleTree();
  const set = new Set(vis);
  let cursor = 0;

  (function place(n, depth){
    const p = pos.get(n.id);
    const kids = open.has(n.id) ? (n.children || []) : [];
    p.x = depth * (p.w + GAP_X);
    if(!kids.length){
      p.y = cursor;
      cursor += p.h + GAP_Y;
    }else{
      kids.forEach(c => place(c, depth + 1));
      const first = pos.get(kids[0].id), last = pos.get(kids[kids.length - 1].id);
      const mid = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
      p.y = Math.max(mid - p.h / 2, 0);
      // cegah tumpang tindih kalau induk lebih tinggi dari anak-anaknya
      cursor = Math.max(cursor, p.y + p.h + GAP_Y);
    }
  })(FLOW, 0);

  return { vis, set };
}

function pathOf(a, b){
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  const x2 = b.x,       y2 = b.y + b.h / 2;
  return { x1, y1, x2, y2 };
}
const dOf = p => {
  const dx = Math.max((p.x2 - p.x1) * .5, 26);
  return `M${p.x1},${p.y1} C${p.x1 + dx},${p.y1} ${p.x2 - dx},${p.y2} ${p.x2},${p.y2}`;
};
const easeOut = t => 1 - Math.pow(1 - t, 4);

function tweenPath(entry, to, dur = 560){
  const from = entry.pts;
  if(!from){ entry.pts = to; entry.el.setAttribute('d', dOf(to)); return; }
  cancelAnimationFrame(entry.raf);
  const t0 = performance.now();
  const step = now => {
    const t = Math.min((now - t0) / dur, 1), e = easeOut(t);
    const cur = {
      x1: from.x1 + (to.x1 - from.x1) * e, y1: from.y1 + (to.y1 - from.y1) * e,
      x2: from.x2 + (to.x2 - from.x2) * e, y2: from.y2 + (to.y2 - from.y2) * e,
    };
    entry.el.setAttribute('d', dOf(cur));
    if(t < 1) entry.raf = requestAnimationFrame(step); else entry.pts = to;
  };
  entry.raf = requestAnimationFrame(step);
}

/* render penuh: buat/hapus kartu, hitung layout, animasikan */
function render(opts = {}){
  const vis = visibleTree();
  const visSet = new Set(vis);
  const fresh = [];

  // 1. buat kartu yang belum ada
  vis.forEach(id => {
    if(!els.has(id)){
      const card = makeCard(id);
      card.style.opacity = '0';
      dom.nodes.appendChild(card);
      els.set(id, card);
      fresh.push(id);
    }
  });

  // 2. ukur
  vis.forEach(id => {
    const card = els.get(id);
    const prev = pos.get(id) || {};
    pos.set(id, { ...prev, w: card.offsetWidth, h: card.offsetHeight });
  });

  // 3. hitung posisi
  layout();

  // 4. terapkan posisi + animasi
  vis.forEach((id, i) => {
    const card = els.get(id), p = pos.get(id);
    card.classList.toggle('is-open', open.has(id));
    if(fresh.includes(id)){
      const par = NODES.get(id).parent;
      const from = par && pos.get(par) ? pos.get(par) : p;
      card.style.transition = 'none';
      card.style.transform = `translate(${from.x}px,${from.y}px) scale(.9)`;
      card.offsetHeight; // reflow
      card.style.transition = '';
      const delay = Math.min(i, 8) * 28;
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = `translate(${p.x}px,${p.y}px)`;
      }, delay);
    }else{
      card.style.opacity = '1';
      card.style.transform = `translate(${p.x}px,${p.y}px)`;
    }
  });

  // 5. buang kartu yang tidak terlihat lagi
  [...els.keys()].forEach(id => {
    if(visSet.has(id)) return;
    const card = els.get(id);
    const par = NODES.get(id).parent;
    const target = par && pos.get(par) ? pos.get(par) : pos.get(id);
    card.style.opacity = '0';
    if(target) card.style.transform = `translate(${target.x}px,${target.y}px) scale(.85)`;
    els.delete(id);
    setTimeout(() => card.remove(), 420);
  });

  // 6. garis penghubung
  const wanted = new Set();
  vis.forEach(id => {
    if(!open.has(id)) return;
    (NODES.get(id).data.children || []).forEach(c => {
      if(!visSet.has(c.id)) return;
      const key = id + '>' + c.id;
      wanted.add(key);
      const geo = pathOf(pos.get(id), pos.get(c.id));
      let entry = linkEls.get(key);
      if(!entry){
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'link');
        path.dataset.key = key;
        path.setAttribute('d', dOf(geo));
        const len = Math.hypot(geo.x2 - geo.x1, geo.y2 - geo.y1) * 1.35;
        path.style.setProperty('--len', len.toFixed(0));
        path.classList.add('link-draw');
        dom.svg.appendChild(path);
        entry = { el:path, pts:geo };
        linkEls.set(key, entry);
        setTimeout(() => path.classList.remove('link-draw'), 700);
      }else{
        tweenPath(entry, geo);
      }
    });
  });
  [...linkEls.keys()].forEach(key => {
    if(wanted.has(key)) return;
    const { el } = linkEls.get(key);
    el.style.opacity = '0';
    linkEls.delete(key);
    setTimeout(() => el.remove(), 380);
  });

  // 7. ukuran kanvas svg
  let maxX = 0, maxY = 0;
  vis.forEach(id => { const p = pos.get(id); maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); });
  dom.svg.setAttribute('width', maxX + 40);
  dom.svg.setAttribute('height', maxY + 40);

  paintHighlight();
  if(opts.fit) fit();
  if(opts.focus) centerOn(opts.focus);
}

/* ------------------------------ sorot jalur ------------------------------ */
function paintHighlight(){
  const id = state.selected;
  const path = id ? [id, ...ancestors(id)] : [];
  const pathSet = new Set(path);
  els.forEach((el, nid) => {
    el.classList.toggle('is-selected', nid === id);
  });
  linkEls.forEach((entry, key) => {
    const [a, b] = key.split('>');
    entry.el.classList.toggle('is-lit', pathSet.has(a) && pathSet.has(b));
  });
}

/* ------------------------------ interaksi pohon ------------------------------ */
function toggle(id){
  if(open.has(id)) open.delete(id); else open.add(id);
  render();
}
function expandAll(){ NODES.forEach((v, id) => { if((v.data.children||[]).length) open.add(id); }); render({ fit:true }); }
function collapseAll(){ open.clear(); open.add('root'); render({ fit:true }); }

function applyTransform(animate){
  dom.canvas.classList.toggle('is-animating', !!animate);
  dom.canvas.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.k})`;
  if(animate) setTimeout(() => dom.canvas.classList.remove('is-animating'), 600);
}
function fit(){
  const vis = visibleTree();
  if(!vis.length) return;
  let maxX = 0, maxY = 0;
  vis.forEach(id => { const p = pos.get(id); if(!p) return; maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); });
  const box = dom.wrap.getBoundingClientRect();
  const pad = 56;
  const k = Math.min((box.width - pad * 2) / maxX, (box.height - pad * 2) / maxY, 1);
  state.k = Math.max(k, .22);
  state.tx = (box.width  - maxX * state.k) / 2;
  state.ty = (box.height - maxY * state.k) / 2;
  applyTransform(true);
}
function centerOn(id){
  const p = pos.get(id); if(!p) return;
  const box = dom.wrap.getBoundingClientRect();
  state.k = Math.max(state.k, .7);
  state.tx = box.width  / 2 - (p.x + p.w / 2) * state.k;
  state.ty = box.height / 2 - (p.y + p.h / 2) * state.k;
  applyTransform(true);
}
function zoomBy(mult, cx, cy){
  const box = dom.wrap.getBoundingClientRect();
  const px = cx ?? box.width / 2, py = cy ?? box.height / 2;
  const k2 = Math.min(Math.max(state.k * mult, .22), 2.2);
  state.tx = px - (px - state.tx) * (k2 / state.k);
  state.ty = py - (py - state.ty) * (k2 / state.k);
  state.k = k2;
  applyTransform(true);
}

/* geser & zoom */
(() => {
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;
  dom.wrap.addEventListener('pointerdown', e => {
    if(e.target.closest('.node')) return;
    dragging = true; moved = 0;
    sx = e.clientX; sy = e.clientY; ox = state.tx; oy = state.ty;
    dom.wrap.classList.add('is-dragging');
    dom.wrap.setPointerCapture(e.pointerId);
  });
  dom.wrap.addEventListener('pointermove', e => {
    if(!dragging) return;
    moved = Math.max(moved, Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy));
    state.tx = ox + (e.clientX - sx);
    state.ty = oy + (e.clientY - sy);
    applyTransform(false);
  });
  const stop = e => {
    if(!dragging) return;
    dragging = false;
    dom.wrap.classList.remove('is-dragging');
    try{ dom.wrap.releasePointerCapture(e.pointerId); }catch{}
  };
  dom.wrap.addEventListener('pointerup', stop);
  dom.wrap.addEventListener('pointercancel', stop);
  dom.wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const box = dom.wrap.getBoundingClientRect();
    if(e.ctrlKey || Math.abs(e.deltaY) > 40){
      zoomBy(e.deltaY < 0 ? 1.12 : .89, e.clientX - box.left, e.clientY - box.top);
    }else{
      state.tx -= e.deltaX; state.ty -= e.deltaY; applyTransform(false);
    }
  }, { passive:false });
})();

$$('.tool').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.act;
  if(a === 'expand') expandAll();
  if(a === 'collapse') collapseAll();
  if(a === 'fit') fit();
  if(a === 'zoomin') zoomBy(1.2);
  if(a === 'zoomout') zoomBy(.83);
}));

/* ------------------------------ panel detail ------------------------------ */
function sec(title, icon, body){
  return `<section class="sec"><h3 class="sec-title">${icon}${title}</h3>${body}</section>`;
}
function checklistHTML(id, items){
  return `<ul class="checks">${items.map((t, i) => {
    const done = store.get(`chk:${id}:${i}`, false);
    return `<li><button class="check${done ? ' is-done' : ''}" data-chk="${id}:${i}">
      <span class="box">${ICON.check}</span><span class="txt">${t}</span></button></li>`;
  }).join('')}</ul>`;
}

function select(id){
  state.selected = id;
  paintHighlight();
  openPanel(id);
  ensureVisible(id);
}

/* geser kanvas supaya kartu terpilih tidak tertutup panel detail */
function ensureVisible(id){
  const p = pos.get(id); if(!p) return;
  const box = dom.wrap.getBoundingClientRect();
  const panelW = window.innerWidth > 640 ? Math.min(440, window.innerWidth) : 0;
  const safeRight = box.width - panelW - 24;
  const left  = state.tx + p.x * state.k;
  const right = state.tx + (p.x + p.w) * state.k;
  let moved = false;
  if(right > safeRight){ state.tx -= right - safeRight; moved = true; }
  else if(left < 24){ state.tx += 24 - left; moved = true; }
  const top = state.ty + p.y * state.k, bottom = state.ty + (p.y + p.h) * state.k;
  if(bottom > box.height - 24){ state.ty -= bottom - (box.height - 24); moved = true; }
  else if(top < 24){ state.ty += 24 - top; moved = true; }
  if(moved) applyTransform(true);
}

function openPanel(id){
  const { data:n } = NODES.get(id);
  const d = n.detail || {};
  $('#panelKind').textContent = KIND[n.type] || '';
  $('#panelKind').style.setProperty('--accent', `var(--c-${n.type})`);
  $('#panelTitle').innerHTML = n.title;
  $('#panelSub').textContent = n.sub || '';

  let html = '';
  if(d.summary) html += sec('Ringkasan', ICON.doc, `<p class="summary">${d.summary}</p>`);
  if(d.steps?.length) html += sec('Langkah', ICON.list, `<ol class="steps">${d.steps.map(s => `<li>${s}</li>`).join('')}</ol>`);
  if(d.fields?.length) html += sec('Field Odoo', ICON.tag,
    `<div class="fields">${d.fields.map(f => `<div class="field"><span>${f.label}</span><b>${f.value}</b></div>`).join('')}</div>`);
  if(d.checklist?.length) html += sec('Checklist sebelum lanjut', ICON.check, checklistHTML(id, d.checklist));
  if(d.warn?.length) html += sec('Sering salah di sini', ICON.warn,
    `<div class="notes">${d.warn.map(w => `<div class="note warn">${ICON.warn}<span>${w}</span></div>`).join('')}</div>`);
  if(d.confirm?.length) html += sec('Perlu dikonfirmasi', ICON.ask,
    `<div class="notes">${d.confirm.map(w => `<div class="note ask">${ICON.ask}<span>${w}</span></div>`).join('')}</div>`);
  if(!html) html = `<p class="summary">Belum ada detail untuk node ini.</p>`;

  html += `<div class="wizard-foot"><button class="btn ghost" id="copyNode">${ICON.copy} Salin langkah</button></div>`;
  $('#panelBody').innerHTML = html;
  $('#panelBody').scrollTop = 0;
  $('#copyNode').addEventListener('click', () => copySteps(id));

  dom.panel.classList.add('is-open');
  dom.panel.setAttribute('aria-hidden', 'false');
  dom.scrim.classList.add('is-open');
}
function closePanel(){
  dom.panel.classList.remove('is-open');
  dom.panel.setAttribute('aria-hidden', 'true');
  dom.scrim.classList.remove('is-open');
}
$('#panelClose').addEventListener('click', closePanel);
dom.scrim.addEventListener('click', closePanel);
document.addEventListener('keydown', e => { if(e.key === 'Escape') closePanel(); });
/* klik di luar panel (mode desktop) ikut menutup */
document.addEventListener('pointerdown', e => {
  if(!dom.panel.classList.contains('is-open')) return;
  if(e.target.closest('.panel') || e.target.closest('.node')) return;
  if(e.target.closest('.wz-opt') || e.target.closest('.tab')) return;
  closePanel();
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-chk]');
  if(!b) return;
  const key = b.dataset.chk;
  const next = !b.classList.contains('is-done');
  b.classList.toggle('is-done', next);
  store.set('chk:' + key, next);
});

function copySteps(id){
  const { data:n } = NODES.get(id), d = n.detail || {};
  const lines = [`ALUR: ${strip(n.title)}`, n.sub ? `(${n.sub})` : '', ''];
  if(d.steps?.length){ lines.push('LANGKAH:'); d.steps.forEach((s, i) => lines.push(`${i + 1}. ${strip(s)}`)); lines.push(''); }
  if(d.checklist?.length){ lines.push('CHECKLIST:'); d.checklist.forEach(s => lines.push(`[ ] ${strip(s)}`)); lines.push(''); }
  if(d.warn?.length){ lines.push('AWAS:'); d.warn.forEach(s => lines.push(`- ${strip(s)}`)); }
  const text = lines.filter(l => l !== undefined).join('\n');
  navigator.clipboard?.writeText(text)
    .then(() => toast('Langkah disalin ke clipboard'))
    .catch(() => toast('Gagal menyalin'));
}

/* ------------------------------ pencarian ------------------------------ */
let searchTimer;
$('#search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim().toLowerCase();
  searchTimer = setTimeout(() => runSearch(q), 180);
});
function runSearch(q){
  if(!q){
    els.forEach(el => el.classList.remove('is-dim', 'is-match'));
    linkEls.forEach(l => l.el.classList.remove('is-dim'));
    return;
  }
  const hits = [...NODES.keys()].filter(id => searchText(id).includes(q));
  if(!hits.length){ toast('Tidak ada yang cocok'); return; }
  hits.forEach(id => ancestors(id).forEach(a => open.add(a)));
  render();
  const hitSet = new Set(hits);
  requestAnimationFrame(() => {
    els.forEach((el, id) => {
      el.classList.toggle('is-match', hitSet.has(id));
      el.classList.toggle('is-dim', !hitSet.has(id));
    });
    linkEls.forEach(l => l.el.classList.add('is-dim'));
    const first = hits.find(id => pos.get(id));
    if(first) centerOn(first);
  });
}

/* ------------------------------ tab / view ------------------------------ */
function movePill(){
  const active = $('.tab.is-active'), pill = $('.tab-pill');
  if(!active || !pill) return;
  pill.style.left = active.offsetLeft + 'px';
  pill.style.width = active.offsetWidth + 'px';
}
function setView(name){
  state.view = name;
  $$('.tab').forEach(t => {
    const on = t.dataset.view === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
  if(name !== 'tree') closePanel();
  movePill();
  if(name === 'tree') requestAnimationFrame(() => render());
  if(name === 'checklist'){
    renderArsip();                               // arsip foto bisa berubah kapan saja
    const nx = $('#nomorNext'); if(nx) nx.textContent = Nomor.peek();
  }
}
$$('.tab').forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

/* ------------------------------ tema ------------------------------ */
const savedTheme = store.get('theme', 'dark');
document.documentElement.dataset.theme = savedTheme;
$('#themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});

/* legend */
$('#legendToggle').addEventListener('click', () => {
  const l = $('#legend');
  l.classList.toggle('is-closed');
  $('#legendToggle').setAttribute('aria-expanded', l.classList.contains('is-closed') ? 'false' : 'true');
});

/* ------------------------------ nomor retur ------------------------------ */
const Nomor = {
  seqKey(d){ return `returSeq:${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear() % 100).padStart(2, '0')}`; },
  peek(date = new Date()){ return NOMOR.build(date, store.get(this.seqKey(date), 0) + 1); },
  commit(no){
    const m = /^RT-(\d{2})(\d{2})-(\d{3})$/.exec(String(no || '').trim());
    if(!m) return;
    const key = `returSeq:${m[1]}${m[2]}`;
    const val = parseInt(m[3], 10);
    if(val > store.get(key, 0)) store.set(key, val);
  },
};

/* ------------------------------ aturan silang ------------------------------ */
function evalRules(ctx){
  return RULES.filter(r => { try{ return r.when(ctx); }catch{ return false; } });
}
const RULE_ICON = { danger:ICON.warn, warn:ICON.warn, info:ICON.ask };
function alertsHTML(hits){
  if(!hits.length){
    return `<div class="alert ok">${ICON.check}<div><b>Tidak ada kontradiksi terdeteksi</b>
      <span>Semua jawaban konsisten satu sama lain. Tetap cocokkan dengan fisik barang.</span></div></div>`;
  }
  const order = { danger:0, warn:1, info:2 };
  return hits.slice().sort((a, b) => order[a.level] - order[b.level]).map(r => `
    <div class="alert ${r.level}">${RULE_ICON[r.level]}
      <div><b>${r.title}</b><span>${r.msg}</span></div></div>`).join('');
}

/* ------------------------------ teks siap tempel ------------------------------ */
function blockHTML(id, title, note, text){
  return `<div class="outblock">
    <div class="outblock-head">
      <div><b>${title}</b>${note ? `<span>${note}</span>` : ''}</div>
      <button class="btn ghost sm" data-copy="${id}">${ICON.copy} Salin</button>
    </div>
    <pre id="${id}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\t/g, '<i class="tabmark">→</i>')}</pre>
  </div>`;
}
function outputsHTML(ctx){
  return `
    ${blockHTML('outNote', 'Note untuk Odoo', 'tempel ke field Note pada form transfer', OUTPUT.odooNote(ctx))}
    ${blockHTML('outSrc', 'Source Document', 'tempel ke field Source Document', ctx.noRetur || '')}
    ${blockHTML('outRow', 'Baris untuk Spreadsheet', 'pilih sel pertama baris kosong lalu tempel — kolom terisi otomatis', OUTPUT.sheetRow(ctx))}
    <button class="btn ghost sm" data-copy-text="header">${ICON.list} Salin baris judul kolom</button>`;
}
function copyText(text, label){
  navigator.clipboard?.writeText(text)
    .then(() => toast(label + ' disalin'))
    .catch(() => toast('Gagal menyalin'));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if(b){
    const pre = document.getElementById(b.dataset.copy);
    if(!pre) return;
    const raw = pre.textContent.replace(/→/g, '\t');
    if(b.dataset.copy === 'outRow') Nomor.commit(wz.form.noRetur);
    copyText(raw, 'Teks');
    return;
  }
  const h = e.target.closest('[data-copy-text="header"]');
  if(h) copyText(OUTPUT.sheetHeader(), 'Baris judul kolom');
});

/* ------------------------------ foto bukti ------------------------------ */
const foto = {
  kategori: 'barang',
  busy: false,

  zoneHTML(){
    return `<div class="fotobox">
      <div class="fotobox-top">
        <select class="sel" id="fotoKat" aria-label="Jenis bukti">
          ${Photos.KATEGORI.map(k => `<option value="${k.key}">${k.label}</option>`).join('')}
        </select>
        <span class="fotobox-note">Tersimpan di perangkat ini, dikelompokkan per nomor retur</span>
      </div>
      <button class="drop" id="fotoDrop">
        ${ICON.image}
        <b>Taruh foto di sini</b>
        <span>Klik untuk pilih file, seret gambar ke sini, atau tekan <kbd>Ctrl</kbd>+<kbd>V</kbd> setelah screenshot</span>
      </button>
      <input type="file" id="fotoInput" accept="image/*" multiple hidden />
      <div class="fotogrid" id="fotoGrid"></div>
    </div>`;
  },

  bind(){
    const drop = $('#fotoDrop'), input = $('#fotoInput'), kat = $('#fotoKat');
    if(!drop) return;
    kat.value = this.kategori;
    kat.addEventListener('change', () => { this.kategori = kat.value; });
    drop.addEventListener('click', e => { e.preventDefault(); input.click(); });
    input.addEventListener('change', () => { this.take([...input.files]); input.value = ''; });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => {
      e.preventDefault(); drop.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => {
      e.preventDefault(); drop.classList.remove('is-over');
    }));
    drop.addEventListener('drop', e => this.take([...(e.dataTransfer?.files || [])]));
    this.refresh();
  },

  async take(files){
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if(!imgs.length){ toast('Hanya file gambar yang bisa ditaruh di sini'); return; }
    if(this.busy) return;
    this.busy = true;
    try{
      for(const f of imgs) await Photos.add(f, { noRetur:wz.form.noRetur, kategori:this.kategori });
      Nomor.commit(wz.form.noRetur);
      toast(imgs.length > 1 ? `${imgs.length} foto tersimpan` : 'Foto tersimpan');
      await this.refresh();
      refreshAlerts();
    }catch(err){
      toast('Gagal menyimpan foto: ' + err.message);
    }finally{ this.busy = false; }
  },

  async list(){
    try{ return await Photos.listBy(wz.form.noRetur); }catch{ return []; }
  },

  async refresh(){
    const grid = $('#fotoGrid');
    if(!grid) return;
    const recs = await this.list();
    this.cache = recs;
    if(!recs.length){
      grid.innerHTML = `<p class="fotogrid-empty">Belum ada foto untuk nomor ini.</p>`;
      return;
    }
    grid.innerHTML = recs.map((r, i) => `
      <figure class="fotoitem">
        <img src="${URL.createObjectURL(r.blob)}" alt="${Photos.labelKategori(r.kategori)}" loading="lazy" />
        <figcaption>${Photos.labelKategori(r.kategori)}</figcaption>
        <div class="fotoitem-act">
          <button data-foto-dl="${r.id}" title="Unduh">${ICON.download}</button>
          <button data-foto-rm="${r.id}" title="Hapus">${ICON.trash}</button>
        </div>
      </figure>`).join('') +
      `<button class="btn ghost sm fotogrid-all" data-foto-all>${ICON.download} Unduh semua (${recs.length})</button>`;
  },
};

document.addEventListener('click', async e => {
  const dl = e.target.closest('[data-foto-dl]');
  const rm = e.target.closest('[data-foto-rm]');
  const all = e.target.closest('[data-foto-all]');
  if(!dl && !rm && !all) return;
  const recs = foto.cache || [];
  if(dl){
    const r = recs.find(x => x.id === +dl.dataset.fotoDl);
    if(r) Photos.download(r, recs.filter(x => x.kategori === r.kategori).indexOf(r) + 1);
  }
  if(all) recs.forEach((r, i) => setTimeout(() => Photos.download(r, i + 1), i * 250));
  if(rm){
    await Photos.remove(+rm.dataset.fotoRm);
    toast('Foto dihapus');
    await foto.refresh();
    refreshAlerts();
  }
});

/* ------------------------------ wizard ------------------------------ */
const wz = { stack:[], carry:{}, form:{}, current:WIZARD.start, result:null, phase:'q' };

const isBuntu = () => JALUR_BUNTU.includes(wz.carry.jalur);
function wzCtx(){
  const fotos = foto.cache || [];
  return {
    ...wz.carry, ...wz.form,
    fotoScreenshot: fotos.some(f => f.kategori === 'screenshot'),
    fotoCount: fotos.length,
  };
}
const wzFields = () => { const c = wzCtx(); return FORM.filter(f => !f.when || f.when(c)); };

function refreshAlerts(){
  const box = $('#wzAlerts');
  if(box) box.innerHTML = alertsHTML(evalRules(wzCtx()));
}

function fieldHTML(f, val){
  const esc = v => String(v ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  if(f.type === 'check'){
    return `<label class="fld-check"><input type="checkbox" data-f="${f.key}" ${val ? 'checked' : ''} />
      <span class="box">${ICON.check}</span><span>${f.label}</span></label>`;
  }
  const inp = f.type === 'textarea'
    ? `<textarea data-f="${f.key}" rows="3">${esc(val)}</textarea>`
    : `<input type="${f.type}" data-f="${f.key}" value="${esc(val)}" ${f.type === 'number' ? 'min="0" step="1"' : ''} />`;
  return `<label class="fld${f.type === 'textarea' ? ' wide' : ''}">
    <span class="fld-label">${f.label}${f.required ? '<i>wajib</i>' : ''}</span>
    ${inp}${f.hint ? `<small>${f.hint}</small>` : ''}</label>`;
}

function wizardRender(dir = 'fwd'){
  const body = $('#wizardBody');
  const totalQ = 3;
  const pct = wz.phase === 'result' ? 100 : wz.phase === 'form' ? 75
            : Math.min(70, (wz.stack.length / totalQ) * 70 || 8);
  $('#wzBar').style.width = pct + '%';
  $('#wzBack').hidden = wz.stack.length === 0 && wz.phase === 'q';
  $('#wzReset').hidden = wz.stack.length === 0 && wz.phase === 'q';

  const trail = Object.entries(wz.carry)
    .map(([k, v]) => `<span class="crumb">${k}: <b>${v}</b></span>`).join('');
  const cls = dir === 'back' ? 'wz-step back' : 'wz-step';

  /* ---------- fase 1: pertanyaan ---------- */
  if(wz.phase === 'q'){
    const s = WIZARD.steps[wz.current];
    body.innerHTML = `<div class="${cls}">
      ${trail ? `<div class="wz-trail">${trail}</div>` : ''}
      <h3 class="wz-q">${s.question}</h3>
      <p class="wz-hint">${s.hint || ''}</p>
      <div class="wz-options">${s.options.map((o, i) =>
        `<button class="wz-opt" data-i="${i}"><span>${o.label}</span>${ICON.chevron}</button>`).join('')}
      </div></div>`;
    $$('.wz-opt', body).forEach(b => b.addEventListener('click', () => {
      const o = s.options[+b.dataset.i];
      wz.stack.push({ id:wz.current, carry:{ ...wz.carry } });
      Object.assign(wz.carry, o.carry || {});
      if(o.result){
        wz.result = o.result;
        wz.phase = isBuntu() ? 'result' : 'form';
      }else{
        wz.current = o.next;
      }
      wizardRender('fwd');
    }));
    return;
  }

  /* ---------- fase 2: isi data ---------- */
  if(wz.phase === 'form'){
    const fields = wzFields();
    fields.forEach(f => {
      if(wz.form[f.key] !== undefined) return;
      if(f.auto === 'retur') wz.form[f.key] = Nomor.peek();
      if(f.auto === 'today') wz.form[f.key] = new Date().toISOString().slice(0, 10);
    });
    body.innerHTML = `<div class="${cls}">
      ${trail ? `<div class="wz-trail">${trail}</div>` : ''}
      <h3 class="wz-q">Isi data entry</h3>
      <p class="wz-hint">Diketik sekali di sini, lalu ditempel ke Odoo dan Spreadsheet dari teks yang sama —
        supaya keduanya mustahil berbeda.</p>
      <div class="fldgrid">${fields.map(f => fieldHTML(f, wz.form[f.key])).join('')}</div>
      <h4 class="wz-sub">${ICON.image} Bukti foto</h4>
      ${foto.zoneHTML()}
      <h4 class="wz-sub">${ICON.shield} Pemeriksaan silang</h4>
      <div class="alerts" id="wzAlerts"></div>
      <div class="wizard-foot">
        <button class="btn primary" id="wzGo">${ICON.spark} Lihat hasil &amp; teks siap tempel</button>
      </div></div>`;

    $$('[data-f]', body).forEach(inp => {
      const key = inp.dataset.f;
      const ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        wz.form[key] = inp.type === 'checkbox' ? inp.checked : inp.value;
        if(key === 'noRetur') foto.refresh();
        refreshAlerts();
      });
    });
    $('#wzGo').addEventListener('click', () => { wz.phase = 'result'; wizardRender('fwd'); });
    foto.bind();
    refreshAlerts();
    return;
  }

  /* ---------- fase 3: hasil ---------- */
  const { data:n } = NODES.get(wz.result);
  const d = n.detail || {};
  const ctx = wzCtx();
  const hits = evalRules(ctx);
  const blocking = hits.filter(h => h.level === 'danger').length;

  let html = `<div class="wz-result">
    ${trail ? `<div class="wz-trail">${trail}</div>` : ''}
    <div class="result-head${blocking ? ' is-blocked' : ''}">
      <span class="result-icon">${blocking ? ICON.warn : ICON.spark}</span>
      <div><h3>${n.title}</h3><p>${d.summary || ''}</p></div>
    </div>`;

  html += sec(blocking ? `Perbaiki dulu (${blocking})` : 'Pemeriksaan silang', ICON.shield,
    `<div class="alerts">${alertsHTML(hits)}</div>`);

  if(d.steps?.length) html += sec('Yang harus kamu lakukan', ICON.list,
    `<ol class="steps">${d.steps.map(s => `<li>${s}</li>`).join('')}</ol>`);

  if(!isBuntu()) html += sec('Teks siap tempel', ICON.copy, outputsHTML(ctx));

  if(d.fields?.length) html += sec('Field Odoo', ICON.tag,
    `<div class="fields">${d.fields.map(f => `<div class="field"><span>${f.label}</span><b>${f.value}</b></div>`).join('')}</div>`);
  if(d.checklist?.length) html += sec('Checklist', ICON.check, checklistHTML(n.id, d.checklist));

  if(!isBuntu()) html += sec('Bukti foto', ICON.image,
    `<div id="wzFotoResult" class="fotogrid"></div>`);

  if(d.warn?.length) html += sec('Sering salah di sini', ICON.warn,
    `<div class="notes">${d.warn.map(w => `<div class="note warn">${ICON.warn}<span>${w}</span></div>`).join('')}</div>`);
  if(d.confirm?.length) html += sec('Perlu dikonfirmasi', ICON.ask,
    `<div class="notes">${d.confirm.map(w => `<div class="note ask">${ICON.ask}<span>${w}</span></div>`).join('')}</div>`);

  html += `<div class="wizard-foot">
      <button class="btn primary" id="wzGoTree">${ICON.map} Lihat di diagram</button>
      <button class="btn ghost" id="wzCopy">${ICON.copy} Salin langkah</button>
      <button class="btn ghost" id="wzNew">${ICON.plus} Entry baru</button>
    </div></div>`;
  body.innerHTML = html;

  $('#wzGoTree').addEventListener('click', () => {
    ancestors(wz.result).forEach(a => open.add(a));
    setView('tree');
    state.selected = wz.result;
    render({ focus:wz.result });
    openPanel(wz.result);
  });
  $('#wzCopy').addEventListener('click', () => copySteps(wz.result));
  $('#wzNew').addEventListener('click', () => wzReset());

  if(!isBuntu()){
    const grid = $('#wzFotoResult');
    foto.list().then(recs => {
      foto.cache = recs;
      if(!grid) return;
      grid.innerHTML = recs.length
        ? recs.map(r => `<figure class="fotoitem">
            <img src="${URL.createObjectURL(r.blob)}" alt="" loading="lazy" />
            <figcaption>${Photos.labelKategori(r.kategori)}</figcaption>
            <div class="fotoitem-act"><button data-foto-dl="${r.id}" title="Unduh">${ICON.download}</button></div>
          </figure>`).join('') + `<button class="btn ghost sm fotogrid-all" data-foto-all>${ICON.download} Unduh semua</button>`
        : `<p class="fotogrid-empty">Belum ada foto. Kembali ke langkah sebelumnya untuk menambahkan.</p>`;
    });
  }
}

function wzReset(){
  wz.stack = []; wz.carry = {}; wz.form = {}; wz.result = null;
  wz.current = WIZARD.start; wz.phase = 'q'; foto.cache = [];
  wizardRender('back');
}
$('#wzBack').addEventListener('click', () => {
  if(wz.phase === 'result' && !isBuntu()){ wz.phase = 'form'; wizardRender('back'); return; }
  const prev = wz.stack.pop();
  if(!prev) return;
  wz.current = prev.id; wz.carry = prev.carry; wz.result = null; wz.phase = 'q';
  wizardRender('back');
});
$('#wzReset').addEventListener('click', wzReset);

/* tempel screenshot langsung dari clipboard saat mengisi form */
document.addEventListener('paste', e => {
  if(state.view !== 'wizard' || wz.phase !== 'form') return;
  const files = [...(e.clipboardData?.items || [])]
    .filter(i => i.kind === 'file' && i.type.startsWith('image/'))
    .map(i => i.getAsFile()).filter(Boolean);
  if(!files.length) return;
  e.preventDefault();
  foto.take(files);
});

/* ------------------------------ catatan & PR ------------------------------ */
function buildDoc(){
  const confirms = [], warns = [];
  NODES.forEach(({ data:n }) => {
    (n.detail?.confirm || []).forEach(c => confirms.push({ from:n.title, text:c }));
    (n.detail?.warn || []).forEach(w => warns.push({ from:n.title, text:w }));
  });
  const all = [...NODES.values()];
  const done = all.filter(v => v.data.type === 'outcome').length;
  const pend = all.filter(v => v.data.type === 'pending').length;

  $('#docShell').innerHTML = `
    <div class="doc-card">
      <h2>Status peta alur</h2>
      <p>Peta ini dibangun dari SOP yang dijelaskan pemilik proses. Cabang yang detailnya belum disampaikan
         ditandai, bukan ditebak.</p>
      <div class="stat-row">
        <div class="stat"><b>${all.length}</b><span>total node</span></div>
        <div class="stat"><b>4</b><span>cabang status</span></div>
        <div class="stat"><b>${done}</b><span>hasil akhir jelas</span></div>
        <div class="stat"><b>${pend}</b><span>menunggu detail</span></div>
        <div class="stat"><b>${RULES.length}</b><span>aturan silang</span></div>
        <div class="stat"><b>${confirms.length}</b><span>perlu dikonfirmasi</span></div>
      </div>
      <h3>Versi SOP</h3>
      <div class="fields">
        <div class="field"><span>Versi</span><b>${META.version}</b></div>
        <div class="field"><span>Diperbarui</span><b>${META.updated}</b></div>
        <div class="field"><span>Pemilik proses</span><b>${META.owner}</b></div>
      </div>
      <div class="wizard-foot">
        <button class="btn primary" id="btnPrint">${ICON.print} Cetak poster A4</button>
      </div>
    </div>

    <div class="doc-card">
      <h2>Nomor retur — benang merah</h2>
      <p>Satu kejadian retur meninggalkan empat jejak. Tanpa nomor yang sama di keempatnya, menelusuri
         satu kesalahan berarti membuka semuanya satu per satu.</p>
      <div class="fields" style="margin-top:14px">
        <div class="field"><span>Format</span><b>${NOMOR.format}</b></div>
        <div class="field"><span>Contoh</span><b>${NOMOR.contoh}</b></div>
        <div class="field"><span>Nomor berikutnya</span><b id="nomorNext">${Nomor.peek()}</b></div>
      </div>
      <h3>Wajib muncul di</h3>
      ${NOMOR.jejak.map((j, i) => `<div class="q-item"><span class="q-from">${i + 1}</span><span>${j}</span></div>`).join('')}
    </div>

    <div class="doc-card" id="arsipCard">
      <h2>Arsip bukti foto</h2>
      <p>Foto yang kamu taruh lewat mode Simulasi disimpan di peramban perangkat ini dan dikelompokkan
         per nomor retur. <b>Ini penampungan sementara, bukan backup</b> — tujuan akhirnya tetap
         dilampirkan ke record Odoo.</p>
      <div id="arsipList"><p class="fotogrid-empty">Memuat…</p></div>
    </div>

    <div class="doc-card">
      <h2>Aturan silang yang diperiksa otomatis</h2>
      <p>Mode Simulasi menjalankan aturan ini setiap kali kamu mengisi data, dan menandai kontradiksi
         sebelum data terlanjur masuk Odoo.</p>
      <h3>Daftar aturan</h3>
      ${RULES.map(r => `<div class="q-item"><span class="q-from ${r.level}">${r.level}</span>
        <span><b>${r.title}</b><br>${r.msg}</span></div>`).join('')}
    </div>

    <div class="doc-card">
      <h2>Perlu dikonfirmasi</h2>
      <p>${OPEN_QUESTIONS_INTRO}</p>
      <h3>Daftar pertanyaan</h3>
      ${confirms.map(c => `<div class="q-item"><span class="q-from">${strip(c.from)}</span><span>${c.text}</span></div>`).join('')}
    </div>

    <div class="doc-card">
      <h2>Aturan anti-salah entry</h2>
      <p>Kumpulan peringatan dari seluruh node, dikumpulkan otomatis. Baca ulang sebelum mulai entry harian.</p>
      <h3>Daftar aturan</h3>
      ${warns.map(w => `<div class="q-item"><span class="q-from">${strip(w.from)}</span><span>${w.text}</span></div>`).join('')}
    </div>

    <div class="doc-card">
      <h2>Cara menambah alur baru</h2>
      <p>Semua isi peta ini berasal dari satu file: <b>assets/js/data.js</b>. Tambahkan atau ubah node di sana,
         lalu commit — diagram, simulasi, aturan silang, checklist, poster cetak, dan halaman ini ikut
         ter-update sendiri tanpa menyentuh kode tampilan.</p>
      <h3>Bentuk satu node</h3>
      <div class="fields">
        <div class="field"><span>id</span><b>unik, huruf kecil</b></div>
        <div class="field"><span>type</span><b>start · decision · condition · process · outcome · pending</b></div>
        <div class="field"><span>title / sub</span><b>judul & keterangan kartu</b></div>
        <div class="field"><span>detail.steps</span><b>langkah bernomor</b></div>
        <div class="field"><span>detail.fields</span><b>field Odoo yang harus dicek</b></div>
        <div class="field"><span>detail.checklist</span><b>centang sebelum lanjut</b></div>
        <div class="field"><span>detail.warn</span><b>peringatan kesalahan umum</b></div>
        <div class="field"><span>detail.confirm</span><b>pertanyaan terbuka</b></div>
        <div class="field"><span>children</span><b>node turunan</b></div>
      </div>
      <h3>Langkah yang dipakai ulang</h3>
      <p>Langkah yang muncul di beberapa cabang (buka database, isi form, validate) ditulis sekali di objek
         <b>STEPS</b>, lalu dipanggil dengan <b>step('key', { id })</b>. Jangan menyalin langkah yang sama ke
         dua cabang — itu justru sumber inkonsistensi yang ingin dicegah aplikasi ini.</p>
    </div>`;

  $('#btnPrint').addEventListener('click', doPrint);
  renderArsip();
}

/* ------------------------------ arsip foto ------------------------------ */
async function renderArsip(){
  const box = $('#arsipList');
  if(!box) return;
  let recs = [];
  try{ recs = await Photos.all(); }catch{ box.innerHTML = `<p class="fotogrid-empty">Penyimpanan foto tidak tersedia di peramban ini.</p>`; return; }
  if(!recs.length){ box.innerHTML = `<p class="fotogrid-empty">Belum ada foto tersimpan.</p>`; return; }

  const grup = new Map();
  recs.forEach(r => { if(!grup.has(r.noRetur)) grup.set(r.noRetur, []); grup.get(r.noRetur).push(r); });
  const urut = [...grup.entries()].sort((a, b) =>
    Math.max(...b[1].map(r => r.addedAt)) - Math.max(...a[1].map(r => r.addedAt)));

  const est = await Photos.usage();
  const pakai = est?.usage ? (est.usage / 1048576).toFixed(1) + ' MB terpakai' : '';

  box.innerHTML = urut.map(([no, list]) => `
    <div class="arsip">
      <div class="arsip-head">
        <b>${no}</b>
        <span>${list.length} foto · ${new Date(Math.max(...list.map(r => r.addedAt))).toLocaleDateString('id-ID')}</span>
        <button class="btn ghost sm" data-arsip-dl="${no}">${ICON.download} Unduh</button>
      </div>
      <div class="fotogrid">
        ${list.map(r => `<figure class="fotoitem">
            <img src="${URL.createObjectURL(r.blob)}" alt="" loading="lazy" />
            <figcaption>${Photos.labelKategori(r.kategori)}</figcaption>
            <div class="fotoitem-act">
              <button data-arsip-rm="${r.id}" title="Hapus">${ICON.trash}</button>
            </div>
          </figure>`).join('')}
      </div>
    </div>`).join('') + (pakai ? `<p class="fotogrid-empty">${pakai}</p>` : '');

  box._recs = recs;
  $$('[data-arsip-dl]', box).forEach(b => b.addEventListener('click', () => {
    const list = grup.get(b.dataset.arsipDl) || [];
    list.forEach((r, i) => setTimeout(() => Photos.download(r, i + 1), i * 250));
  }));
  $$('[data-arsip-rm]', box).forEach(b => b.addEventListener('click', async () => {
    await Photos.remove(+b.dataset.arsipRm);
    toast('Foto dihapus');
    renderArsip();
  }));
}

/* ------------------------------ poster cetak ------------------------------ */
function qrDataURL(text, cell = 4){
  try{
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(cell, 8);
  }catch{ return ''; }
}

function buildPrintSheet(){
  let sheet = $('#printSheet');
  if(!sheet){
    sheet = document.createElement('div');
    sheet.id = 'printSheet';
    document.body.appendChild(sheet);
  }
  const cabang = NODES.get('decision-status').data.children;
  const ringkas = {
    c1: ['Menu: GD Ke Gudang Retur', `${REF.locGD} → ${REF.locRT}`, 'Contact + Source Document + Note', 'Mark as Todo → Validate'],
    c2: ['Menu: Mobil 1 / Mobil 2 Ke Gudang Retur', 'Stok pengganti SAMA tersedia → nota', 'Stok TIDAK tersedia → nota + screenshot', 'Ubah status jadi "Sudah Tukar"'],
    c3: ['Alur belum ditetapkan', 'Jangan proses sendiri', 'Tanyakan ke pemilik proses'],
    c4: ['Alur belum ditetapkan', 'Jangan proses sendiri', 'Tanyakan ke pemilik proses'],
  };
  const aturan = [
    'Mulai dari Spreadsheet, bukan dari Odoo.',
    `Terbitkan nomor retur ${NOMOR.format} dan tulis di Spreadsheet, Source Document Odoo, nota, dan nama file screenshot.`,
    'Verifikasi produk lewat kode / barcode, bukan dari nama.',
    'Qty Demand = qty fisik barang.',
    'Baca ulang SEBELUM klik Validate.',
    'Ganti barang beda tanpa screenshot = bukti tidak sah.',
    'Nota terbit → status Spreadsheet wajib berubah jadi "Sudah Tukar".',
  ];

  sheet.innerHTML = `
    <div class="ps-head">
      <div>
        <h1>Alur Gudang Retur</h1>
        <p>Spreadsheet → Odoo · versi ${META.version} · ${META.updated}</p>
      </div>
      <div class="ps-qr">
        <img src="${qrDataURL(location.href.split('#')[0])}" alt="QR menuju aplikasi" />
        <span>Buka versi interaktif</span>
      </div>
    </div>

    <div class="ps-flow">
      <div class="ps-start"><b>Barang retur masuk</b><span>Catat di Spreadsheet, terbitkan nomor retur</span></div>
      <div class="ps-q">Baca kolom <b>Status Kerusakan Barang</b></div>
      <div class="ps-cols">
        ${cabang.map(c => `
          <div class="ps-col ps-${c.type === 'pending' ? 'pend' : 'ok'}">
            <h2>${strip(c.title)}</h2>
            <ol>${(ringkas[c.id] || []).map(t => `<li>${t}</li>`).join('')}</ol>
          </div>`).join('')}
      </div>
    </div>

    <div class="ps-rules">
      <h2>Aturan yang tidak boleh dilanggar</h2>
      <ol>${aturan.map(a => `<li>${a}</li>`).join('')}</ol>
    </div>

    <p class="ps-foot">Dicetak ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
      · cabang Cancel &amp; Potong Nota belum ditetapkan — jangan diproses tanpa konfirmasi</p>`;
}

function doPrint(){
  buildPrintSheet();
  document.body.classList.add('is-printing');
  setTimeout(() => window.print(), 80);
}
window.addEventListener('afterprint', () => document.body.classList.remove('is-printing'));

/* ------------------------------ offline (PWA) ------------------------------ */
function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  const ok = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if(!ok) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ------------------------------ mulai ------------------------------ */
/* Panel detail perlu tahu tinggi topbar yang sebenarnya — topbar bisa
   berubah tinggi saat tab membungkus di layar sempit. */
function trackTopbar(){
  const bar = $('.topbar');
  if(!bar) return;
  const apply = () => document.documentElement.style.setProperty('--topbar-h', bar.offsetHeight + 'px');
  apply();
  if(window.ResizeObserver) new ResizeObserver(apply).observe(bar);
  else window.addEventListener('resize', apply);
}

window.addEventListener('resize', () => { movePill(); });
document.addEventListener('keydown', e => {
  if(e.target.matches('input')) return;
  if(e.key === '0') fit();
  if(e.key === '+' || e.key === '=') zoomBy(1.2);
  if(e.key === '-') zoomBy(.83);
});

function boot(){
  trackTopbar();
  movePill();
  buildDoc();
  wizardRender();
  render({ fit:true });
  registerSW();
  setTimeout(() => $('#appLoader').classList.add('is-done'), 260);
}
if(document.readyState === 'complete') boot();
else window.addEventListener('load', boot);

})();
