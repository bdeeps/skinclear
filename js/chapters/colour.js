// Chapter 5: colour and sun. Melanin, UV light, tanning, vitamin D, sunburn and sunscreen.
// Facts:
//  - Melanocytes make melanin in melanosomes and hand them to keratinocytes. People of all skin
//    colours have similar numbers of melanocytes; tone depends on how much melanin, which kind
//    (brown-black eumelanin or red-yellow pheomelanin) and how the melanosomes are packed
//    (Costin & Hearing, FASEB J 21:976, 2007; NIH MedlinePlus Genetics "Skin color").
//  - UV-B is 280–315 nm, UV-A 315–400 nm; visible light 400–700 nm; X-rays are about 0.01–10 nm
//    (WHO, "Ultraviolet radiation" fact sheet; ICNIRP). About 95% of the UV reaching the ground
//    is UV-A (WHO). UV-B mostly stops in the epidermis; UV-A reaches deeper into the dermis.
//  - How much UV gets through the epidermis into the dermis: about 29% of UV-B and about 55% of
//    UV-A for lightly pigmented (white) skin, about 6% of UV-B and about 18% of UV-A for deeply
//    pigmented (Black) skin (Kaidbey et al., "Photoprotection by melanin: a comparison of black
//    and Caucasian skin", J Am Acad Dermatol 1:249, 1979). Values in between are interpolated
//    on a log scale across the Monk scale: a rough illustration only.
//  - UV index (WHO, "Global Solar UV Index: A Practical Guide", 2002): 1 unit = 25 mW/m² of
//    sunburn-weighted UV. Categories: 0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+
//    extreme. 1 standard erythema dose (SED) = 100 J/m², so UVI × 0.45 = SED in 30 minutes.
//  - Indian cities often reach UV index 10 to 12+ around summer noon; satellite data 2002–2012
//    gave maxima of about 15 for Delhi and Chennai (Gogoi et al., "Annual variability and
//    distribution of ultraviolet index over India using TEMIS data", 2015). In the UK the UV
//    index rarely goes above 8 (UK Met Office).
//  - SPF: the fraction of sunburning UV that gets through is about 1/SPF, when applied at the lab
//    amount of 2 mg/cm² (ISO 24444; US FDA). SPF 15 ≈ 93%, 30 ≈ 97%, 50 ≈ 98% blocked. Most
//    people apply less. UV-A protection is rated separately ("broad spectrum", UVA-PF).
//  - Vitamin D3 is made in the epidermis when UV-B (about 290–315 nm) turns 7-dehydrocholesterol
//    into previtamin D3 (Holick, N Engl J Med 357:266, 2007; NIH Office of Dietary Supplements).
//  - Tanning: UV damage signals melanocytes to make more melanin over days; a tan gives only
//    modest protection (AAD, "Tanning"; Skin Cancer Foundation).
//  - Skin colour evolved with UV: darker skin protects folate from UV where sun is strong;
//    lighter skin lets enough UV-B in for vitamin D where it is weak (Jablonski & Chaplin,
//    J Hum Evol 39:57, 2000). The Fitzpatrick scale (1975) sorts skin by sun reaction, not colour.
import { THREE, M, canvasTexture, swarm, clamp, lerp, approach } from '../kit.js';
import { makeSkinBlock, tint, board, fitNarrow, compactReadout, panel, rnd, tissue, TONES, toneColor, FRONT, Y, W, D } from '../skin.js';

export const uvCat = (u) => (u < 3 ? ['Low', '#5ce1a9'] : u < 6 ? ['Moderate', '#ffd166'] : u < 8 ? ['High', '#ffb547'] : u < 11 ? ['Very high', '#ff6b6b'] : ['Extreme', '#c49bff']);
const mel = (tone) => clamp((tone - 2) / 7, 0, 1);
const logLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
export const transB = (tone) => logLerp(0.294, 0.057, mel(tone));      // UV-B into the dermis (Kaidbey 1979)
export const transA = (tone) => logLerp(0.555, 0.175, mel(tone));      // UV-A into the dermis
const SPF = { 0: 'None', 15: 'SPF 15', 30: 'SPF 30', 50: 'SPF 50' };

