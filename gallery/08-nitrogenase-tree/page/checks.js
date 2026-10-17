// Alignment checks of gallery piece 08, measured on the rendered page (millimetres, origin top-left). Inlined after the page script (build directive INLINE_JS);
// it reads the constants and elements of the page script. checkAlign() throws one Error that lists every position off its grid line by more than TOL.
function checkAlign() {
  const K = 25.4 / 96, o = f.el.getBoundingClientRect();
  const M = (el) => { const r = el.getBoundingClientRect(); const m = { l: (r.left - o.left) * K, t: (r.top - o.top) * K, r: (r.right - o.left) * K, b: (r.bottom - o.top) * K }; m.w = m.r - m.l; m.h = m.b - m.t; m.cx = (m.l + m.r) / 2; m.cy = (m.t + m.b) / 2; return m; };
  const fails = [], near = (a, b, msg, tol = TOL) => { if (!(Math.abs(a - b) <= tol)) fails.push(`${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)}`); };
  const m = {}; Object.entries(REC).forEach(([k, el]) => { m[k] = M(el); });
  const sv = (id) => { const e = document.getElementById(id); if (!e) { fails.push('missing element ' + id); return { l: 0, t: 0, r: 0, b: 0, w: 0, h: 0, cx: 0, cy: 0 }; } return M(e); };
  const TX = RX + 3.4 + RW + 1.9;                       // left edge of the text column inside the insets
  const MEND = D.MEND;
  // 1. panel letters, titles, sub-lines on their panel grid; no line past its panel edge
  [['a', X0, T0, 3, RX - 1.5], ['b', RX, T0, 2, W - X0], ['c', X0, TC, 2, W - X0]].forEach(([c, x, T, ns, xr]) => {
    const L = M(document.getElementById('panel-' + c));
    near(L.l, x, `panel ${c}: letter x`); near(L.cy, T + TITLE_DT, `panel ${c}: letter row`, 0.5);
    near(m['title-' + c].l, x + TITLE_DX, `panel ${c}: title x`); near(m['title-' + c].cy, T + TITLE_DT, `panel ${c}: title row`, 0.35);
    const lines = [m['title-' + c]];
    for (let k = 1; k <= ns; k++) { const e = m[`sub${k}-${c}`]; near(e.l, x + TITLE_DX, `panel ${c}: sub-line ${k} x`); near(e.cy, T + SUB_DT[k - 1], `panel ${c}: sub-line ${k} row`, 0.35); lines.push(e); }
    lines.forEach((e, i) => { if (e.r > xr + 1e-6) fails.push(`panel ${c}: line ${i} runs past the panel edge (${e.r.toFixed(2)} > ${xr.toFixed(2)})`); });
  });
  // 2. matrix, keys, header texts
  D.cols.forEach((c, k) => {
    const first = sv(`mc_${k}_0`), last = sv(`mc_${k}_${D.NR - 1}`);
    near(first.l, c.x, `matrix column ${k + 1}: left`); near(first.w, c.w, `matrix column ${k + 1}: width`); near(first.t, Y0, `matrix column ${k + 1}: first row top`);
    near(last.b, Y1 + 0.02, `matrix column ${k + 1}: last row bottom`, 0.1); near(last.t - first.t, (D.NR - 1) * P, `matrix column ${k + 1}: ${D.NR} rows span`, 0.1);
    const kf = sv('keyframe_' + k); near(kf.l, c.x, `key ${k + 1}: left on its column`); near(kf.w, c.w, `key ${k + 1}: width on its column`); near(kf.t, D.KEY_TOP, `key ${k + 1}: top`); near(kf.b - kf.t, D.KEY_H, `key ${k + 1}: height`);
    near(m['cn-' + k].cx, c.x + c.w / 2, `column ${k + 1}: name centred`); near(m['cu-' + k].cx, c.x + c.w / 2, `column ${k + 1}: unit centred`);
    near(m['cn-' + k].cy, m['cn-0'].cy, `column ${k + 1}: names on one row`); near(m['cu-' + k].cy, m['cu-0'].cy, `column ${k + 1}: units on one row`);
    near(m['kl-' + k].l, c.x, `column ${k + 1}: left bar number on the bar end`); near(m['kr-' + k].r, c.x + c.w, `column ${k + 1}: right bar number on the bar end`);
    near(m['kl-' + k].cy, m['kl-0'].cy, `column ${k + 1}: bar numbers on one row`);
    if (!(m['kr-' + k].l - m['kl-' + k].r >= 0.9)) fails.push(`column ${k + 1}: bar numbers closer than 0.9 mm (${(m['kr-' + k].l - m['kl-' + k].r).toFixed(2)})`);
    if (!(m['cn-' + k].w <= c.w + 0.6)) fails.push(`column ${k + 1}: name wider than its column`);
    if (!(m['cu-' + k].w <= c.w + 1.2)) fails.push(`column ${k + 1}: unit wider than its column`);
  });
  ['mh1', 'mh2', 'lg1', 'lg2'].forEach((k) => { near(m[k].l, D.cols[0].x, `${k}: on the first column edge`); if (!(m[k].r <= RX - 1.5)) fails.push(`${k}: runs into panel b`); });
  for (let k = 1; k < D.cols.length; k++) near(D.cols[k].x - D.cols[k - 1].x, D.cols[1].x - D.cols[0].x, `column pitch ${k}`, 0.01);
  // 3. bands, strips, bars
  Object.entries(D.blocks).forEach(([g, b]) => {
    const e = sv('bar_' + g), s = sv('lbar_' + g), bd = sv('band_' + g);
    near(e.l, D.BAR_X, `bar ${g}: left`, 0.2); near(e.t, b.top, `bar ${g}: top`, 0.2); near(e.b, b.bottom, `bar ${g}: bottom`, 0.2); near(e.w, D.BAR_W, `bar ${g}: width`, 0.2);
    near(s.l, D.LBAR_X, `strip ${g}: left`, 0.2); near(s.t, b.top, `strip ${g}: top`, 0.2); near(s.b, b.bottom, `strip ${g}: bottom`, 0.2); near(s.w, D.LBAR_W, `strip ${g}: width`, 0.2);
    near(bd.t, b.top, `band ${g}: top`, 0.2); near(bd.b, b.bottom, `band ${g}: bottom`, 0.2); near(bd.r, MEND, `band ${g}: right edge on the matrix`, 0.2);
    const t = m['bar-' + g]; near(t.cx, D.LBAR_X + D.LBAR_W / 2, `strip ${g}: name centred across the strip`, 0.3); near(t.cy, (b.top + b.bottom) / 2, `strip ${g}: name centred along the strip`, 0.3);
    if (!(t.h <= (b.bottom - b.top) - 0.8)) fails.push(`strip ${g}: name (${t.h.toFixed(2)} mm) does not fit its strip (${(b.bottom - b.top).toFixed(2)} mm)`);
  });
  { const bl = Object.values(D.blocks).sort((a, b) => a.top - b.top);
    for (let i = 1; i < bl.length; i++) near(bl[i].top, bl[i - 1].bottom, `blocks ${i}: no gap between neighbouring bars`, 0.01);
    near(bl[0].top, Y0, 'first bar on the first row', 0.01); near(bl[bl.length - 1].bottom, Y1, 'last bar on the last row', 0.01);
    // two neighbouring tones of the Nif-III family differ by at least 8 % in lightness (bars and bands), so that Vnf and Anf can be told apart
    const lum = (h) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    ['bar', 'band'].forEach((q) => { const a = D.blocks['nif-iii'][q], b2 = D.blocks.Vnf[q], c = D.blocks.Anf[q]; if (!(lum(a) - lum(b2) >= 0.08 && lum(b2) - lum(c) >= 0.08)) fails.push(`${q}: Nif-III, Vnf and Anf tones are less than 8 % of lightness apart`); }); }
  // 4. rings: on the tip end, on the row end, numbers in them, the same numbers in the inset headers
  D.rings.forEach((r) => {
    const a = sv('ringt-' + r.n), b = sv('ringm-' + r.n), h = sv('hring-' + D.insets.find((i) => i.pdb === r.pdb).n);
    near(a.cx, r.xt, `ring ${r.n}: tip ring x at the tip end`, 0.12); near(a.cy, r.y, `ring ${r.n}: tip ring y on its row`, 0.12); near(a.cy, Y0 + (r.row + 0.5) * P, `ring ${r.n}: row ${r.row} centre`, 0.12);
    near(b.cx, D.RING_X, `ring ${r.n}: row-end ring on the ring column`, 0.12); near(b.cy, r.y, `ring ${r.n}: row-end ring on the row of its tip ring`, 0.12);
    near(m[`ringt-${r.n}-n`].cx, a.cx, `ring ${r.n}: number centred (tip)`, 0.3); near(m[`ringt-${r.n}-n`].cy, a.cy, `ring ${r.n}: number centred (tip, y)`, 0.4);
    near(m[`ringm-${r.n}-n`].cx, b.cx, `ring ${r.n}: number centred (row end)`, 0.3); near(m[`ringm-${r.n}-n`].cy, b.cy, `ring ${r.n}: number centred (row end, y)`, 0.4);
    if (!(h.cx > 0) || m[`hring-${r.n}-n`].w <= 0) fails.push(`ring ${r.n}: missing in its inset header`);
    if (!(b.l - MEND >= 0.4)) fails.push(`ring ${r.n}: too close to the matrix`);
    if (!(D.BAR_X - b.r >= 0.4)) fails.push(`ring ${r.n}: too close to the bar`);
  });
  near(sv('ringm-1').cx, sv('ringm-2').cx, 'row-end rings on one column (2)', 0.01); near(sv('ringm-1').cx, sv('ringm-3').cx, 'row-end rings on one column (3)', 0.01);
  // 5. event discs: centre on the middle of their branch, letter in the disc, branch from parent to node, label beside it, tree not crossed
  D.events.forEach((e) => {
    const d = sv('disc-' + e.key); near(d.cx, e.xm, `event ${e.key}: disc on the middle of its branch`, 0.12); near(d.cy, e.y + e.dy, `event ${e.key}: disc on its branch (offset up)`, 0.12); near(e.y + e.dy - Math.sign(e.dy) * (D.disc_r + 0.45), e.y, `event ${e.key}: disc rests on its branch`, 0.05);
    const bl = sv('evb_' + e.key); near(bl.l, e.xa, `event ${e.key}: branch starts at the parent`, 0.2); near(bl.r, e.xb, `event ${e.key}: branch ends at the node`, 0.2);
    near(m[`disc-${e.key}-n`].cx, e.xm, `event ${e.key}: letter centred in the disc (x)`, 0.3); near(m[`disc-${e.key}-n`].cy, e.y + e.dy, `event ${e.key}: letter centred in the disc (y)`, 0.4);
    const lab = m['evlab-' + e.key]; near(lab.l, e.label.x + 0.3, `event ${e.key}: label on its computed spot (x)`, 0.5); near(lab.cy, e.label.t + e.label.h / 2, `event ${e.key}: label on its computed spot (y)`, 0.4);
    if (e.label.crossings !== 0) fails.push(`event ${e.key}: the label crosses ${e.label.crossings} tree lines`);
    if (!(e.xb - e.xa >= 2.6)) fails.push(`event ${e.key}: branch shorter than the disc`);
  });
  { const th = sv('tree_h'); near(th.l, D.XR, 'tree: root x', 0.15); near(th.r, D.max_x_mm, 'tree: deepest tip x', 0.15); near(th.t, Y0 + 0.5 * P, 'tree: first tip row', 0.15); near(th.b, Y1 - 0.5 * P, 'tree: last tip row', 0.15);
    const st = sv('stub'); near(st.r, D.XR, 'root stub ends on the root', 0.15); near(st.w, D.STUB, 'root stub length', 0.15); near((st.t + st.b) / 2, D.root.y, 'root stub on the root row', 0.15);
    const sb = M(EL.sbar); near(sb.w, 0.5 * D.S, 'scale bar: 0.5 substitutions per site', 0.1); near(sb.l, D.XR, 'scale bar starts on the root x (the left edge of the tree)', 0.1);
    if (!(sb.l + sb.w <= D.max_x_mm)) fails.push('scale bar is longer than the tree is wide'); }
  // 6. insets: frames, leaders, renders, letters, text columns
  { const fr = D.insets.map((ins) => M(document.getElementById('frame-' + ins.pdb)));
    fr.forEach((e, i) => { near(e.l, RX, `inset ${i + 1}: frame left`, 0.1); near(e.r, W - X0, `inset ${i + 1}: frame right`, 0.1); near(e.h, SH, `inset ${i + 1}: frame height`, 0.1); near(e.t, slotTop(i), `inset ${i + 1}: frame top`, 0.1); if (i) near(e.t - fr[i - 1].b, SG, `inset ${i + 1}: gap to the frame above`, 0.12); });
    near(fr[0].t, Y0, 'first frame on the first row', 0.1); near(fr[2].b, Y1, 'last frame on the last row', 0.1);
    D.insets.forEach((ins, i) => {
      const key = ins.pdb, b = D.blocks[ins.group], im = M(EL['img-' + key]), st = M(document.getElementById('stripe-' + key)), ld = M(EL['lead-' + key]);
      near(im.l, RX + 3.4, `${key}: render left`, 0.1); near(im.w, RW, `${key}: render width`, 0.1); near(im.t, fr[i].t + 5.0, `${key}: render top`, 0.1);
      if (!(im.b <= fr[i].b - 0.6)) fails.push(`${key}: render too near the bottom of its frame`);
      if (!(im.w >= 30)) fails.push(`${key}: render narrower than 30 mm`);
      ['D', 'K'].forEach((l) => { const e = m[`lt-${key}-${l}`]; near(e.cx, im.l + ins.letters[l][0] * im.w, `${key}: letter ${l} on its computed spot (x)`, 0.3); near(e.cy, im.t + ins.letters[l][1] * im.h, `${key}: letter ${l} on its computed spot (y)`, 0.4);
        if (!(e.l > im.l && e.r < im.r && e.t > im.t && e.b < im.b)) fails.push(`${key}: letter ${l} outside the render`); });
      near(st.l, RX, `${key}: stripe on the frame edge`, 0.1); near(st.h, SH, `${key}: stripe height`, 0.1);
      near(m['ph-' + key].l, RX + 7.8, `${key}: id on the frame grid`); near(m['ph-' + key].cy, fr[i].t + 2.8, `${key}: id row`, 0.35); near(m['ps-' + key].cy, m['ph-' + key].cy, `${key}: caption on the id row`, 0.35);
      near(sv('hring-' + ins.n).cy, m['ph-' + key].cy, `${key}: header ring on the id row`, 0.35);
      near(ld.l, D.BAR_X + D.BAR_W, `${key}: leader starts at the bar edge`, 0.2); near(ld.r, RX, `${key}: leader ends at the frame edge`, 0.2); near(ld.cy, fr[i].cy, `${key}: leader at mid-height of its frame`, 0.2);
      if (!(ld.cy >= b.top + 1.0 && ld.cy <= b.bottom - 1.0)) fails.push(`${key}: leader starts outside its clade bar (${ld.cy.toFixed(2)} not in ${b.top.toFixed(2)} to ${b.bottom.toFixed(2)})`);
      const dsc = M(document.getElementById('idisc-' + key)); near(m[`idisc-${key}-n`].cx, dsc.cx, `${key}: letter centred in the disc (x)`, 0.3); near(m[`idisc-${key}-n`].cy, dsc.cy, `${key}: letter centred in the disc (y)`, 0.4);
      near(dsc.l, TX, `${key}: text column edge`, 0.1);
      const col = ['ln1-' + key, 'bs-' + key + '-0', 'pp-' + key + '-0', 'pp-' + key + '-1'].concat(ins.alt ? ['bs-' + key + '-1'] : []);
      col.forEach((p) => { near(m[p].l, TX, `${key}: ${p} on the text column`, 0.2); if (!(m[p].r <= W - X0 - 0.5)) fails.push(`${key}: ${p} runs past the frame`); });
      if (!(m['pp-' + key + '-1'].b <= fr[i].b - 0.6)) fails.push(`${key}: text runs past the bottom of its frame`);
    });
    const dscs = D.insets.map((ins) => M(document.getElementById('idisc-' + ins.pdb)));
    near(dscs[1].l, dscs[0].l, 'inset discs on one column (2)', 0.1); near(dscs[2].l, dscs[0].l, 'inset discs on one column (3)', 0.1);
    for (let i = 0; i < 3; i++) near(M(EL['lead-' + D.insets[i].pdb]).cy - fr[i].t, SH / 2, `leader ${i + 1} at mid-height`, 0.2);
  }
  // 7. marks key (top right) and swatches
  [0, 1, 2].forEach((i) => { const sw = M(document.getElementById('keysw-' + i)); near(sw.cy, KEY_T, `key swatch ${i + 1}: row`, 0.2); near(m['keyt-' + i].cy, KEY_T, `key text ${i + 1}: row`, 0.35); near(m['keyt-' + i].l - sw.r, 1.2, `key text ${i + 1}: gap to its swatch`, 0.3); });
  near(M(document.getElementById('keysw-0')).l, RX + 4.6, 'key starts on the title edge');
  for (let k = 0; k < 5; k++) { near(m['mk-' + k].l, MT, `marks note ${k + 1} on the text edge`); if (!(m['mk-' + k].r <= W - X0)) fails.push(`marks note ${k + 1} runs past the page edge`); }
  near(sv('mk-ring').cx, RX + 2.4, 'marks key: ring glyph'); near(sv('mk-disc').cx, RX + 2.4, 'marks key: badge glyph'); near(sv('mk-ring').cy, m['mk-0'].cy, 'marks key: ring glyph on its line', 0.35); near(sv('mk-disc').cy, m['mk-1'].cy, 'marks key: badge glyph on its line', 0.35);
  // 8. table: numeric columns on their right edges, rows on one pitch, headers on the columns
  for (let j = 0; j < 8; j++) {
    near(m['ts-' + j].r, CRX[j], `table: sub-header ${j + 1} on its column edge`);
    for (let i = 0; i < D.table.length; i++) near(m[`tv-${i}-${j}`].r, CRX[j], `table: value ${i + 1}/${j + 1} on its column edge`, 0.15);
  }
  for (let i = 0; i < D.table.length; i++) {
    near(m['tl-' + i].cy, TR0 + TRP * i, `table: row ${i + 1} label`, 0.35);
    for (let j = 0; j < 8; j++) near(m[`tv-${i}-${j}`].cy, m['tl-' + i].cy, `table: row ${i + 1} value ${j + 1} on the row`, 0.3);
    TFILL[D.table[i].key].forEach((c, k) => { const sw = M(document.getElementById(`tsw-${i}-${k}`)); near(sw.cy, TR0 + TRP * i, `table: swatch ${i + 1}.${k + 1} on its row`, 0.2); near(sw.l, X0 + k * 2.4, `table: swatch ${i + 1}.${k + 1} x`, 0.1); });
  }
  GROUPS.forEach(([t, j], g) => { const e = m['th-' + g]; near(e.cy, m['th-0'].cy, `table: group header ${g + 1} on one row`, 0.25); if (!(e.l >= (g ? CRX[j - 1] : 20) && e.r <= CRX[j + 1] + 0.2)) fails.push(`table: group header ${g + 1} off its column pair`); });
  { const tl = D.table.map((r, i) => [r, m['tl-' + i].l]); const first = tl[0][1]; tl.filter(([r]) => r.key !== 'an').forEach(([r, l]) => near(l, first, 'table: row labels on one edge')); }
  for (let j = 2; j < 8; j += 2) near(CRX[j + 1] - CRX[j], CRX[1] - CRX[0], `table: pair width ${j / 2 + 1}`, 0.01);
  near(m['hr-h'].l, NX, 'notes heading on the notes column'); for (let k = 0; k < 5; k++) { near(m['hr-' + k].l, NX, `notes line ${k + 1} on the column`); if (!(m['hr-' + k].r <= W - X0)) fails.push('notes line ' + (k + 1) + ' runs past the page edge'); }
  { const rr = Math.max(...D.table.map((r, i) => m['tv-' + i + '-7'].r)); if (!(NX - rr >= 5)) fails.push('notes column too close to the table'); }
  // 9. text on text, text inside the page, text off the strips, bars and the matrix
  const T = Object.entries(REC).map(([k, el]) => [k, M(el)]);
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i][1], b = T[j][1], pad = 0.08;
    if (a.l + pad < b.r && b.l + pad < a.r && a.t + pad < b.b && b.t + pad < a.b) fails.push(`text on text: ${T[i][0]} and ${T[j][0]}`);
    // on one row, texts keep 0.7 mm apart (a tight gap reads as one line)
    const ov = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ov > 0.5 * Math.min(a.h, b.h) && !(a.l + pad < b.r && b.l + pad < a.r) && Math.max(a.l - b.r, b.l - a.r) < 0.7) fails.push(`texts closer than 0.7 mm on one row: ${T[i][0]} and ${T[j][0]} (${Math.max(a.l - b.r, b.l - a.r).toFixed(2)})`);
  }
  T.forEach(([k, e]) => { if (e.l < 1.0 || e.t < 1.0 || e.r > W - 1.0 || e.b > H - 0.8) fails.push(`text too near the page edge: ${k} (${e.l.toFixed(2)}, ${e.t.toFixed(2)}, ${e.r.toFixed(2)}, ${e.b.toFixed(2)})`); });
  T.forEach(([k, e]) => {
    if (/^bar-/.test(k) || /-n$/.test(k) || /^lt-/.test(k)) return;
    Object.values(D.blocks).forEach((b) => {
      if (e.l < D.LBAR_X + D.LBAR_W && e.r > D.LBAR_X && e.t < b.bottom && e.b > b.top) fails.push(`text ${k} sits on a clade strip`);
      if (e.l < D.BAR_X + D.BAR_W && e.r > D.BAR_X && e.t < b.bottom && e.b > b.top) fails.push(`text ${k} sits on a clade bar`);
    });
    if (e.l < MEND && e.r > D.cols[0].x && e.t < Y1 && e.b > Y0) fails.push(`text ${k} sits on the matrix`);
  });
  if (fails.length) throw new Error('alignment, tolerance ' + TOL + ' mm: ' + fails.join('; '));
}
checkAlign();
