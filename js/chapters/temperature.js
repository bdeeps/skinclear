// Chapter 3: keeping 37 °C. The skin is the body's radiator: blood vessels widen or narrow to
// send more or less warm blood to the surface, sweat glands pour water onto it to evaporate, and
// in the cold the arrector pili muscles raise goosebumps.
// Facts:
//  - Core temperature is held near 37 °C by the hypothalamus; sweat evaporating takes about
//    2,400 J per gram (latent heat of water at skin temperature, about 2,430 J/g); sweat rates
//    reach about 1 to 2 L an hour in hot conditions, more in heat-acclimatised people for short
//    spells (Guyton & Hall, 14th ed., ch. 74; Sawka et al., ACSM position stand, Med Sci Sports
//    Exerc 39:377, 2007).
//  - Skin blood flow goes from near zero in the cold to 6 to 8 L/min in severe heat (Rowell,
//    Human Circulation, 1986; Johnson & Kellogg).
//  - Goosebumps: the arrector pili contract (sympathetic nerves) and stand the hairs up; in furry
//    mammals this traps a thicker layer of air. In humans it does little: a leftover.
//  - Wet-bulb temperature 35 °C is the theoretical limit at which even a resting person in the
//    shade cannot lose heat (Sherwood & Huber, PNAS 107:9552, 2010). Lab tests on young, healthy
//    people found a lower limit, about 31 °C in humid heat (Vecellio et al., J Appl Physiol
//    132:340, 2022). Weather stations in South Asia and the Persian Gulf have briefly recorded
//    wet-bulb 35 °C (Raymond, Matthews & Horton, Sci Adv 6:eaaw1838, 2020).
// The heat-balance model is in skin.js (heat()): bare skin, shade, adult of 1.8 m².
import { THREE, M, canvasTexture, swarm, clamp, lerp, approach } from '../kit.js';
import { makeSkinBlock, tissue, tint, board, fitNarrow, compactReadout, panel, rnd, heat, skinFlow, wetBulb, ACT, FRONT, Y } from '../skin.js';

const T0 = 0, T1 = 50, H0 = 10, H1 = 100;
function stateOf(h) {
  if (h.cold) return { key: 'cold', text: 'Losing heat: vessels narrow, goosebumps', col: '#7aa2ff' };
  if (h.Ereq < 25) return { key: 'ok', text: 'Comfortable: little or no sweat needed', col: '#6ee7a8' };
  if (h.over) return { key: 'over', text: 'Sweat can’t dry fast enough: body heats up', col: '#ff6b6b' };
  if (h.ratio > 0.8) return { key: 'edge', text: 'Sweating hard, close to the limit', col: '#ffb547' };
  return { key: 'sweat', text: 'Sweating, and it is keeping up', col: '#ffd166' };
}
const CELL = { cold: [122, 162, 255], ok: [110, 231, 168], sweat: [255, 209, 102], edge: [255, 160, 70], over: [255, 90, 90] };