function drawBoard(g, w, h, st) {
  panel(g, w, h, 'Sunlight, UV and your skin');
  // Spectrum strip (log wavelength).
  const L = 30, R = w - 30, X = (nm) => L + ((Math.log10(nm) - Math.log10(0.01)) / (Math.log10(1000) - Math.log10(0.01))) * (R - L);
  const y0 = 70;
  [[0.01, 10, '#7a8699', 'X-rays'], [10, 280, '#6b4fb0', ''], [280, 315, '#9b59ff', 'UV-B'], [315, 400, '#c9a7ff', 'UV-A'], [400, 700, 'grad', 'visible'], [700, 1000, '#7a2222', '']].forEach(([a, b, c, n]) => {
    if (c === 'grad') { const gr = g.createLinearGradient(X(a), 0, X(b), 0); ['#8a2be2', '#2f6bff', '#2fd06b', '#ffe12f', '#ff8a2f', '#ff2f2f'].forEach((cc, i) => gr.addColorStop(i / 5, cc)); g.fillStyle = gr; } else g.fillStyle = c;
    g.fillRect(X(a), y0, X(b) - X(a), 26);
    if (n) { g.fillStyle = '#fff'; g.font = '600 16px sans-serif'; g.fillText(n, n === 'UV-B' ? X(a) - 42 : n === 'UV-A' ? X(a) + 2 : X(a) + 6, y0 + 46); }
  });
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '14px sans-serif'; g.fillText('← shorter wavelength, more energy per photon', L, y0 + 66);
  // UV index scale.
  const uy = 170, UL = 30, UR = w - 30, U = (u) => UL + (u / 14) * (UR - UL);
  g.fillStyle = '#e8ecf4'; g.font = '600 20px sans-serif'; g.fillText('UV index (WHO)', UL, uy - 8);
  for (let u = 0; u < 14; u++) { g.fillStyle = uvCat(u + 0.5)[1]; g.fillRect(U(u) + 1, uy, U(1) - U(0) - 2, 30); g.fillStyle = '#111'; g.font = '600 15px sans-serif'; g.fillText(u + 1, U(u) + 10, uy + 21); }
  [[7, 'London, June'], [11, 'Delhi, May noon'], [12.5, 'Chennai, summer']].forEach(([u, n], i) => {
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(U(u), uy + 32); g.lineTo(U(u), uy + 44 + i * 18); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '15px sans-serif'; const tw = g.measureText(n).width; g.fillText(n, Math.min(U(u) - tw / 2, UR - tw), uy + 58 + i * 18);
  });
  const ux = U(st.uvi); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(ux, uy - 2); g.lineTo(ux - 9, uy - 16); g.lineTo(ux + 9, uy - 16); g.fill();
  // Sunscreen bars.
  const sy = 330;
  g.fillStyle = '#e8ecf4'; g.font = '600 20px sans-serif'; g.fillText('Sunscreen: share of sunburning UV blocked (lab test)', 30, sy);
  [15, 30, 50].forEach((spf, i) => {
    const y = sy + 18 + i * 34, frac = 1 - 1 / spf, on = +st.spf === spf;
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(140, y, w - 250, 24);
    g.fillStyle = on ? '#ffd166' : 'rgba(255,209,102,.45)'; g.fillRect(140, y, (w - 250) * frac, 24);
    g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.75)'; g.font = (on ? '600 ' : '') + '18px sans-serif';
    g.fillText('SPF ' + spf, 40, y + 19); g.fillText((frac * 100).toFixed(1) + '%', w - 100, y + 19);
  });
  // Monk scale.
  const my = 480;
  g.fillStyle = '#e8ecf4'; g.font = '600 20px sans-serif'; g.fillText('The Monk Skin Tone Scale: 10 shades, all normal', 30, my);
  const sw = (w - 60) / 10;
  TONES.forEach((c, i) => { g.fillStyle = c; g.fillRect(30 + i * sw + 2, my + 14, sw - 4, 48); });
  const k = clamp(st.tone, 1, 10) - 1; g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(30 + Math.round(k) * sw, my + 11, sw, 54);
  g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '15px sans-serif'; g.fillText('Same number of melanocytes; different amount and kind of melanin.', 30, my + 86);
}

