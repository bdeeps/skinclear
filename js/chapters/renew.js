// Chapter 2: the renewing barrier. A close-up of the epidermis, cell by cell.
// Facts:
//  - Keratinocytes are born in the basal layer, rise through the spinous and granular layers,
//    lose their nuclei and flatten into dead corneocytes (keratin-filled "bricks") held together
//    by lipid "mortar" (ceramides, cholesterol, fatty acids), then flake off. The "bricks and
//    mortar" model is Elias's (J Invest Dermatol 80:44s, 1983).
//  - Transit takes about 4 weeks in young adults: roughly 2 weeks through the living layers and
//    2 through the stratum corneum (Hoath & Leahy, J Invest Dermatol 121:1440, 2003); it slows
//    with age. Many sources give 28 to 40+ days.
//  - The epidermis has no blood vessels; its cells are fed by diffusion from capillaries in the
//    dermal papillae.
//  - Water loss by diffusion through intact skin ("insensible perspiration") is about 300 to
//    400 mL a day; when the stratum corneum is lost, as after big burns, it can rise about
//    tenfold, to 3 to 5 L a day (Guyton & Hall, 14th ed., ch. 25).
//  - An adult sheds about 0.03 to 0.09 g of skin flakes an hour, roughly 500 million cells a
//    day (Weschler et al., Environ Sci Technol 45:3872, 2011). Flakes are one part of house dust;
//    a US study found about 60% of house dust came from indoor sources (skin, fibres and more)
//    and 40% from soil tracked in (Layton & Beamer, Environ Sci Technol 43:8199, 2009), so "dust
//    is mostly dead skin" is an exaggeration.
import { THREE, M, clamp, lerp, smooth } from '../kit.js';
import { tint, fitNarrow, compactReadout, rnd, tissue, C, toneColor } from '../skin.js';

export const T = 28;                                   // days from birth to shedding (illustrative)
const K = 14;                                          // cells in a column at one time
// Stage boundaries as fractions of the journey, and cell heights in each stage (units).
const STAGES = [
  { id: 'basal', name: 'Basal layer', to: 0.07, h: 0.5, w: 0.5 },
  { id: 'spinous', name: 'Spinous layer', to: 0.43, h: 0.42, w: 0.6 },
  { id: 'granular', name: 'Granular layer', to: 0.5, h: 0.28, w: 0.74 },
  { id: 'corneum', name: 'Stratum corneum', to: 1, h: 0.1, w: 0.98 },
];
const stageOf = (f) => STAGES.find((s) => f < s.to) || STAGES[3];
// Height of a cell's centre for journey fraction f: the stack of cells below it.
const Yof = (() => {
  const tab = []; let y = 0;
  for (let i = 0; i <= 400; i++) { const f = i / 400; tab.push(y); y += K * stageOf(f).h * (1 / 400); }
  return (f) => { const k = clamp(f, 0, 1) * 400, i = Math.min(399, Math.floor(k)); return lerp(tab[i], tab[i + 1], k - i); };
})();
const TOP = Yof(1);
const NX = 13, NZ = 4, DX = 0.6, DZ = 0.62;
const stageName = (d) => (d >= T ? 'shed as a flake' : stageOf(d / T).name.toLowerCase());

