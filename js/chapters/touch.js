// Chapter 4: the sense of touch. Fingertip skin (no hair, friction ridges, many receptors) with
// a probe, and the two-point test.
// Receptors and what they are tuned to (Johansson & Flanagan, Nat Rev Neurosci 10:345, 2009;
// Purves et al., Neuroscience, 6th ed., ch. 9; Kandel et al., Principles of Neural Science):
//  - Merkel cells (SA1, slowly adapting): steady pressure, edges, shapes and fine texture;
//    keep firing while pressed. Best at low frequencies (below about 5–15 Hz).
//  - Meissner corpuscles (RA1, rapidly adapting): light touch, slip and flutter, about 5–50 Hz,
//    best near 30 Hz; fire when touch starts and stops.
//  - Pacinian corpuscles (RA2): vibration, about 40–800 Hz, most sensitive near 250 Hz, where
//    skin movements of well under a micrometre can be felt; fire only at changes.
//  - Ruffini endings (SA2): skin stretch; keep firing while stretched.
//  - Free nerve endings: pain, heat, cold and itch; slower thin fibres.
// The spike trains here are an illustrative model built on those tunings.
// Two-point thresholds (smallest gap felt as two points), approximate adult values from
// Weinstein, "Intensive and extensive aspects of tactile sensitivity", in The Skin Senses
// (Kenshalo, ed.), 1968: fingertip about 2–3 mm, lips about 5 mm, palm about 10 mm, forehead
// about 15 mm, sole about 22 mm, forearm about 38 mm, back about 40–45 mm, calf about 47 mm.
// First measured by Ernst Heinrich Weber (De Tactu, 1834). Body parts with small thresholds
// also get more brain area in the touch map (the somatosensory "homunculus", Penfield 1937).
import { THREE, M, canvasTexture, clamp, lerp, approach } from '../kit.js';
import { makeSkinBlock, tint, board, fitNarrow, compactReadout, panel, rnd, inReel, toneColor, FRONT, Y, C } from '../skin.js';

export const SITES = {
  finger: { name: 'Fingertip', thr: 2.5, xy: [0.87, 0.53] },
  lips: { name: 'Lips', thr: 5, xy: [0.5, 0.115] },
  palm: { name: 'Palm', thr: 10, xy: [0.83, 0.48] },
  forehead: { name: 'Forehead', thr: 15, xy: [0.5, 0.05] },
  sole: { name: 'Sole', thr: 22, xy: [0.42, 0.97] },
  forearm: { name: 'Forearm', thr: 38, xy: [0.77, 0.4] },
  back: { name: 'Back', thr: 42, xy: [0.5, 0.33] },
  calf: { name: 'Calf', thr: 47, xy: [0.58, 0.8] },
};
const STIM = {
  press: 'Press and hold', stroke: 'Stroke across', vibrate: 'Vibrate', stretch: 'Stretch', pain: 'Poke or heat',
};
const RECS = [
  { k: 'merkel', name: 'Merkel', what: 'pressure, edges', col: '#7fe0d0' },
  { k: 'meissner', name: 'Meissner', what: 'light touch, flutter ~30 Hz', col: '#c9a7ff' },
  { k: 'pacini', name: 'Pacinian', what: 'vibration ~250 Hz', col: '#b9a3ff' },
  { k: 'ruffini', name: 'Ruffini', what: 'stretch', col: '#8ec5ff' },
  { k: 'free', name: 'Free endings', what: 'pain, heat, cold', col: '#ffe08a' },
];
// Frequency tuning as a bell on a log scale.
const tune = (f, best, width) => Math.exp(-(Math.log(f / best) ** 2) / (2 * width * width));
const CYCLE = 3;
// Probe indentation (0..1) and its rate of change for each stimulus at time u in the cycle.
function probe(stim, u) {
  const on = clamp((u - 0.3) / 0.25, 0, 1), off = clamp((u - 2.1) / 0.25, 0, 1), d = on * (1 - off);
  const dd = (u > 0.3 && u < 0.55) || (u > 2.1 && u < 2.35) ? 1 : 0;
  return { d: stim === 'stretch' ? 0.25 * d : d, dd, hold: d > 0.99 };
}
// Firing rates (spikes/s) for each receptor type.
export function rates(stim, f, u) {
  const p = probe(stim, u), r = { merkel: 2, meissner: 0, pacini: 0, ruffini: 2, free: 0.5 };
  if (stim === 'press') { r.merkel += 70 * p.d; r.meissner += 90 * p.dd; r.pacini += 60 * p.dd; r.ruffini += 8 * p.d; }
  if (stim === 'stroke') { const on = p.d > 0.3 ? 1 : 0; r.merkel += 45 * on; r.meissner += 70 * on; r.pacini += 25 * on; r.ruffini += 10 * on; }
  if (stim === 'vibrate') { const on = p.d > 0.3 ? 1 : 0; r.merkel += on * (20 + 40 * tune(f, 8, 0.7)); r.meissner += on * 110 * tune(f, 30, 0.6); r.pacini += on * Math.min(f, 250) * tune(f, 250, 0.55); }
  if (stim === 'stretch') { r.ruffini += 55 * p.d; r.merkel += 8 * p.d; }
  if (stim === 'pain') { r.free += 45 * p.d; r.merkel += 20 * p.d; r.meissner += 30 * p.dd; }
  return r;
}