function drawMap(g, w, h, st) {
  panel(g, w, h, 'Can sweat keep you cool?');
  g.font = '19px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(`${ACT[st.act].name}${st.breeze ? ', in a breeze' : ', still air'}, in the shade`, 22, 74);
  const L = 80, R = w - 30, top = 96, bot = h - 70, X = (t) => L + ((t - T0) / (T1 - T0)) * (R - L), Yh = (r) => bot - ((r - H0) / (H1 - H0)) * (bot - top);
  const nx = 50, ny = 36;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const t = T0 + (i + 0.5) / nx * (T1 - T0), r = H0 + (j + 0.5) / ny * (H1 - H0);
    const c = CELL[stateOf(heat(t, r, st.act, st.breeze)).key];
    g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.55)`;
    g.fillRect(X(T0 + i / nx * (T1 - T0)), Yh(H0 + (j + 1) / ny * (H1 - H0)), (R - L) / nx + 0.6, (bot - top) / ny + 0.6);
  }
  // Wet-bulb lines: for each temperature find the humidity where Tw reaches the limit.
  const contour = (lim, dash, label) => {
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash(dash); g.beginPath(); let first = true, lx = 0, ly = 0;
    for (let t = 30; t <= T1; t += 0.25) {
      if (wetBulb(t, 99) < lim) continue;
      let a = 5, b = 99; for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (wetBulb(t, m) < lim) a = m; else b = m; }
      const r = (a + b) / 2; if (r < H0) break;
      const x = X(t), y = Yh(r); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); lx = x; ly = y;
    }
    g.stroke(); g.setLineDash([]);
    return [lx, ly];
  };
  contour(35, [], 'Tw 35'); contour(31, [10, 8], 'Tw 31');
  g.fillStyle = '#fff'; g.font = '600 17px sans-serif';
  g.fillText('wet-bulb 35 °C: theoretical limit', X(35.5), Yh(97) + 4);
  g.font = '17px sans-serif'; g.fillText('- - wet-bulb 31 °C: lab limit, young adults', X(19), Yh(88));
  // Axes.
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  for (let t = 0; t <= 50; t += 10) g.fillText(t + '°', X(t) - 12, bot + 26);
  for (let r = 20; r <= 100; r += 20) g.fillText(r + '%', 18, Yh(r) + 6);
  g.fillText('air temperature →', R - 150, bot + 52); g.save(); g.translate(16, top + 150); g.rotate(-Math.PI / 2); g.restore();
  g.fillText('humidity ↑', L + 6, top + 20);
  // Legend.
  const leg = [['cold', 'too cold'], ['ok', 'comfy'], ['sweat', 'sweat copes'], ['edge', 'near limit'], ['over', 'overheats']];
  leg.forEach(([k, name], i) => { const c = CELL[k]; g.fillStyle = `rgb(${c})`; g.fillRect(L + i * 128, h - 24, 16, 16); g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '16px sans-serif'; g.fillText(name, L + i * 128 + 22, h - 11); });
  // You are here.
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.arc(X(st.T), Yh(st.RH), 11, 0, 7); g.fill(); g.stroke();
}

export default {
  id: 'temperature',
  short: 'Keeping 37 °C',
  title: 'Your built-in air conditioner',
  subtitle: 'Sweat, blood flow and goosebumps hold your core near 37 °C, until the air is too hot and humid.',
  view: { pos: [-0.6, 6.4, 13.2], target: [-2.9, 3.4, 0] },
  learn: `<p>Your body makes heat all the time, about <b>100 watts</b> at rest, like a bright old light bulb, and several times more when you run. To stay near <b>37 °C</b> inside, it has to lose exactly as much heat as it makes, and the skin is where it does it.</p>
    <p><b>Blood vessels</b> are the first dial. When you are warm, vessels in the dermis <b>widen</b> and send warm blood to the surface to lose heat: you look flushed. In the cold they <b>narrow</b> and keep blood deep: fingers go pale and cold. Skin blood flow can go from almost nothing to about <b>7 litres a minute</b>.</p>
    <p><b>Sweat</b> is the big one. Turning 1 gram of sweat into vapour takes about <b>2,400 joules</b> of heat, pulled from your skin. You can sweat <b>1 to 2 litres an hour</b>. But sweat only cools when it <b>evaporates</b>. In humid air it can’t dry, drips off and cools you very little. A breeze helps by carrying damp air away: see the cooling chapter of <a href="/fanclear/#cooling">FanClear</a>. Heat always flows from hot to cold, as <a href="/thermoclear/">ThermoClear</a> shows (a future HeatClear box will dig into heat transfer).</p>
    <p>Scientists combine heat and humidity into the <b>wet-bulb temperature</b>. Above about <b>35 °C</b> wet-bulb, even a healthy person resting in the shade can’t cool down, and lab tests suggest the real limit is lower, about 31 °C. Humid heat waves in India make this very real, so rest, shade and water matter. <b>Goosebumps</b> are the arrector pili standing hairs up: in furry animals that traps warm air; in us it is a leftover.</p>
    <p class="tip"><b>Try it:</b> set a hot, dry day, then raise the humidity until sweat can’t keep up. Switch on a breeze. Then drop to 10 °C and watch the vessels narrow and the goosebumps rise.</p>`,
  terms: [
    { t: 'Vasodilation', d: 'Blood vessels widening, which sends more warm blood to the skin to lose heat.' },
    { t: 'Vasoconstriction', d: 'Blood vessels narrowing, which keeps warm blood away from the skin in the cold.' },
    { t: 'Latent heat', d: 'The heat needed to turn a liquid into vapour without warming it: about 2,400 J for each gram of sweat.' },
    { t: 'Evaporation', d: 'Liquid turning into vapour. It carries heat away, but slows down when the air is already humid.' },
    { t: 'Wet-bulb temperature', d: 'The temperature a wet thermometer reaches as water evaporates from it. It combines heat and humidity.' },
    { t: 'Goosebumps', d: 'Little bumps made when arrector pili muscles pull hairs upright, triggered by cold or strong feelings.' },
  ],
  defaults: { T: 34, RH: 45, act: 'walk', breeze: false, labels: true },
  controls: [
    { key: 'T', type: 'range', label: 'Air temperature', min: 0, max: 50, step: 0.5, ends: ['0 °C', '50 °C'], fmt: (v) => v.toFixed(0) + ' °C' },
    { key: 'RH', type: 'range', label: 'Humidity', min: 10, max: 100, step: 1, ends: ['dry', 'muggy'], fmt: (v) => Math.round(v) + '%' },
    { key: 'act', type: 'seg', label: 'What you are doing', options: Object.entries(ACT).map(([v, a]) => ({ v, label: a.name })) },
    { key: 'breeze', type: 'toggle', label: 'A breeze (about 1.5 m/s)' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Why does sweat cool you?', options: ['It is cold when it comes out', 'Evaporating it takes heat from your skin', 'It blocks sunlight', 'It makes your blood thinner'], answer: 1, why: 'Sweat comes out warm. Each gram that evaporates carries away about 2,400 J of heat.' },
    { q: 'Why is humid heat more dangerous than dry heat at the same temperature?', options: ['Humid air is heavier', 'Sweat can’t evaporate well, so it doesn’t cool you', 'Humidity stops you sweating', 'It isn’t more dangerous'], answer: 1, why: 'When the air is already full of water vapour, sweat drips off instead of evaporating, so little heat leaves.' },
    { q: 'What happens to skin blood vessels in the cold?', options: ['They widen', 'They narrow to keep warm blood deep inside', 'They disappear', 'Nothing'], answer: 1, why: 'Vasoconstriction keeps warm blood in the core, which is why fingers go pale and cold.' },
  ],
  reel: [
    { ms: 5400, caption: 'Sweat cools only when it evaporates: each gram carries away about 2,400 joules of heat.', set: { RH: 35, act: 'walk', breeze: false, labels: false }, anim: { T: [28, 40] }, view: { pos: [2.8, 6.2, 10.5], target: [0, 3.2, 0] }, spin: 0.2 },
    { ms: 5400, caption: 'In humid heat sweat just drips, and above a wet-bulb of about 35 °C even resting in shade can’t cool you.', set: { T: 38, act: 'rest', breeze: false, labels: false }, anim: { RH: [40, 95] }, view: { pos: [-2.2, 5.6, 16], target: [-3.4, 2.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.9; stage.root.add(root);
    const sk = makeSkinBlock(stage, { tone: 6 }); root.add(sk.root);
    const st = { T: 34, RH: 45, act: 'walk', breeze: false };
    const map = canvasTexture(760, 600, (g, w, h) => drawMap(g, w, h, st));
    const brd = board(map, 3.9, 3.08); brd.position.set(-5.2, 1.62, 1.6); brd.rotation.set(-0.1, 0.22, 0); stage.root.add(brd);
    // Sweat beads at the pores, vapour rising, drips falling off the front edge.
    const P = sk.pores;
    const beads = swarm(P.length, new THREE.SphereGeometry(1, 16, 10).scale(1, 0.6, 1), tissue(0xbfe6ff, { roughness: 0.05, clearcoat: 1, opacity: 0.85, emissive: new THREE.Color(0x3a6f99), emissiveIntensity: 0.4 }));
    root.add(beads);
    const NV = 90, vap = swarm(NV, new THREE.SphereGeometry(0.05, 8, 6), M.ghost(0xbfe8ff, 0.55)); vap.frustumCulled = false; root.add(vap);
    const ND = 14, drips = swarm(ND, new THREE.SphereGeometry(0.07, 10, 8), tissue(0xbfe6ff, { roughness: 0.05, clearcoat: 1, opacity: 0.85, emissive: new THREE.Color(0x3a6f99), emissiveIntensity: 0.4 })); drips.frustumCulled = false; root.add(drips);
    // Red blood cells along the superficial plexus: more and faster when the vessels open.
    const NB = 40, rbc = swarm(NB, new THREE.CylinderGeometry(0.035, 0.035, 0.015, 12), M.glow(0xff4a4a)); rbc.frustumCulled = false; root.add(rbc);
    const labs = {
      sweat: tint(stage.label('Sweat beads at each pore', [1.2, Y.surf + 0.55, FRONT + 0.3], root), 'sweat'),
      vap: tint(stage.label('Evaporation carries heat away', [1.9, Y.surf + 1.7, FRONT], root), 'sweat'),
      vessel: tint(stage.label('', [0.3, 2.35, FRONT + 0.4], root), 'blood'),
      gland: tint(stage.label('Sweat gland', [1.4, 1.6, FRONT + 0.3], root), 'sweat'),
      goose: tint(stage.label('Arrector pili pulls: a goosebump', [-2.0, Y.surf + 0.7, FRONT + 0.3], root), 'muscle'),
    };
    let vaso = 0, er = 0, ev = 0, bead = 0, t = 0;
    const fit = fitNarrow(stage, { pos: [-2.0, 6.4, 13.5], target: [-2.6, 3.0, 0] });
    let lastKey = '';
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const h = heat(s.T, s.RH, s.act, s.breeze);
        vaso = approach(vaso, h.vaso, 2, dt);
        sk.setFlush(vaso);
        const erT = h.cold ? clamp((-h.Ereq - 25) / 120, 0, 1) : 0;
        const ne = approach(er, erT, 3, dt);
        if (Math.abs(ne - er) > 0.004 || (erT === 0 && er > 0 && er < 0.004)) { er = ne < 0.004 ? 0 : ne; sk.setErect(er); }
        // Sweat on the surface: grows with sweat rate; big beads and drips when it can't evaporate.
        const evap = h.Ereq > 0 ? Math.min(h.Ereq, h.Emax) : 0;
        ev = approach(ev, evap, 2, dt);
        bead = approach(bead, h.Ereq > 25 ? clamp(h.sweat / 900, 0.15, 1) * (h.over ? 1.5 : 0.9) : 0, 1.5, dt);
        P.forEach(([x, z], i) => beads.place(i, [x, sk.surfY(x, z) + 0.02, z], null, 0.14 * bead * (0.8 + 0.4 * rnd(i))));
        beads.done(); beads.visible = bead > 0.02;
        const nv = Math.round(clamp(ev / 500, 0, 1) * NV);
        for (let i = 0; i < NV; i++) {
          if (i >= nv) { vap.place(i, [0, -50, 0]); continue; }
          const [x, z] = P[i % P.length], a = (t * 0.45 + rnd(i)) % 1;
          vap.place(i, [x + Math.sin(a * 6 + i) * 0.25 + a * 0.4, Y.surf + 0.1 + a * 2.2, z + Math.cos(a * 5 + i) * 0.2], null, 1 - a * 0.6);
        }
        vap.done();
        for (let i = 0; i < ND; i++) {
          if (!h.over || bead < 0.6) { drips.place(i, [0, -50, 0]); continue; }
          const a = (t * 0.5 + rnd(i + 3)) % 1, x = -2.8 + 5.6 * rnd(i + 7);
          drips.place(i, [x, Y.surf - a * 4.3, FRONT + 0.12], null, 1);
        }
        drips.done();
        const flow = skinFlow(vaso), nb = Math.round(clamp(0.15 + vaso * 0.85, 0.05, 1) * NB);
        for (let i = 0; i < NB; i++) {
          if (i >= nb) { rbc.place(i, [0, -50, 0]); continue; }
          const u = ((t * (0.2 + flow * 0.12) + i / NB) % 1), x = -3 + 6 * u;
          rbc.place(i, [x, 3.28 + 0.03 * Math.sin(x * 2.6), FRONT + 0.06], [Math.PI / 2, 0, 0], 1);
        }
        rbc.done();
        // Board.
        const key = `${Math.round(s.T * 2)}|${Math.round(s.RH)}|${s.act}|${s.breeze}`;
        if (key !== lastKey) { lastKey = key; Object.assign(st, { T: s.T, RH: s.RH, act: s.act, breeze: s.breeze }); map.redraw(); }
        const narrow = fit();
        Object.values(labs).forEach((l) => { l.visible = s.labels && !narrow; });
        labs.sweat.visible = labs.sweat.visible && bead > 0.1;
        labs.vap.visible = labs.vap.visible && nv > 10;
        labs.goose.visible = labs.goose.visible && er > 0.3;
        labs.vessel.element.innerHTML = vaso > 0.25 ? 'Vessels widen: warm blood to the surface' : vaso < -0.25 ? 'Vessels narrow: blood kept deep' : 'Blood vessels';
      },
      readout: (s) => {
        const h = heat(s.T, s.RH, s.act, s.breeze), S = stateOf(h);
        const sweat = h.Ereq > 25 ? `${Math.round(h.sweat / 10) * 10} mL an hour` : 'barely any';
        return `<div class="big" style="color:${S.col}">${S.text}</div>
          <div class="row"><span>Heat your body makes</span><b>about ${Math.round(h.M)} W</b></div>
          <div class="row"><span>${h.dry >= 0 ? 'Heat lost without sweating' : 'Heat soaked up from hot air'}</span><b>${Math.round(Math.abs(h.dry))} W</b></div>
          <div class="row"><span>Sweat needed</span><b>${sweat}</b></div>
          <div class="row"><span>Most evaporation can remove</span><b>${Math.round(h.Emax)} W</b></div>
          <div class="row"><span>Wet-bulb temperature</span><b>${h.Tw.toFixed(1)} °C</b></div>
          <div class="row"><span>Skin blood flow (whole body)</span><b>${h.vaso < -0.6 ? 'near zero' : 'about ' + skinFlow(h.vaso).toFixed(1) + ' L/min'}</b></div>
          <small>Bare skin in the shade, simple heat balance: each gram of sweat that dries removes about 2,400 J. Real bodies, clothes and sun change the numbers.</small>`;
      },
    });
  },
};
