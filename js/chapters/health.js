// Chapter 6: healing and what goes wrong. General facts only, never medical advice.
// Sources:
//  - Wound healing: haemostasis (minutes), inflammation (about days 1 to 4–6), proliferation
//    (granulation tissue and new epidermis, about day 4 to 3 weeks), remodelling (3 weeks to a
//    year or more) (Guo & DiPietro, J Dent Res 89:219, 2010; StatPearls "Wound Healing
//    Phases"). Scar tissue lacks rete ridges, hair and glands; it reaches only about 20% of
//    normal strength at 3 weeks and at most about 80% after months (Levenson et al., Ann Surg
//    161:293, 1965). Strength curve here: 80%·(1 − e^(−t/50 days)) after day 3, illustrative.
//  - Burns: first degree (superficial) affects the epidermis; second degree (partial thickness)
//    reaches into the dermis, often with blisters; third degree (full thickness) destroys the
//    epidermis and dermis, including nerve endings, and usually needs grafts (NIH NIGMS "Burns"
//    fact sheet; StatPearls "Burn Classification"). WHO "Burns" fact sheet: about 180,000
//    deaths a year worldwide, mostly in low- and middle-income countries; in India over 1
//    million people are moderately or severely burnt every year.
//  - Acne: hair follicles clog with sebum and dead cells; Cutibacterium acnes bacteria grow and
//    inflammation follows (NIAMS "Acne"; AAD). Most teenagers get some acne.
//  - Atopic eczema: a leaky skin barrier (for example from filaggrin gene changes, Palmer et
//    al., Nat Genet 38:441, 2006) plus immune over-reaction; skin loses water and lets irritants
//    in (NIAMS "Atopic Dermatitis"). Common in children: up to about 1 in 5 in some countries
//    (ISAAC study; Odhiambo et al., J Allergy Clin Immunol 124:1251, 2009).
//  - Moles and melanoma: the ABCDEs (Asymmetry, Border, Colour, Diameter over 6 mm, Evolving)
//    (AAD, "What to look for: ABCDEs of melanoma"; Friedman, Rigel & Kopf, CA Cancer J Clin
//    35:130, 1985). In people with darker skin, melanoma is rarer but more often appears on the
//    palms, soles or under nails (acral lentiginous melanoma) and is often found later (AAD).
import { THREE, M, canvasTexture, swarm, clamp, lerp, smooth, approach } from '../kit.js';
import { makeSkinBlock, slab, tissue, tint, board, fitNarrow, compactReadout, panel, rnd, inReel, Y, W, D, FRONT } from '../skin.js';

const SCENES = { cut: 'A cut', burn: 'Burns', acne: 'Acne', eczema: 'Eczema', mole: 'Moles' };
const X0 = 0.9, HW = 0.42, YB = 2.45;                       // the cut: centre, half-width, depth
const notch = (x) => Math.abs(x - X0) < HW;
const yb = (x) => YB + (Math.abs(x - X0) / HW) * (Y.surf - YB + 0.05);
export const strength = (d) => (d < 3 ? 2 : 80 * (1 - Math.exp(-(d - 3) / 50)));
export function phaseOf(d) {
  if (d < 0.2) return ['Clotting', 'Platelets and a fibrin mesh plug the cut and stop the bleeding.'];
  if (d < 4) return ['Inflammation', 'White blood cells rush in to clear germs and debris. The edges look red and warm.'];
  if (d < 21) return ['New tissue', 'Pink granulation tissue fills the gap; new skin cells crawl across under the scab.'];
  return ['Remodelling', 'Collagen is rebuilt and lined up. The scar slowly fades and flattens over months.'];
}
const fmtDay = (d) => (d < 1 ? Math.max(1, Math.round(d * 24)) + ' hours' : d < 60 ? Math.round(d) + (Math.round(d) === 1 ? ' day' : ' days') : Math.round(d / 30) + ' months');
const BURN = {
  1: { name: 'First degree', depth: 'Epidermis only', looks: 'Red, dry, painful, no blisters', heals: 'about a week' },
  2: { name: 'Second degree', depth: 'Into the dermis', looks: 'Blisters, very painful', heals: 'about 2 to 3 weeks or more' },
  3: { name: 'Third degree', depth: 'Through the whole skin', looks: 'White, brown or charred; can feel numb', heals: 'usually needs skin grafts' },
};
const ACNE = { black: 'Blackhead', white: 'Whitehead', red: 'Inflamed spot' };
const MOLE = { ok: 'An ordinary mole', check: 'A mole to get checked' };
const ABCDE = [
  ['A', 'Asymmetry', 'one half unlike the other'], ['B', 'Border', 'ragged or blurred edge'], ['C', 'Colour', 'several shades'],
  ['D', 'Diameter', 'bigger than 6 mm'], ['E', 'Evolving', 'changing in size, shape or colour'],
];