function drawRaster(g, w, h, st) {
  panel(g, w, h, 'Nerve signals from each receptor');
  g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('each tick is one nerve impulse (last 3 s)', 22, 72);
  const L = 210, R = w - 20, rowH = (h - 110) / RECS.length;
  RECS.forEach((rc, i) => {
    const y = 100 + i * rowH;
    g.fillStyle = rc.col; g.font = '600 21px sans-serif'; g.fillText(rc.name, 20, y + rowH * 0.45);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '15px sans-serif'; g.fillText(rc.what, 20, y + rowH * 0.45 + 22);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(L, y + rowH - 6); g.lineTo(R, y + rowH - 6); g.stroke();
    g.strokeStyle = rc.col; g.lineWidth = 2; g.beginPath();
    for (const ts of st.spikes[rc.k]) { const x = R - ((st.now - ts) / 3) * (R - L); if (x < L) continue; g.moveTo(x, y + 10); g.lineTo(x, y + rowH - 14); }
    g.stroke();
  });
}

function drawBody(g, w, h, st) {
  panel(g, w, h, 'Two-point threshold');
  g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('smallest gap felt as two points', 22, 70);
  const ox = 30, oy = 90, W = w - 60, H = h - 110;
  const P = (x, y) => [ox + x * W, oy + y * H];
  g.fillStyle = 'rgba(255,255,255,.12)'; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
  const blob = (x, y, rx, ry) => { const [a, b] = P(x, y); g.beginPath(); g.ellipse(a, b, rx * W, ry * H, 0, 0, 7); g.fill(); g.stroke(); };
  const limb = (x0, y0, x1, y1, r) => { const [a, b] = P(x0, y0), [c, d] = P(x1, y1); g.lineWidth = r * W; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  blob(0.5, 0.08, 0.075, 0.07);
  limb(0.5, 0.16, 0.5, 0.2, 0.06); limb(0.5, 0.24, 0.5, 0.52, 0.2);
  limb(0.4, 0.25, 0.2, 0.5, 0.06); limb(0.6, 0.25, 0.8, 0.5, 0.06);
  limb(0.45, 0.55, 0.42, 0.95, 0.08); limb(0.55, 0.55, 0.58, 0.95, 0.08);
  const maxT = 50;
  Object.entries(SITES).forEach(([k, s]) => {
    const [x, y] = P(...s.xy), on = k === st.site, k2 = s.thr / maxT;
    g.fillStyle = `hsl(${lerp(150, 10, k2)},80%,60%)`;
    g.beginPath(); g.arc(x, y, on ? 13 : 9, 0, 7); g.fill();
    if (on) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.75)'; g.font = (on ? '600 ' : '') + '17px sans-serif';
    const right = s.xy[0] >= 0.5 && k !== 'back' && k !== 'forehead' && k !== 'lips';
    const txt = `${s.name} ${s.thr} mm${k === 'back' ? ' (back)' : ''}`;
    g.fillText(txt, right ? x + 16 : x - 16 - g.measureText(txt).width, y + 6);
  });
}