export default {
  id: 'renew',
  short: 'A skin that renews',
  title: 'A wall that rebuilds itself',
  subtitle: 'New cells rise, flatten and die into bricks and mortar, then flake away, about every 4 weeks.',
  view: { pos: [2.4, 4.4, 11.6], target: [-1.6, 2.4, 0] },
  learn: `<p>The outer skin you touch is <b>dead</b>. It is made in the <b>basal layer</b> at the bottom of the epidermis, where cells called <b>keratinocytes</b> divide. Each new cell is pushed upwards by the ones born under it.</p>
    <p>As it rises, it changes. In the <b>spinous layer</b> it fills with tough <b>keratin</b> fibres. In the <b>granular layer</b> it makes waxy fats and loses its nucleus. By the top it has died and flattened into a <b>corneocyte</b>, a thin plate of keratin. Thousands of these plates stack like <b>bricks</b>, glued by fatty <b>mortar</b>: the <b>stratum corneum</b>. After about <b>4 weeks</b> from birth (longer as we age) a cell flakes off.</p>
    <p>This brick wall is the <b>barrier</b>. It stops you drying out: only about 300 to 400 mL of water a day seeps through healthy skin. Lose it, as after a big burn, and water loss can rise about <b>tenfold</b>. It also keeps most germs out. Water moving across layers like this is <b>osmosis</b> and diffusion, the subject of a future OsmosisClear box.</p>
    <p>You shed roughly <b>500 million</b> skin cells a day. They are part of house dust, but the popular claim that dust is <i>mostly</i> skin is exaggerated: much of it is soil, fibres and other bits.</p>
    <p class="tip"><b>Try it:</b> run the clock and follow the gold cell from the basal layer to the day it flakes off. Then scrape off the barrier and watch water escape and germs get in.</p>`,
  terms: [
    { t: 'Keratinocyte', d: 'The main cell of the epidermis. It makes keratin and ends its life as a flat, dead corneocyte.' },
    { t: 'Keratin', d: 'A tough, stringy protein. It fills the outer skin cells and also makes hair and nails.' },
    { t: 'Corneocyte', d: 'A dead, flattened skin cell with no nucleus: a "brick" in the stratum corneum.' },
    { t: 'Lipid mortar', d: 'Waxy fats (ceramides, cholesterol and fatty acids) between the corneocytes that seal the barrier.' },
    { t: 'Basement membrane', d: 'A thin sheet that joins the epidermis to the dermis. The basal cells sit on it.' },
    { t: 'Barrier', d: 'The stratum corneum’s job of keeping water in and germs and irritants out.' },
  ],
  defaults: { weeks: 0.3, play: true, barrier: 'healthy', labels: true },
  controls: [
    { key: 'weeks', type: 'range', label: 'Time since the gold cell was born', min: 0, max: 5, step: 0.01, ends: ['born', '5 weeks'], fmt: (v) => `day ${Math.round(v * 7)}` },
    { key: 'play', type: 'toggle', label: 'Run the clock (1 s = 1 day)' },
    { key: 'barrier', type: 'seg', label: 'The barrier', options: [{ v: 'healthy', label: 'Healthy' }, { v: 'scraped', label: 'Scraped off' }] },
    { key: 'again', type: 'buttons', label: 'Clock', items: [{ label: 'Follow a new cell', act: (s) => { s.weeks = 0; s.play = true; } }] },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Where are new skin cells made?', options: ['On the surface', 'In the basal layer at the bottom of the epidermis', 'In the fat', 'In the blood'], answer: 1, why: 'Cells divide in the basal layer, then are pushed up as newer cells form beneath them.' },
    { q: 'What is the stratum corneum mostly made of?', options: ['Living cells full of blood', 'Flat dead cells of keratin glued with fats', 'Sweat', 'Collagen fibres'], answer: 1, why: 'Dead corneocytes are the bricks and fats are the mortar. Together they form the barrier.' },
    { q: 'About how long does a cell take to go from birth to flaking off?', options: ['About a day', 'About 4 weeks', 'About a year', 'It never flakes off'], answer: 1, why: 'Roughly 2 weeks through the living layers and 2 through the stratum corneum, and longer as we age.' },
  ],
  reel: [
    { ms: 5600, caption: 'The skin you touch is dead: cells born at the bottom rise, flatten and die into a brick wall.', set: { play: false, barrier: 'healthy', labels: false }, anim: { weeks: [0.1, 3.6] }, view: { pos: [3.2, 4.2, 10.2], target: [0, 2.0, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.7; stage.root.add(root);
    const W = NX * DX, D = NZ * DZ;
    // Dermis below with a capillary loop in a papilla: the epidermis has no vessels of its own.
    const derm = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.9, D + 0.2), tissue(C.derm)); derm.position.y = -0.47; root.add(derm);
    const bm = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.04, D + 0.2), tissue(0x9fb4d8)); bm.position.y = -0.0; root.add(bm);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 30, Math.PI), tissue(C.artery)); cap.position.set(1.5, -0.62, D / 2 + 0.1); root.add(cap);
    // Lipid mortar filling the stratum corneum.
    const y0 = Yof(0.5) - 0.06;
    const mortar = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, TOP - y0 + 0.06, D), tissue(0xf6dc7a, { opacity: 0.32, depthWrite: false })); mortar.position.y = (TOP + y0) / 2; root.add(mortar);
    // Cells: living ellipsoids with nuclei, dead flat bricks.
    const N = NX * NZ * (K + 2);
    const live = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 16, 12), tissue(0xffffff, { roughness: 0.6 }), N);
    const nuc = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 10, 8), M.matte(0x6b3d5e), N);
    const dead = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tissue(0xffffff, { roughness: 0.75 }), N);
    [live, nuc, dead].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m); });
    const flakeMat = tissue(0xefe3c8, { opacity: 1 });
    // Melanocytes at the base.
    const melMat = M.matte(C.melano);
    [[-2.1, 0.8], [1.5, -0.5]].forEach(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x, 0.24, z);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), melMat));
      [[0.5, 0.45], [-0.45, 0.5], [0.15, 0.7], [-0.1, 0.62]].forEach(([dx, dy]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1, 6), melMat); c.position.set(dx / 2, dy / 2, 0); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, 0).normalize()); c.scale.y = Math.hypot(dx, dy); g.add(c); });
      root.add(g);
    });
    // Water molecules and germs.
    const NW = 70, NG = 16;
    const water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), M.glow(0x6cc8ff), NW);
    const germs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.07, 0.16, 4, 8), M.glow(0x7be07b), NG);
    [water, germs].forEach((m) => { m.frustumCulled = false; root.add(m); });
    const Wp = Array.from({ length: NW }, (_, i) => ({ x: (rnd(i) - 0.5) * W * 0.9, z: (rnd(i + 5) - 0.5) * D * 0.9, y: rnd(i + 9) * y0, out: false }));
    const Gp = Array.from({ length: NG }, (_, i) => ({ x: (rnd(i + 40) - 0.5) * W * 0.9, z: (rnd(i + 45) - 0.5) * D * 0.8, y: TOP + 0.5 + rnd(i + 50) * 1.5, vy: -0.4 }));
    const labs = {
      corn: tint(stage.label('Stratum corneum: bricks and mortar', [W / 2 - 1.2, (TOP + y0) / 2 + 0.2, D / 2], root), 'gold'),
      gran: tint(stage.label('Granular: nuclei vanish', [W / 2 - 0.9, Yof(0.47), D / 2], root), ''),
      spin: tint(stage.label('Spinous: keratin builds up', [W / 2 - 0.9, Yof(0.25), D / 2], root), ''),
      basal: tint(stage.label('Basal: new cells are born', [W / 2 - 0.9, Yof(0.03), D / 2], root), 'good'),
      mel: tint(stage.label('Melanocyte', [-2.1, -0.25, 1.4], root), 'side'),
      derm: tint(stage.label('Dermis: blood vessels feed the layers above', [-1.2, -0.75, D / 2 + 0.1], root), 'blood'),
    };
    const gold = tint(stage.label('', [0, 0, 0], root), 'gold');
    const o = new THREE.Object3D(), col = new THREE.Color();
    const liveCol = new THREE.Color(0xf2c9b3).lerp(toneColor(5), 0.35), granCol = new THREE.Color(0xd7a98c), deadCol = new THREE.Color(0xefe3c8), goldCol = new THREE.Color(0xffc93c);
    const fit = fitNarrow(stage, { pos: [0.4, 4.8, 13], target: [0.2, 2.2, 0] });
    let day = 0, t = 0;
    const flakes = []; let lastFlake = -1;
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        if (s.play) { s.weeks += dt / 7; if (s.weeks > 5) s.weeks = 0; }
        day = s.weeks * 7;
        const healthy = s.barrier === 'healthy';
        let nl = 0, nd = 0, nn = 0;
        let goldPos = null;
        for (let cx = 0; cx < NX; cx++) for (let cz = 0; cz < NZ; cz++) {
          const col0 = cx * NZ + cz, phase = ((cx % 2) * 0.5 + (cz % 2) * 0.25 + rnd(col0) * 0.2) / K;
          const x = (cx - (NX - 1) / 2) * DX, z = (cz - (NZ - 1) / 2) * DZ;
          const tracked = cx === 6 && cz === NZ - 1;
          for (let k = 0; k < K + 1; k++) {
            // Journey fraction of the k-th cell in this column (the tracked column's cell 0 is the gold one).
            let f = ((day / T + k / K + (tracked ? 0 : phase)) % 1 + 1) % 1;
            const isGold = tracked && k === 0;
            if (isGold) { f = day / T; if (f >= 1) continue; }
            else if (tracked && Math.abs(f - day / T) < 0.5 / K) continue;
            const st = stageOf(f), y = Yof(f);
            if (f > 0.5 && !healthy) continue;                               // scraped off
            const jit = (rnd(col0 * 31 + k) - 0.5) * 0.05;
            if (st.id === 'corneum') {
              const flat = smooth((f - 0.5) / 0.08);
              o.position.set(x + jit + (k % 2 ? 0.12 : -0.12), y, z); o.rotation.set(0, 0, (rnd(k + col0) - 0.5) * 0.08);
              o.scale.set(lerp(0.74, st.w, flat), st.h * 0.9, DZ * lerp(0.8, 1.02, flat)); o.updateMatrix();
              dead.setMatrixAt(nd, o.matrix); dead.setColorAt(nd, isGold ? goldCol : col.copy(deadCol).multiplyScalar(0.92 + 0.08 * rnd(k * 7 + col0))); nd++;
            } else {
              o.position.set(x + jit, y, z); o.rotation.set(0, 0, 0);
              o.scale.set(st.w * 0.98, st.h * (st.id === 'basal' ? 1.05 : 1.0), DZ * 0.92); o.updateMatrix();
              live.setMatrixAt(nl, o.matrix); live.setColorAt(nl, isGold ? goldCol : st.id === 'granular' ? granCol : liveCol); nl++;
              if (st.id !== 'granular' || f < 0.46) {
                o.scale.set(0.2, 0.18 * (st.id === 'basal' ? 1.2 : 1), 0.2); o.position.z = z + DZ * 0.38; o.updateMatrix();
                nuc.setMatrixAt(nn++, o.matrix);
              }
            }
            if (isGold) goldPos = [x, y, z];
          }
        }
        // Flakes coming off the top.
        if (healthy && flakes.length < 6 && rnd(Math.floor(t * 3)) > 0.7 && Math.floor(t * 3) !== lastFlake) { lastFlake = Math.floor(t * 3); flakes.push({ x: (rnd(t) - 0.5) * W * 0.8, z: (rnd(t + 1) - 0.5) * D * 0.6, a: 0, r: rnd(t + 2) }); }
        for (let i = flakes.length - 1; i >= 0; i--) {
          const fl = flakes[i]; fl.a += dt / 4; if (fl.a > 1) { flakes.splice(i, 1); continue; }
          o.position.set(fl.x + fl.a * 1.2, TOP + 0.1 + fl.a * 2.2, fl.z); o.rotation.set(fl.a * 2 + fl.r, fl.a * 3, fl.r); o.scale.set(0.9, 0.08, 0.55); o.updateMatrix();
          dead.setMatrixAt(nd, o.matrix); dead.setColorAt(nd, deadCol); nd++;
        }
        live.count = nl; dead.count = nd; nuc.count = nn;
        [live, dead, nuc].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
        mortar.visible = healthy;
        // Water rising from below: blocked by a healthy barrier, pouring out without it.
        Wp.forEach((p, i) => {
          p.y += dt * (0.25 + 0.3 * rnd(i)); p.x += Math.sin(t * 2 + i) * dt * 0.1;
          const tick = Math.floor(t * 10);
          if (healthy && !p.out && p.y > y0) { if (rnd(i * 13 + tick) > 0.993) p.out = true; else p.y = y0 - 0.05 - 0.25 * rnd(i + tick); }
          if (p.out) p.y += dt * 0.4;
          if (p.y > TOP + 2.2) { p.y = rnd(i + tick) * 0.5; p.out = false; }
          o.position.set(p.x, p.y, p.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); water.setMatrixAt(i, o.matrix);
        });
        water.instanceMatrix.needsUpdate = true;
        Gp.forEach((g, i) => {
          g.y += g.vy * dt;
          const floor = healthy ? TOP + 0.08 : y0 - 0.9;
          if (g.y < floor) { if (healthy) { g.y = floor; g.vy = 0.5 + 0.3 * rnd(i); } else if (g.y < floor) { g.y = TOP + 2 + rnd(i + t); } }
          if (g.y > TOP + 2.2) g.vy = -0.4 - 0.2 * rnd(i);
          o.position.set(g.x + Math.sin(t + i) * 0.1, g.y, g.z); o.rotation.set(0, 0, 1.2 + i); o.scale.setScalar(1); o.updateMatrix(); germs.setMatrixAt(i, o.matrix);
        });
        germs.instanceMatrix.needsUpdate = true;
        const narrow = fit();
        Object.values(labs).forEach((l) => { l.visible = s.labels && !narrow; });
        labs.corn.visible = labs.corn.visible && healthy;
        gold.visible = !!goldPos && s.labels;
        if (goldPos) { gold.position.set(goldPos[0] - 1.5, goldPos[1] + 0.35, goldPos[2] + 0.4); gold.element.innerHTML = `<b>Gold cell, day ${Math.round(day)}</b>`; }
      },
      readout: (s) => {
        const d = s.weeks * 7, healthy = s.barrier === 'healthy';
        return `<div class="big">Day ${Math.round(d)}: the gold cell is ${d >= T ? 'gone' : 'in the ' + stageName(d)}</div>
          <div class="row"><span>Birth to flaking off</span><b>about 4 weeks (${T} days here)</b></div>
          <div class="row"><span>Living layers, then dead layers</span><b>about 2 weeks each</b></div>
          <div class="row"><span>Water lost through the skin</span><b>${healthy ? 'about 0.3 to 0.4 L a day' : 'up to 3 to 5 L a day'}</b></div>
          <div class="row"><span>Germs</span><b>${healthy ? 'kept out' : 'can get in'}</b></div>
          <div class="row"><span>Cells shed a day</span><b>roughly 500 million</b></div>
          <small>${healthy ? 'The clock runs fast: 1 second is 1 day. Times vary with age and body site.' : 'Without the stratum corneum, as after a bad scrape or burn, water pours out. Water-loss figures from Guyton & Hall.'}</small>`;
      },
    });
  },
};