function drawBoard(g, w, h, s) {
  const sc = s.scene;
  panel(g, w, h, { cut: 'How a cut heals', burn: 'How deep is a burn?', acne: 'How a spot forms', eczema: 'Eczema: a leaky barrier', mole: 'The ABCDEs of moles' }[sc]);
  g.font = '19px sans-serif';
  if (sc === 'cut') {
    const L = 70, R = w - 30, top = 90, bot = h - 110, X = (d) => L + (Math.log10(d / 0.01) / Math.log10(365 / 0.01)) * (R - L), Yv = (p) => bot - (p / 100) * (bot - top);
    [['Clot', 0.01, 0.2, '#ff5a5a'], ['Inflame', 0.2, 4, '#ffb547'], ['New tissue', 4, 21, '#ff8ab0'], ['Remodel', 21, 365, '#c9a7ff']].forEach(([n, a, b, c]) => {
      g.fillStyle = c + '33'; g.fillRect(X(a), top, X(b) - X(a), bot - top); g.fillStyle = c; g.font = '600 16px sans-serif'; g.fillText(n, X(a) + 4, top + 20);
    });
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '16px sans-serif';
    [0, 40, 80, 100].forEach((p) => { g.beginPath(); g.moveTo(L, Yv(p)); g.lineTo(R, Yv(p)); g.stroke(); g.fillText(p + '%', 16, Yv(p) + 6); });
    [[1 / 24, '1 h'], [1, '1 day'], [7, '1 wk'], [30, '1 mo'], [365, '1 yr']].forEach(([d, n]) => g.fillText(n, X(d) - 14, bot + 24));
    g.strokeStyle = '#6ee7a8'; g.lineWidth = 4; g.beginPath();
    for (let i = 0; i <= 200; i++) { const d = 0.01 * Math.pow(36500, i / 200), x = X(d), y = Yv(strength(d)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
    g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, Yv(80)); g.lineTo(R, Yv(80)); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#6ee7a8'; g.font = '600 17px sans-serif'; g.fillText('scar strength, % of unhurt skin', L + 8, Yv(80) - 10);
    const x = X(clamp(s.day, 0.01, 365)); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
  } else if (sc === 'burn') {
    [1, 2, 3].forEach((k, i) => {
      const y = 90 + i * 118, on = +s.degree === k, b = BURN[k];
      g.fillStyle = on ? 'rgba(255,209,102,.18)' : 'rgba(255,255,255,.05)'; g.fillRect(20, y, w - 40, 106);
      g.fillStyle = on ? '#ffd166' : '#e8ecf4'; g.font = '600 22px sans-serif'; g.fillText(b.name + ': ' + b.depth.toLowerCase(), 34, y + 32);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif'; g.fillText(b.looks, 34, y + 62); g.fillText('Heals: ' + b.heals, 34, y + 88);
    });
  } else if (sc === 'acne') {
    const steps = ['1. Too much sebum (oil) and dead cells', '2. They plug the follicle: a comedo', '3. Open plug darkens: a blackhead', '4. Bacteria (C. acnes) grow inside', '5. The body fights back: red, swollen spot'];
    steps.forEach((t, i) => { g.fillStyle = i < ({ black: 3, white: 2, red: 5 }[s.acne]) ? '#ffd166' : 'rgba(255,255,255,.45)'; g.font = '19px sans-serif'; g.fillText(t, 30, 100 + i * 52); });
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '17px sans-serif'; g.fillText('Blackheads are dark from oxidised oil and melanin, not dirt.', 30, 380);
  } else if (sc === 'eczema') {
    const k = s.severity;
    [['Barrier bricks missing', Math.round(k * 45) + '%'], ['Water escaping', k > 0.1 ? 'much more than usual' : 'normal'], ['Irritants and allergens', k > 0.1 ? 'getting in' : 'kept out'], ['Skin', k > 0.4 ? 'dry, itchy, inflamed' : k > 0.1 ? 'dry and a bit itchy' : 'healthy']].forEach(([a, b], i) => {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '19px sans-serif'; g.fillText(a, 30, 110 + i * 60); g.fillStyle = '#ffd166'; g.font = '600 20px sans-serif'; g.fillText(b, 360, 110 + i * 60);
    });
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '17px sans-serif'; g.fillText('Scratching damages the barrier more: the itch-scratch cycle.', 30, 370);
  } else {
    const bad = s.mole === 'check';
    ABCDE.forEach(([L, n, d], i) => {
      const y = 96 + i * 62;
      g.fillStyle = bad ? '#ff8a8a' : '#6ee7a8'; g.font = '700 34px sans-serif'; g.fillText(L, 30, y + 30);
      g.fillStyle = '#e8ecf4'; g.font = '600 20px sans-serif'; g.fillText(n, 80, y + 16);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '17px sans-serif'; g.fillText(d, 80, y + 40);
      g.fillStyle = bad ? '#ff8a8a' : '#6ee7a8'; g.font = '600 18px sans-serif'; g.fillText(bad ? 'yes' : 'no', w - 70, y + 28);
    });
  }
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 17px sans-serif';
  g.fillText('General facts only. For your own skin, see a doctor or dermatologist.', 22, h - 22);
}

export default {
  id: 'health',
  short: 'Healing and problems',
  title: 'How skin heals, and what goes wrong',
  subtitle: 'Cuts, scars, burns, acne, eczema and moles: general facts, not medical advice.',
  view: { pos: [0.6, 7.2, 13.4], target: [-2.5, 3.8, 0] },
  learn: `<p>Skin gets hurt more than any other organ, and it is very good at mending. This chapter shares <b>general facts only</b>: for anything about your own skin, see a <b>doctor or dermatologist</b>.</p>
    <p><b>A cut heals in overlapping stages.</b> Within minutes, platelets and a fibrin mesh form a <b>clot</b>. For a few days <b>white blood cells</b> clean the wound, so the edges look red. Then pink <b>granulation tissue</b> fills the gap and new skin cells crawl across under the scab. For months after, collagen is rebuilt. The result is a <b>scar</b>: it has no hair, sweat glands or ridges, and at best about <b>80%</b> of the original strength.</p>
    <p><b>Burns</b> are graded by depth. <b>First degree</b> reaches only the epidermis (like mild sunburn). <b>Second degree</b> reaches the dermis and blisters. <b>Third degree</b> destroys the whole skin, even its nerve endings, and usually needs <b>skin grafts</b>. The WHO counts over a million serious burns a year in India, many from kitchen fires and hot liquids; first-aid guides say to cool a burn under clean, cool running water and to get medical help for anything more than a small burn.</p>
    <p><b>Acne</b> starts when <b>sebum</b> and dead cells plug a follicle; <b>bacteria</b> grow and the body reacts with a red spot. Most teenagers get some. <b>Eczema</b> is partly a <b>leaky barrier</b>: water escapes and irritants get in, so skin turns dry and itchy. <b>Moles</b> are clusters of melanocytes. Most are harmless, but the <b>ABCDEs</b> help spot ones to show a dermatologist. In darker skin, melanoma is rarer but more often appears on palms, soles or under nails.</p>
    <p class="tip"><b>Try it:</b> drag the cut through its first year and watch the scar form. Compare the three burn depths, then see a spot form, a barrier leak, and an ordinary mole beside one to get checked.</p>`,
  terms: [
    { t: 'Clot', d: 'A plug of platelets and fibrin that stops bleeding. It dries into a scab.' },
    { t: 'Granulation tissue', d: 'Pink, new tissue full of tiny blood vessels that fills a healing wound.' },
    { t: 'Scar', d: 'Repaired dermis made of collagen, with no hair, glands or ridges.' },
    { t: 'Skin graft', d: 'Healthy skin moved from one place to cover a wound that cannot heal on its own.' },
    { t: 'Comedo', d: 'A follicle plugged with sebum and dead cells: a blackhead if open, a whitehead if closed.' },
    { t: 'Dermatologist', d: 'A doctor who specialises in skin, hair and nails.' },
  ],
  defaults: { scene: 'cut', day: 2, degree: 2, acne: 'red', severity: 0.6, mole: 'ok', labels: true },
  controls: [
    { key: 'scene', type: 'seg', label: 'Show', options: Object.entries(SCENES).map(([v, label]) => ({ v, label })) },
    { key: 'day', type: 'log', label: 'Cut: time since it happened', min: 0.01, max: 365, ends: ['15 min', '1 year'], fmt: (v) => fmtDay(v) },
    { key: 'degree', type: 'seg', label: 'Burn: depth', options: [1, 2, 3].map((v) => ({ v, label: BURN[v].name })) },
    { key: 'acne', type: 'seg', label: 'Acne: kind of spot', options: Object.entries(ACNE).map(([v, label]) => ({ v, label })) },
    { key: 'severity', type: 'range', label: 'Eczema: how leaky the barrier is', min: 0, max: 1, step: 0.01, ends: ['healthy', 'very leaky'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'mole', type: 'seg', label: 'Moles', options: Object.entries(MOLE).map(([v, label]) => ({ v, label })) },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  onChange(s, key) {
    const map = { day: 'cut', degree: 'burn', acne: 'acne', severity: 'eczema', mole: 'mole' };
    if (map[key]) s.scene = map[key];
  },
  quiz: [
    { q: 'What fills a healing wound before the scar forms?', options: ['Fat', 'Pink granulation tissue', 'Sweat', 'Hair'], answer: 1, why: 'Granulation tissue, full of tiny new blood vessels, fills the gap. It is later remodelled into scar collagen.' },
    { q: 'Why can a third-degree burn feel numb in the middle?', options: ['It is not serious', 'The nerve endings in the skin are destroyed', 'Cold water froze it', 'Burns never hurt'], answer: 1, why: 'A full-thickness burn destroys the dermis, including its nerve endings. It is very serious and needs medical care.' },
    { q: 'What does the “E” in the ABCDEs of moles stand for?', options: ['Easy', 'Evolving: changing in size, shape or colour', 'Even', 'Eczema'], answer: 1, why: 'A mole that changes is a reason to see a dermatologist.' },
  ],
  reel: [
    { ms: 5600, caption: 'A cut heals from clot to scar over months, and for anything about your own skin, see a doctor or dermatologist.', set: { scene: 'cut', labels: false }, anim: { day: [0.02, 200, true] }, view: { pos: [2.0, 5.4, 7.6], target: [0.9, 3.4, 0] }, spin: 0.1 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.9; stage.root.add(root);
    const sk = makeSkinBlock(stage, { tone: 7 }); root.add(sk.root);
    const bst = { scene: 'cut', day: 2, degree: 2, acne: 'red', severity: 0.6, mole: 'ok' };
    const tex = canvasTexture(760, 560, (g, w, h) => drawBoard(g, w, h, bst));
    const brd = board(tex, 3.9, 2.87); brd.position.set(-5.3, 1.55, 1.6); brd.rotation.set(-0.1, 0.22, 0); stage.root.add(brd);
    // Scab / clot / blister fluid: a slab whose shape each scene sets.
    const fillMat = tissue(0x8a1f1f, { vertexColors: false, roughness: 0.8 });
    const fill = slab(W, D, 96, 8, fillMat); root.add(fill);
    const NC = 40, wbc = swarm(NC, new THREE.IcosahedronGeometry(0.07, 1), M.plastic(0xf4f4ff)); wbc.frustumCulled = false; root.add(wbc);
    const NB = 30, bugs = swarm(NB, new THREE.CapsuleGeometry(0.025, 0.07, 3, 6), M.glow(0xb07cff)); bugs.frustumCulled = false; root.add(bugs);
    const NW = 50, wat = swarm(NW, new THREE.SphereGeometry(0.045, 8, 6), M.glow(0x6cc8ff)); wat.frustumCulled = false; root.add(wat);
    const NI = 30, irr = swarm(NI, new THREE.TetrahedronGeometry(0.07), M.glow(0x9be36b)); irr.frustumCulled = false; root.add(irr);
    // Eczema: the stratum corneum as tiles, some missing.
    const TX = 30, TZ = 20, tiles = swarm(TX * TZ, new THREE.BoxGeometry(W / TX * 0.96, Y.corn, D / TZ * 0.96), tissue(0xe8d9c0)); root.add(tiles);
    // Acne: sebum plug, redness, pus.
    const f0 = sk.follicles[0];
    const plug = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), tissue(0xf3e2a0)); plug.scale.set(1, 1.8, 1); root.add(plug);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M.matte(0x2a2018)); root.add(cap);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), tissue(0xff4040, { opacity: 0.25, depthWrite: false })); root.add(halo);
    const pus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), tissue(0xfff2c0)); root.add(pus);
    // Moles: a nest of melanocytes at the junction.
    const nest = new THREE.Group(); root.add(nest);
    const nm = M.matte(0x3a2014);
    for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 + 0.04 * rnd(i), 10, 8), nm); b.position.set((rnd(i + 1) - 0.5) * 2.4, -0.1 + rnd(i + 2) * 0.3, -0.2 + rnd(i + 3) * 0.25); nest.add(b); }
    nest.position.set(0.9, Y.derm, FRONT);
    const labs = {
      a: tint(stage.label('', [X0 + 0.9, Y.surf + 0.6, FRONT + 0.3], root), 'warn'),
      b: tint(stage.label('', [X0 - 0.2, 2.2, FRONT + 0.3], root), 'blood'),
    };
    let t = 0, lastKey = '', lastShape = '';
    const fit = fitNarrow(stage, { pos: [-1.8, 6.8, 13.5], target: [-2.6, 3.2, 0] });
    const hide = (m, n) => { for (let i = 0; i < n; i++) m.place(i, [0, -50, 0]); m.done(); };
    const moleR = (x, z, bad) => {
      const dx = x - 0.9, dz = z - 0.2, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
      const R = bad ? 2.3 + 0.55 * Math.sin(3 * a + 0.4) + 0.3 * Math.sin(7 * a) : 1.9;
      return r / R;
    };
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const sc = s.scene;
        // ---- shape of the layers for this scene
        const shapeKey = sc === 'cut' ? 'cut' + s.day.toFixed(2) : sc === 'burn' ? 'burn' + s.degree : sc === 'acne' ? 'acne' + s.acne : sc;
        if (shapeKey !== lastShape) {
          lastShape = shapeKey;
          const d = s.day;
          if (sc === 'cut') {
            const gran = d < 3 ? YB : lerp(YB, Y.derm - 0.01, smooth((d - 3) / 18));
            const m = HW * smooth((d - 1) / 9);                                    // new skin crawls in from each edge
            const cov = (x) => clamp((m - (HW - Math.abs(x - X0))) / 0.06, 0, 1);
            const dT = (x, h) => (notch(x) ? Math.max(yb(x), Math.min(gran, h)) : h);
            sk.setMod({
              derm: (x, z, h) => dT(x, h),
              epi: (x, z, top, dt2) => (notch(x) ? dt2 + (Y.surf - Y.corn - Y.derm) * cov(x) : top),
              corn: (x, z, top, eT) => (notch(x) ? eT + Y.corn * cov(x) : top),
            });
            // Clot, then scab: fills the gap from whatever has healed below up to just above the surface.
            fill.visible = d < 14;
            fill.setFns((x, z) => (notch(x) ? dT(x, 9) + (Y.surf - Y.derm) * cov(x) : Y.surf - 0.03), (x, z) => (notch(x) ? Y.surf + 0.05 * (1 - Math.abs(x - X0) / HW) : Y.surf - 0.03));
            fillMat.color.set(d < 0.2 ? 0xc41e1e : d < 2 ? 0x8a1f1f : 0x5a2a1a);
            // Colours: granulation red, then paler scar; inflamed edges.
            const infl = d > 0.2 && d < 6 ? Math.sin(Math.PI * clamp((d - 0.2) / 5.8, 0, 1)) : 0;
            const scarK = smooth((d - 21) / 200);
            sk.layers.derm.setColors((x, y, z) => {
              const ax = Math.abs(x - X0);
              if (ax < HW && y > YB - 0.05) return d < 21 ? [1, 0.55, 0.55] : [lerp(1, 1, scarK), lerp(0.55, 0.92, scarK), lerp(0.55, 0.95, scarK)];
              const r = infl * Math.exp(-((ax - HW) ** 2) / 0.3);
              return [1, 1 - 0.45 * r, 1 - 0.45 * r];
            });
            sk.layers.epi.setColors((x) => { const r = infl * Math.exp(-((Math.abs(x - X0) - HW) ** 2) / 0.2); return [1, 1 - 0.3 * r, 1 - 0.3 * r]; });
            sk.layers.corn.setColors(null);
          } else {
            sk.setMod(null); fill.visible = false;
            sk.layers.derm.setColors(null); sk.layers.epi.setColors(null); sk.layers.corn.setColors(null); sk.layers.hypo.setColors(null);
            if (sc === 'burn') {
              const deg = +s.degree, zone = (x) => clamp((1.9 - Math.abs(x)) / 0.3, 0, 1);
              if (deg === 2) {
                const bl = (x, z) => 0.3 * Math.max(0, 1 - (x / 1.3) ** 2 - (z / 1.6) ** 2);
                sk.setMod({ epiBot: (x, z, dT) => dT + bl(x, z), epi: (x, z, top) => top + bl(x, z), corn: (x, z, top) => top + bl(x, z) });
                fill.visible = true; fillMat.color.set(0xf6e7a8); fillMat.opacity = 0.6;
                fill.setFns((x, z) => sk.H.derm(x, z), (x, z) => sk.H.derm(x, z) + bl(x, z));
              }
              const red = deg === 1 ? [1, 0.62, 0.58] : [1, 0.5, 0.48];
              const char = [0.42, 0.33, 0.28];
              sk.layers.corn.setColors((x) => { const k = zone(x); const c = deg === 3 ? char : red; return [lerp(1, c[0], k), lerp(1, c[1], k), lerp(1, c[2], k)]; });
              sk.layers.epi.setColors((x) => { const k = zone(x); const c = deg === 3 ? char : red; return [lerp(1, c[0], k), lerp(1, c[1], k), lerp(1, c[2], k)]; });
              if (deg >= 2) sk.layers.derm.setColors((x, y) => { const k = zone(x) * (deg === 3 ? 1 : clamp((y - 2.9) / 0.5, 0, 1)); const c = deg === 3 ? [0.85, 0.74, 0.62] : [1, 0.55, 0.5]; return [lerp(1, c[0], k), lerp(1, c[1], k), lerp(1, c[2], k)]; });
            }
            if (sc === 'acne') {
              const p = f0.at(1);
              sk.st.bumps = s.acne === 'red' ? [{ x: p.x, z: p.z, r: 0.5, h: 0.22 }] : s.acne === 'white' ? [{ x: p.x, z: p.z, r: 0.3, h: 0.1 }] : [];
              sk.reshape();
              if (s.acne === 'red') sk.layers.derm.setColors((x, y, z) => { const r = Math.exp(-((x - p.x) ** 2 + (y - 3.3) ** 2) / 0.5); return [1, 1 - 0.45 * r, 1 - 0.45 * r]; });
            }
            if (sc !== 'acne') { sk.st.bumps = []; sk.reshape(); }
            if (sc === 'eczema') sk.layers.derm.setColors((x, y) => { const r = s.severity * clamp((y - 2.8) / 0.8, 0, 1); return [1, 1 - 0.4 * r, 1 - 0.4 * r]; });
            if (sc === 'mole') {
              const bad = s.mole === 'check';
              const col = (x, y, z) => { const k = clamp((1 - moleR(x, z, bad)) / 0.08, 0, 1); const dark = bad && (x - 0.9) * 0.7 + z > 0.3 ? 0.18 : 0.38; return [lerp(1, dark, k), lerp(1, dark * 0.85, k), lerp(1, dark * 0.75, k)]; };
              sk.layers.corn.setColors(col); sk.layers.epi.setColors(col);
              nest.scale.setScalar(bad ? 1.35 : 1);
            }
          }
          if (sc !== 'burn') fillMat.opacity = 1;
        }
        // ---- particles and extras
        const d = s.day;
        const inflN = sc === 'cut' ? Math.round(NC * (d > 0.15 && d < 8 ? Math.sin(Math.PI * clamp((d - 0.15) / 7.85, 0, 1)) : 0)) : sc === 'acne' && s.acne === 'red' ? 22 : 0;
        const ctr = sc === 'cut' ? [X0, 3.1] : [f0.at(0.85).x, f0.at(0.85).y];
        for (let i = 0; i < NC; i++) {
          if (i >= inflN) { wbc.place(i, [0, -50, 0]); continue; }
          const a = t * 0.5 + i * 2.4, r = 0.25 + 0.5 * rnd(i);
          wbc.place(i, [ctr[0] + Math.cos(a) * r * 1.3, ctr[1] + Math.sin(a * 1.3) * r * 0.9, FRONT + 0.06 - rnd(i + 4) * 0.35], null, 1);
        }
        wbc.done();
        const acne = sc === 'acne';
        plug.visible = cap.visible = acne; halo.visible = acne && s.acne === 'red'; pus.visible = acne && s.acne === 'red';
        if (acne) {
          const p = f0.at(0.86), top = f0.at(1);
          plug.position.copy(p); cap.position.set(top.x, Y.surf + 0.02, top.z); cap.visible = s.acne === 'black';
          halo.position.set(p.x, p.y - 0.1, p.z); pus.position.set(top.x, Y.surf + 0.18, top.z);
          for (let i = 0; i < NB; i++) { const a = t * 0.8 + i; bugs.place(i, [p.x + Math.cos(a + i) * 0.17 * rnd(i), p.y - 0.25 + 0.5 * rnd(i + 2), p.z + 0.15], [a, i, 0], 1); }
          bugs.done();
        } else hide(bugs, NB);
        const ecz = sc === 'eczema';
        sk.layers.corn.visible = !ecz; tiles.visible = ecz;
        if (ecz) {
          let k = 0;
          for (let j = 0; j < TZ; j++) for (let i = 0; i < TX; i++, k++) {
            const x = -W / 2 + (i + 0.5) * (W / TX), z = -D / 2 + (j + 0.5) * (D / TZ);
            if (rnd(k * 3.3) < s.severity * 0.45) tiles.place(k, [0, -50, 0]);
            else tiles.place(k, [x, sk.surfY(x, z) - Y.corn / 2, z], [0, 0, (rnd(k) - 0.5) * 0.1 * s.severity], 1);
          }
          tiles.done();
          const nw = Math.round(NW * (0.1 + 0.9 * s.severity)), ni = Math.round(NI * s.severity);
          for (let i = 0; i < NW; i++) { if (i >= nw) { wat.place(i, [0, -50, 0]); continue; } const a = (t * 0.4 + rnd(i)) % 1; wat.place(i, [-2.7 + 5.4 * rnd(i + 1), Y.derm + a * 2.2, -1.8 + 3.6 * rnd(i + 2)], null, 1); }
          for (let i = 0; i < NI; i++) { if (i >= ni) { irr.place(i, [0, -50, 0]); continue; } const a = (t * 0.3 + rnd(i + 9)) % 1; irr.place(i, [-2.7 + 5.4 * rnd(i + 11), Y.surf + 1.6 - a * 2.0, -1.8 + 3.6 * rnd(i + 12)], [t + i, i, 0], 1); }
          wat.done(); irr.done();
        } else { hide(wat, NW); hide(irr, NI); }
        nest.visible = sc === 'mole';
        // Nerve endings and small vessels are destroyed in a third-degree burn.
        const deep = sc === 'burn' && +s.degree === 3;
        sk.R.free.obj.visible = !deep; sk.R.meissner.objs.forEach((o) => { o.visible = !deep; });
        // ---- board and labels
        const key = [sc, s.day.toFixed(2), s.degree, s.acne, s.severity.toFixed(2), s.mole].join('|');
        if (key !== lastKey) { lastKey = key; Object.assign(bst, { scene: sc, day: s.day, degree: s.degree, acne: s.acne, severity: s.severity, mole: s.mole }); tex.redraw(); }
        const narrow = fit();
        const L = {
          cut: [phaseOf(d)[0], d < 14 ? (d < 0.2 ? 'Fresh clot' : 'Scab') : 'Scar: no ridges, hair or glands'],
          burn: [BURN[s.degree].name, +s.degree === 3 ? 'Nerve endings destroyed' : +s.degree === 2 ? 'Blister: fluid under the epidermis' : 'Only the epidermis'],
          acne: [ACNE[s.acne], s.acne === 'red' ? 'Bacteria and white blood cells' : 'Plug of sebum and dead cells'],
          eczema: ['Gaps in the barrier', 'Water out, irritants in'],
          mole: [MOLE[s.mole], 'Melanocytes in a nest'],
        }[sc];
        labs.a.element.innerHTML = L[0]; labs.b.element.innerHTML = L[1];
        const bp = sc === 'cut' ? [X0 + 1.5, 2.3] : sc === 'acne' ? [-2.4, 2.4] : sc === 'mole' ? [2.3, 3.2] : [1.2, 2.3];
        labs.b.position.set(bp[0], bp[1], FRONT + 0.3);
        Object.values(labs).forEach((l) => { l.visible = s.labels && !narrow; });
      },
      readout: (s) => {
        const sc = s.scene;
        const foot = '<small>General facts, not medical advice. For your own skin, see a doctor or dermatologist.</small>';
        if (sc === 'cut') {
          const [ph, what] = phaseOf(s.day);
          return `<div class="big">${fmtDay(s.day)} after a cut: ${ph.toLowerCase()}</div>
            <div class="row"><span>What is happening</span><b>${what}</b></div>
            <div class="row"><span>Strength vs unhurt skin</span><b>about ${Math.round(strength(s.day))}%</b></div>
            <div class="row"><span>Best a scar ever gets</span><b>about 80%</b></div>${foot}`;
        }
        if (sc === 'burn') { const b = BURN[s.degree]; return `<div class="big">${b.name} burn</div><div class="row"><span>How deep</span><b>${b.depth}</b></div><div class="row"><span>Looks and feels</span><b>${b.looks}</b></div><div class="row"><span>Healing</span><b>${b.heals}</b></div>${foot}`; }
        if (sc === 'acne') return `<div class="big">${ACNE[s.acne]}</div><div class="row"><span>Cause</span><b>sebum and dead cells plug a follicle</b></div><div class="row"><span>Then</span><b>${s.acne === 'red' ? 'bacteria grow, the body reacts' : s.acne === 'black' ? 'the open plug darkens in air' : 'the plug stays under the skin'}</b></div><div class="row"><span>Who gets it</span><b>most teenagers, some adults</b></div>${foot}`;
        if (sc === 'eczema') return `<div class="big">Barrier ${Math.round(s.severity * 45)}% broken</div><div class="row"><span>Water loss</span><b>${s.severity > 0.1 ? 'raised' : 'normal'}</b></div><div class="row"><span>Irritants and allergens</span><b>${s.severity > 0.1 ? 'get in' : 'kept out'}</b></div><div class="row"><span>How common</span><b>up to about 1 in 5 children in some countries</b></div>${foot}`;
        const bad = s.mole === 'check';
        return `<div class="big">${MOLE[s.mole]}</div>${ABCDE.map(([L, n, dd]) => `<div class="row"><span>${L}: ${n}</span><b>${bad ? dd : 'no'}</b></div>`).join('')}${foot}`;
      },
    });
  },
};