export default {
  id: 'colour',
  short: 'Colour and sun',
  title: 'Melanin, the skin’s own sunshade',
  subtitle: 'Why skin comes in every shade, how UV burns and tans, and what SPF really means.',
  view: { pos: [0.6, 7.2, 13.4], target: [-2.5, 3.8, 0] },
  learn: `<p>Every person has about the same number of <b>melanocytes</b>. Skin colour comes from <b>how much melanin</b> they make and <b>which kind</b>: brown-black <b>eumelanin</b> or red-yellow <b>pheomelanin</b>. Melanocytes pack it into tiny grains and pass them to nearby skin cells, where it sits over the nucleus like a little umbrella.</p>
    <p>Melanin absorbs <b>ultraviolet (UV)</b> light, which is just beyond violet on the spectrum: more energetic than visible light, far less than the X-rays in <a href="/xrayclear/">XrayClear</a>. <b>UV-B</b> mostly stops in the epidermis, causes <b>sunburn</b> and damages DNA. <b>UV-A</b> goes deeper into the dermis and ages skin. Light skin lets roughly five times more UV-B into the dermis than deeply pigmented skin. Sun exposure makes melanocytes produce more melanin: a <b>tan</b>, which protects only a little. UV-B is also useful: it makes <b>vitamin D</b> in the epidermis.</p>
    <p>The <b>UV index</b> tells you how strong the sunburning UV is. Around summer noon, Indian cities often reach <b>10 to 12 or more</b>, “very high” to “extreme”. <b>SPF 30</b> sunscreen, used thickly as in the lab, blocks about <b>97%</b> of sunburning UV (1 in 30 gets through). Everyone can burn, and every skin tone can get skin cancer, so for your own skin, ask a doctor or dermatologist.</p>
    <p>Why so many shades? Our ancestors lived under Africa’s strong sun, where dark skin protects <b>folate</b>, a vitamin vital for healthy babies. As people moved to places with weaker sun, lighter skin let enough UV-B in to make vitamin D (<b>Nina Jablonski</b> and George Chaplin, 2000). India, with its sunny south, high mountains and long history of people mixing, has nearly the whole range. Skin colour is an <b>adaptation to sunlight</b>. It says nothing about anyone’s worth. Doctors also use the <b>Fitzpatrick scale</b> (1975), which sorts skin by how it reacts to sun, not by colour.</p>
    <p class="tip"><b>Try it:</b> move through all ten shades at a UV index of 11 and watch how far the UV-B (violet) gets. Add sunscreen, then turn the UV index down to see vitamin D (gold sparks) slow.</p>`,
  terms: [
    { t: 'Melanin', d: 'The pigment that colours skin, hair and eyes. Eumelanin is brown-black; pheomelanin is red-yellow.' },
    { t: 'UV-B', d: 'Short-wave ultraviolet light (280 to 315 nm). It causes sunburn and makes vitamin D.' },
    { t: 'UV-A', d: 'Longer-wave ultraviolet light (315 to 400 nm). It reaches deeper and ages the skin.' },
    { t: 'UV index', d: 'A number from the WHO that tells how strong sunburning UV is: 11 or more is extreme.' },
    { t: 'SPF', d: 'Sun protection factor. With SPF 30 applied as in the lab, about 1/30 of sunburning UV gets through.' },
    { t: 'Folate', d: 'A B vitamin that UV can break down. It is vital for making DNA and for healthy babies.' },
  ],
  defaults: { tone: 5, uvi: 11, spf: 0, tan: false, labels: true },
  controls: [
    { key: 'tone', type: 'range', label: 'Skin tone (Monk scale)', min: 1, max: 10, step: 1, ends: ['1', '10'], fmt: (v) => 'shade ' + Math.round(v) + ' of 10' },
    { key: 'uvi', type: 'range', label: 'UV index', min: 0, max: 14, step: 0.5, ends: ['night', 'extreme'], fmt: (v) => v.toFixed(0) + ' · ' + uvCat(v)[0] },
    { key: 'spf', type: 'seg', label: 'Sunscreen', options: Object.entries(SPF).map(([v, label]) => ({ v: +v, label })) },
    { key: 'tan', type: 'toggle', label: 'After some days in the sun (tanned)' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Why do people have different skin colours?', options: ['Different numbers of melanocytes', 'Melanocytes make different amounts and kinds of melanin', 'Different blood colour', 'Different thickness of fat'], answer: 1, why: 'Everyone has similar numbers of melanocytes. The amount and type of melanin they make sets the tone.' },
    { q: 'About how much sunburning UV does SPF 30 block when applied as in the lab?', options: ['30%', 'About 97%', '100%', 'About 50%'], answer: 1, why: 'About 1/30 of sunburning UV gets through, so about 97% is blocked. Most people apply less than the lab amount.' },
    { q: 'What does UV-B do in the skin that is useful?', options: ['Makes vitamin D', 'Makes sweat', 'Grows hair', 'Nothing useful'], answer: 0, why: 'UV-B turns a cholesterol-like molecule in the epidermis into previtamin D3.' },
  ],
  reel: [
    { ms: 5600, caption: 'Everyone has about the same number of melanocytes. Skin tone is how much melanin they make.', set: { uvi: 11, spf: 0, tan: false, labels: false }, anim: { tone: [1, 10] }, view: { pos: [3.0, 6.2, 10.8], target: [0, 3.0, 0] }, spin: 0.2 },
    { ms: 5200, caption: 'Indian summers often hit UV index 11 or more. SPF 30, used thickly, blocks about 97% of sunburning UV.', set: { tone: 6, uvi: 12, tan: false, labels: false, spf: 30 }, view: { pos: [-2.8, 6.6, 15.6], target: [-3.6, 3.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.9; stage.root.add(root);
    const sk = makeSkinBlock(stage, { tone: 5 }); root.add(sk.root);
    const bst = { tone: 5, uvi: 11, spf: 0 };
    const tex = canvasTexture(760, 600, (g, w, h) => drawBoard(g, w, h, bst));
    const brd = board(tex, 3.9, 3.08); brd.position.set(-5.3, 1.6, 1.6); brd.rotation.set(-0.1, 0.22, 0); stage.root.add(brd);
    // Sunscreen film.
    const film = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), tissue(0xffffff, { opacity: 0.45, depthWrite: false, roughness: 0.2 })); film.position.y = Y.surf + 0.06; root.add(film);
    // UV photons coming in from the sun, upper left.
    const dir = new THREE.Vector3(0.35, -1, -0.12).normalize();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    const rot = [e.x, e.y, e.z];
    const NP = 44;
    const geo = new THREE.CapsuleGeometry(0.035, 0.28, 4, 8);
    const uvb = swarm(NP, geo, M.glow(0x9b59ff)), uva = swarm(NP, geo, M.glow(0xd6c2ff));
    const NDv = 24, vitd = swarm(NDv, new THREE.OctahedronGeometry(0.06), M.glow(0xffd166));
    const NH = 60, hits = swarm(NH, new THREE.SphereGeometry(0.05, 8, 6), M.glow(0xffffff));
    [uvb, uva, vitd, hits].forEach((m) => { m.frustumCulled = false; root.add(m); });
    const labs = {
      uvb: tint(stage.label('UV-B: mostly stopped in the epidermis', [2.0, 6.2, 0], root), 'uv'),
      uva: tint(stage.label('UV-A: reaches deeper, into the dermis', [2.6, 2.4, FRONT + 0.3], root), 'uv'),
      mel: tint(stage.label('Melanocytes hand melanin to skin cells', [-0.7, Y.derm - 0.35, FRONT + 0.3], sk.G.epi), 'gold'),
      d: tint(stage.label('Vitamin D made here', [1.2, Y.surf + 0.45, FRONT + 0.3], root), 'gold'),
      film: tint(stage.label('Sunscreen film', [-1.8, Y.surf + 0.45, FRONT], root), 'side'),
    };
    let t = 0, tone = 5, lastKey = '';
    const P = (i, cyc, typeB, s, tn) => {
      // Where photon i stops this cycle.
      const r1 = rnd(i * 7.3 + cyc * 1.91 + (typeB ? 3 : 0)), r2 = rnd(i * 3.1 + cyc * 5.7);
      const spf = +s.spf, pass = spf ? (typeB ? 1 / spf : Math.min(1, 3 / spf)) : 1;
      const x = -2.6 + 5.2 * rnd(i * 1.7 + cyc), z = -1.6 + 3.5 * rnd(i * 2.3 + cyc * 0.7);
      let y, where;
      if (r1 > pass) { y = Y.surf + 0.08; where = 'film'; }
      else {
        const T = typeB ? transB(tn) : transA(tn);
        if (r2 < T) { y = typeB ? 3.25 + 0.25 * rnd(i + cyc) : 2.1 + 1.2 * rnd(i + cyc); where = 'dermis'; }
        else { y = Y.derm + 0.35 * (0.2 + 0.8 * rnd(i * 5 + cyc)); where = 'epi'; }
      }
      return { x, y, z, where };
    };
    const fit = fitNarrow(stage, { pos: [-1.8, 6.8, 13.5], target: [-2.6, 3.2, 0] });
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const target = Math.min(10, s.tone + (s.tan ? 1 : 0));
        tone = approach(tone, target, 4, dt);
        sk.setTone(tone);
        film.visible = +s.spf > 0;
        const key = `${Math.round(tone * 4)}|${s.uvi}|${s.spf}`;
        if (key !== lastKey) { lastKey = key; Object.assign(bst, { tone: target, uvi: s.uvi, spf: s.spf }); tex.redraw(); }
        // Photon count follows the UV index; each flies for 1.6 s then a new one starts.
        const n = Math.round(clamp(s.uvi / 12, 0, 1.15) * (NP - 4));
        let nh = 0, nd = 0;
        [[uvb, true], [uva, false]].forEach(([mesh, B]) => {
          for (let i = 0; i < NP; i++) {
            if (i >= n) { mesh.place(i, [0, -50, 0]); continue; }
            const ph = (t / 1.6 + rnd(i + (B ? 50 : 0))), cyc = Math.floor(ph), u = ph - cyc;
            const p = P(i, cyc, B, s, tone);
            const L = 6.5 - p.y + 2;
            const k = Math.min(1, u / 0.75);
            const pos = [p.x - dir.x * L * (1 - k), p.y - dir.y * L * (1 - k), p.z - dir.z * L * (1 - k)];
            if (u < 0.75) mesh.place(i, pos, rot, 1);
            else {
              mesh.place(i, [0, -50, 0]);
              if (nh < NH) hits.place(nh++, [p.x, p.y, p.z], null, 1.4 - (u - 0.75) * 4);
              if (B && p.where === 'epi' && p.y < Y.surf - Y.corn - 0.02 && nd < NDv) vitd.place(nd++, [p.x, p.y + (u - 0.75) * 1.2, p.z], [t * 3, t * 2, 0], 1.3);
            }
          }
          mesh.done();
        });
        for (let i = nh; i < NH; i++) hits.place(i, [0, -50, 0]);
        for (let i = nd; i < NDv; i++) vitd.place(i, [0, -50, 0]);
        hits.done(); vitd.done();
        const narrow = fit();
        Object.values(labs).forEach((l) => { l.visible = s.labels && !narrow; });
        labs.film.visible = labs.film.visible && +s.spf > 0;
        labs.d.visible = labs.d.visible && s.uvi > 1;
      },
      readout: (s) => {
        const tn = Math.min(10, s.tone + (s.tan ? 1 : 0)), spf = +s.spf, [cat, col] = uvCat(s.uvi);
        const b = transB(tn) * 100 / (spf || 1), a = transA(tn) * 100 / (spf ? Math.max(1, spf / 3) : 1);
        return `<div class="big">UV index ${s.uvi.toFixed(0)}: <span style="color:${col}">${cat}</span></div>
          <div class="row"><span>UV-B getting into the dermis</span><b>about ${b < 1 ? b.toFixed(1) : Math.round(b)}%</b></div>
          <div class="row"><span>UV-A getting into the dermis</span><b>about ${a < 1 ? a.toFixed(1) : Math.round(a)}%</b></div>
          <div class="row"><span>Sunburning UV in 30 min, at the surface</span><b>${(s.uvi * 0.45).toFixed(1)} SED</b></div>
          <div class="row"><span>Sunscreen blocks (lab)</span><b>${spf ? (100 - 100 / spf).toFixed(0) + '% of UV-B' : 'none'}</b></div>
          <small>Shares of UV through the epidermis from Kaidbey et al. (1979), interpolated: a rough guide. Every skin tone can burn: for your own skin, ask a doctor or dermatologist.</small>`;
      },
    });
  },
};