function drawPatch(g, w, h, st) {
  const s = SITES[st.site], pxmm = w / st.width;
  g.fillStyle = '#' + toneColor(6).getHexString(); g.fillRect(0, 0, w, h);
  // Receptive fields: spacing half the threshold, so two touches feel separate only when an
  // untouched field lies between them.
  const sp = (s.thr / 2) * pxmm, rr = sp * 0.47;
  const cx = w / 2, cy = h / 2, gap = st.gap * pxmm;
  const pts = [[cx - gap / 2, cy], [cx + gap / 2, cy]];
  const cells = [];
  for (let j = -Math.ceil(h / sp); j <= Math.ceil(h / sp); j++) for (let i = -Math.ceil(w / sp) - 1; i <= Math.ceil(w / sp) + 1; i++) {
    const x = cx + (i + (j % 2 ? 0.5 : 0)) * sp, y = cy + j * sp * 0.866;
    if (x < -sp || x > w + sp || y < -sp || y > h + sp) continue;
    cells.push([x, y]);
  }
  const nearest = (p) => cells.reduce((b, c) => (Math.hypot(c[0] - p[0], c[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? c : b), cells[0]);
  const hit = pts.map(nearest);
  cells.forEach((c) => {
    const on = hit.includes(c);
    g.beginPath(); g.arc(c[0], c[1], Math.max(2, rr), 0, 7);
    g.fillStyle = on ? 'rgba(255,209,102,.55)' : 'rgba(255,255,255,.1)'; g.fill();
    g.strokeStyle = on ? '#ffd166' : 'rgba(255,255,255,.35)'; g.lineWidth = on ? 4 : 2; g.stroke();
  });
  g.fillStyle = '#ff5a7a'; pts.forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 7, 0, 7); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '600 20px sans-serif'; g.fillText(`${s.name}: each circle is the patch of skin one nerve fibre feels`, 14, 28);
  const sb = st.width > 30 ? 10 : 5; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(14, h - 22, sb * pxmm, 6); g.font = '18px sans-serif'; g.fillText(sb + ' mm', 14 + sb * pxmm + 8, h - 12);
}

export default {
  id: 'touch',
  short: 'The sense of touch',
  title: 'Five kinds of touch sensor',
  subtitle: 'Pressure, flutter, vibration, stretch and pain, each felt by its own receptor.',
  view: { pos: [0.2, 6.6, 12.8], target: [-2.4, 3.4, 0] },
  learn: `<p>Your skin feels with <b>receptors</b>: nerve endings, some wrapped in special capsules, each tuned to a different kind of touch. This is <b>fingertip</b> skin: no hair, <b>friction ridges</b> (your fingerprint) and some of the most crowded receptors in the body.</p>
    <p><b>Merkel cells</b> sit at the base of the epidermis and report steady <b>pressure</b>, edges and shapes; they keep firing while you press. <b>Meissner corpuscles</b>, tucked into the dermal papillae, feel <b>light touch</b> and slipping, and fire as a touch starts and stops, best at a flutter of about 30 Hz. Deep down, onion-like <b>Pacinian corpuscles</b> feel <b>vibration</b>, most sharply at about <b>250 Hz</b>, like a phone buzzing. <b>Ruffini endings</b> feel the skin <b>stretch</b>. Bare <b>free nerve endings</b> reach right into the epidermis and report <b>pain, heat, cold and itch</b>.</p>
    <p>How finely you can feel depends on how close together the receptors and their patches of skin are. In the <b>two-point test</b> a doctor touches you with two points: on a fingertip you can tell them apart at about <b>2 to 3 mm</b>; on your back they must be about <b>40 mm</b> apart. The brain gives sensitive parts more space in its touch map, the famous “homunculus” you can explore in <a href="/brainclear/#map">BrainClear</a>.</p>
    <p class="tip"><b>Try it:</b> try each kind of touch and see which receptors answer. Sweep the vibration from 10 to 400 Hz. Then switch to the two-point test and find the gap where two points become one.</p>`,
  terms: [
    { t: 'Receptor', d: 'A nerve ending, or a special cell, that turns something like pressure or heat into nerve signals.' },
    { t: 'Adapting', d: 'A receptor that fires when touch starts, then quietens even if the touch continues. Meissner and Pacinian receptors do this.' },
    { t: 'Receptive field', d: 'The patch of skin that one sensory nerve fibre listens to. Small fields mean fine detail.' },
    { t: 'Two-point threshold', d: 'The smallest gap between two touches that still feels like two separate points.' },
    { t: 'Friction ridges', d: 'The fine ridges on fingertips, palms and soles that give grip and form fingerprints.' },
    { t: 'Homunculus', d: 'A map of the body in the brain’s touch area, where sensitive parts like lips and fingers get extra space.' },
  ],
  defaults: { mode: 'receptors', stim: 'press', freq: 30, site: 'finger', gap: 8, labels: true },
  controls: [
    { key: 'mode', type: 'seg', label: 'Show', options: [{ v: 'receptors', label: 'Receptors' }, { v: 'twopoint', label: 'Two-point test' }] },
    { key: 'stim', type: 'seg', label: 'Receptors: kind of touch', options: Object.entries(STIM).map(([v, label]) => ({ v, label })) },
    { key: 'freq', type: 'log', label: 'Receptors: vibration frequency', min: 5, max: 500, ends: ['5 Hz', '500 Hz'], fmt: (v) => Math.round(v) + ' Hz' },
    { key: 'site', type: 'seg', label: 'Two-point: where on the body', options: Object.entries(SITES).map(([v, s]) => ({ v, label: s.name })) },
    { key: 'gap', type: 'range', label: 'Two-point: gap between the points', min: 1, max: 60, step: 0.5, ends: ['1 mm', '60 mm'], fmt: (v) => v.toFixed(v < 10 ? 1 : 0) + ' mm' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  onChange(s, key) {
    if (key === 'stim' || key === 'freq') s.mode = 'receptors';
    if (key === 'site' || key === 'gap') s.mode = 'twopoint';
    if (key === 'stim' && s.stim === 'vibrate' && s.freq < 20) s.freq = 30;
  },
  quiz: [
    { q: 'Which receptor is best at feeling a phone buzzing (fast vibration)?', options: ['Merkel cells', 'Pacinian corpuscles', 'Free nerve endings', 'Sweat glands'], answer: 1, why: 'Onion-like Pacinian corpuscles are most sensitive to vibration around 250 Hz.' },
    { q: 'Where can you tell two touching points apart when they are closest together?', options: ['On your back', 'On your fingertip', 'On your calf', 'It is the same everywhere'], answer: 1, why: 'Fingertips have densely packed receptors with small receptive fields, so about 2 to 3 mm is enough; the back needs about 40 mm.' },
    { q: 'What do free nerve endings mostly sense?', options: ['Only light touch', 'Pain, heat, cold and itch', 'Sound', 'Vibration only'], answer: 1, why: 'They are bare nerve endings reaching into the epidermis, and report pain, temperature and itch.' },
  ],
  reel: [
    { ms: 5400, caption: 'Five kinds of sensors: pressure, light touch, vibration, stretch, and pain and temperature.', set: { mode: 'receptors', stim: 'vibrate', labels: false }, anim: { freq: [20, 260, true] }, view: { pos: [2.6, 5.4, 9.8], target: [0.2, 2.8, 0] }, spin: 0.15 },
    { ms: 5200, caption: 'A fingertip tells two points apart just 2 to 3 mm apart. Your back needs about 40 mm.', set: { mode: 'twopoint', site: 'finger', labels: false }, anim: { gap: [1, 6] }, view: { pos: [0.4, 7.6, 7.8], target: [0.4, 2.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.9; stage.root.add(root);
    // ---- receptors mode
    const rec = new THREE.Group(); root.add(rec);
    const sk = makeSkinBlock(stage, { hair: false, ridges: true, tone: 7, extras: false }); rec.add(sk.root);
    const PX = 0.25, PZ = FRONT - 0.35;
    const probeG = new THREE.Group(); rec.add(probeG);
    const rodM = M.metal(0xc9ced8);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 20), rodM); rod.position.y = 1.35; probeG.add(rod);
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), rodM); probeG.add(tipBall);
    const tipNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 20), M.plastic(0xff6a3d, { emissive: new THREE.Color(0xff3a1a), emissiveIntensity: 0.6 })); tipNeedle.rotation.x = Math.PI; tipNeedle.position.y = 0.05; probeG.add(tipNeedle);
    const grips = [-1, 1].map((sgn) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 3.2), M.plastic(0x8ec5ff)); b.position.set(sgn * 2.7, Y.surf + 0.08, 0); rec.add(b); return b; });
    const rl = (html, pos, parent) => tint(stage.label(html, pos, parent), 'recep');
    const recLabs = [
      rl('Merkel: pressure', [-0.9, Y.surf + 0.5, FRONT + 0.3], sk.G.epi),
      rl('Meissner: light touch', [1.7, Y.surf + 0.55, FRONT + 0.3], sk.G.derm),
      rl('Pacinian: vibration', [0.3, 0.2, FRONT + 0.3], sk.G.hypo),
      rl('Ruffini: stretch', [2.3, 2.2, FRONT + 0.3], sk.G.derm),
      tint(stage.label('Free endings: pain, heat', [2.1, 3.25, FRONT + 0.3], sk.G.derm), 'nerve'),
      tint(stage.label('Friction ridges', [2.3, Y.surf + 0.3, -1.6], rec), 'side'),
    ];
    const spikes = { merkel: [], meissner: [], pacini: [], ruffini: [], free: [] };
    const rst = { spikes, now: 0 };
    const raster = canvasTexture(760, 560, (g, w, h) => drawRaster(g, w, h, rst));
    const rbrd = board(raster, 3.9, 2.87); rbrd.position.set(-5.3, 1.55, 1.6); rbrd.rotation.set(-0.1, 0.22, 0); stage.root.add(rbrd);

    // ---- two-point mode
    const tp = new THREE.Group(); root.add(tp);
    const pst = { site: 'finger', gap: 8, width: 20 };
    const widthOf = (s) => Math.max(clamp(SITES[s.site].thr * 5, 15, 60), s.gap * 1.35);    // mm shown across the patch
    const patchTex = canvasTexture(900, 600, (g, w, h) => drawPatch(g, w, h, pst));
    const patchMats = [tissue2(toneColor(6)), tissue2(toneColor(6)), new THREE.MeshStandardMaterial({ map: patchTex.tex, roughness: 0.7 }), tissue2(toneColor(6)), tissue2(toneColor(6)), tissue2(toneColor(6))];
    const patch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4), patchMats); patch.position.y = 1.6; patch.receiveShadow = true; tp.add(patch);
    const calM = M.metal(0xd6dae2);
    const needles = [-1, 1].map(() => { const n = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.6, 16), calM); c.rotation.x = Math.PI; c.position.y = 0.3; n.add(c); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 12), calM); r.position.y = 1.3; n.add(r); tp.add(n); return n; });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.12), calM); tp.add(bar);
    const body = canvasTexture(520, 700, (g, w, h) => drawBody(g, w, h, pst));
    const bbrd = board(body, 3.0, 4.04); bbrd.position.set(-4.9, 2.1, 1.2); bbrd.rotation.set(-0.08, 0.25, 0); stage.root.add(bbrd);
    const verdict = tint(stage.label('', [0, 3.9, 0], tp), 'gold');

    let t = 0, lastPatch = '', rr = { merkel: 0, meissner: 0, pacini: 0, ruffini: 0, free: 0 }, glow = { ...rr }, dent = -1, shift = 0, redraw = 0, mode = '';
    const fit = fitNarrow(stage, { pos: [-1.2, 6.6, 13.5], target: [-2.0, 3.0, 0] });
    const VIEWS = { receptors: { pos: [0.2, 6.6, 12.8], target: [-2.4, 3.4, 0] }, twopoint: { pos: [0.2, 9.4, 8.6], target: [-1.6, 2.6, 0] } };
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const R = s.mode === 'receptors';
        if (s.mode !== mode) { if (mode && !inReel()) stage.setView(VIEWS[s.mode].pos, VIEWS[s.mode].target, 0.9); mode = s.mode; }
        rec.visible = rbrd.visible = R; tp.visible = bbrd.visible = !R;
        const narrow = fit();
        if (R) {
          const u = t % CYCLE, p = probe(s.stim, u);
          rr = rates(s.stim, s.freq, u);
          // Spikes: Poisson-like, from a repeatable pseudo-random sequence.
          for (const k of Object.keys(spikes)) {
            const n = rr[k] * dt;
            if (rnd(t * 91.7 + k.length * 13.1) < n - Math.floor(n) || n >= 1) for (let q = 0; q < Math.max(1, Math.floor(n)); q++) spikes[k].push(t - q * dt / Math.max(1, n));
            while (spikes[k].length && spikes[k][0] < t - 3.2) spikes[k].shift();
            glow[k] = approach(glow[k], clamp(rr[k] / 90, 0, 1), 8, dt);
          }
          sk.receptorsGlow(glow);
          rst.now = t; redraw += dt; if (redraw > 0.1) { redraw = 0; raster.redraw(); }
          // Probe motion.
          const vib = s.stim === 'vibrate' ? Math.sin(t * Math.min(s.freq, 60) * 0.6) * 0.03 * p.d : 0;
          const x = s.stim === 'stroke' ? lerp(-2.2, 2.2, clamp((u - 0.3) / 2.1, 0, 1)) : PX;
          const depth = s.stim === 'stretch' ? 0 : p.d * 0.1;
          probeG.position.set(x, Y.surf + 0.16 - depth + (1 - p.d) * 0.8 + vib, PZ);
          probeG.visible = s.stim !== 'stretch';
          tipBall.visible = s.stim !== 'pain'; tipNeedle.visible = s.stim === 'pain';
          const nd = s.stim === 'stretch' ? 0 : depth;
          if (Math.abs(nd - dent) > 0.002 || s.stim === 'stroke') { dent = nd; sk.st.bumps = nd > 0.002 ? [{ x, z: PZ, r: 0.32, h: -nd }] : []; sk.reshape(); }
          const sh = s.stim === 'stretch' ? 0.18 * p.d : 0;
          if (Math.abs(sh - shift) > 0.001) { shift = sh; sk.G.epi.position.x = shift * 0.8; sk.G.corn.position.x = shift; }
          grips.forEach((g, i) => { g.visible = s.stim === 'stretch'; g.position.x = (i ? 1 : -1) * (2.7 + shift * 2); });
          recLabs.forEach((l) => { l.visible = s.labels && !narrow; });
        } else {
          const key = s.site + '|' + s.gap.toFixed(1);
          if (key !== lastPatch) { lastPatch = key; pst.site = s.site; pst.gap = s.gap; pst.width = widthOf(s); patchTex.redraw(); body.redraw(); }
          const hx = (s.gap / 2) * (6 / pst.width);               // the patch is 6 units wide
          needles.forEach((n, i) => n.position.set((i ? 1 : -1) * hx, 1.75, 0));
          bar.position.set(0, 3.36, 0); bar.scale.x = Math.max(0.3, hx * 2 + 0.1);
          const two = s.gap >= SITES[s.site].thr;
          verdict.visible = s.labels; verdict.element.innerHTML = `<b>${two ? 'Feels like TWO points' : 'Feels like ONE point'}</b>`;
        }
      },
      readout: (s) => {
        if (s.mode === 'twopoint') {
          const st = SITES[s.site], two = s.gap >= st.thr;
          return `<div class="big">${two ? 'Two points' : 'One point'} on the ${st.name.toLowerCase()}</div>
            <div class="row"><span>Gap between the points</span><b>${s.gap.toFixed(s.gap < 10 ? 1 : 0)} mm</b></div>
            <div class="row"><span>Two-point threshold here</span><b>about ${st.thr} mm</b></div>
            <div class="row"><span>Fingertip vs back</span><b>about 2 to 3 mm vs 40 mm</b></div>
            <small>Approximate adult values (Weinstein, 1968). They vary from person to person.</small>`;
        }
        const top = RECS.reduce((b, r) => (rr[r.k] > rr[b.k] ? r : b), RECS[0]);
        return `<div class="big">${STIM[s.stim]}${s.stim === 'vibrate' ? ' at ' + Math.round(s.freq) + ' Hz' : ''}: ${top.name} ${rr[top.k] > 5 ? 'fires most' : 'is quiet'}</div>
          ${RECS.map((r) => `<div class="row"><span>${r.name} (${r.what})</span><b>${Math.round(rr[r.k])} /s</b></div>`).join('')}
          <small>Illustrative firing rates, based on how each receptor is tuned.</small>`;
      },
    });
  },
};

function tissue2(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); }
