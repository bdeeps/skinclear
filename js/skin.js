// SkinClear's 3D skin: a magnified block of human skin, cut out like a teaching model, with the
// three layers and everything that lives in them, plus the physics used by the readouts.
//
// Scale and orientation: one model unit is 1 mm of real skin; +y points out of the body (up),
// +z towards you. The block is 6 mm wide and 4 mm deep; its front face (z = +2) is the "cut" on
// which the structures stand out in relief, like a plastic anatomy model.
// Layer thicknesses follow standard histology (Gray's Anatomy, 42nd ed.; Kolarsick, Kolarsick &
// Goodwin, "Anatomy and Physiology of the Skin", J Dermatol Nurses Assoc 3:203, 2011; NCI SEER
// Training "Layers of the Skin"):
//  - epidermis about 0.1 mm on most of the body (0.05 mm on eyelids, up to about 1.5 mm on the
//    soles). It is DRAWN about 3 times thicker here (0.35 units) so its layers can be seen;
//  - dermis about 1 to 4 mm (2 mm here), with finger-like dermal papillae interlocking with the
//    epidermis's rete ridges (drawn 0.5 mm apart);
//  - hypodermis (subcutaneous fat) from a few mm to several cm; only its top 1.6 mm is shown.
// Structures: hair follicles slant at an angle to the surface; the sebaceous gland and the
// arrector pili muscle sit on the side where the hair makes an obtuse angle with the skin; the
// eccrine sweat gland is a coiled tube in the deep dermis with a duct that spirals through the
// epidermis to a pore; apocrine glands (armpits, groin) are larger and open into a follicle.
// Receptors: Meissner corpuscles in the dermal papillae, Merkel cells in the basal layer,
// Pacinian corpuscles (about 1 mm long, onion-like) in the deep dermis and fat, Ruffini endings
// (spindles) in the dermis, free nerve endings reaching into the epidermis (Purves et al.,
// Neuroscience, 6th ed., ch. 9; Johansson & Flanagan, Nat Rev Neurosci 10:345, 2009).
// Blood vessels form two flat networks, a deep plexus at the dermis/fat border and a superficial
// (subpapillary) plexus, joined by vertical vessels, with capillary loops up into each papilla.
import { THREE, M, tube, beam, clamp, lerp, smooth, swarm } from './kit.js';

export const W = 6, D = 4;
export const Y = { hypo: 1.6, derm: 3.55, surf: 3.95, corn: 0.07, pap: 0.14 };
export const FRONT = D / 2;

// Monk Skin Tone Scale (Ellis Monk; released by Google, 2022, CC BY 4.0): ten shades chosen to
// cover the full range of human skin, including the many tones found across India.
export const TONES = ['#f6ede4', '#f3e7db', '#f7ead0', '#eadaba', '#d7bd96', '#a07e56', '#825c43', '#604134', '#3a312a', '#292420'];
export function toneColor(t) {
  const k = clamp(t, 1, 10) - 1, i = Math.min(8, Math.floor(k)), f = k - i;
  return new THREE.Color(TONES[i]).lerp(new THREE.Color(TONES[i + 1]), f);
}

export const C = {
  derm: 0xe7a39a, hypo: 0xf6e3a6, fat: 0xf2cf6a, sheath: 0xe9c2ad, hair: 0x2b211c, sebum: 0xf3e2a0,
  muscle: 0xc4524d, sweat: 0x9fd8ff, artery: 0xd8323a, vein: 0x5a4fb0, nerve: 0xffd35c,
  meissner: 0xc9a7ff, merkel: 0x7fe0d0, pacini: 0xb9a3ff, ruffini: 0x8ec5ff, free: 0xffe08a, melano: 0x4a2a18,
};
export const tissue = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 1, ...o });

// ---------------------------------------------------------------- surfaces
// Dermal papillae: a grid of bumps 0.5 mm apart; the epidermis's underside follows them.
export const papilla = (x, z) => Y.pap * (0.5 + 0.5 * Math.cos((2 * Math.PI * x) / 0.5)) * (0.5 + 0.5 * Math.cos((2 * Math.PI * z) / 0.5));
export const dermTop = (x, z) => Y.derm + papilla(x, z);
// The surface: fine furrows on hairy skin, or friction ridges (fingerprints) on fingertips.
export function surface(x, z, ridges = false) {
  if (ridges) return Y.surf + 0.03 * Math.sin((2 * Math.PI * (x + 0.08 * Math.sin(z * 1.3))) / 0.46);
  const a = Math.abs(Math.sin((Math.PI * (x * 0.8 + z * 0.6)) / 1.3)), b = Math.abs(Math.sin((Math.PI * (x * 0.5 - z * 0.85)) / 1.7));
  return Y.surf - 0.035 * Math.pow(1 - a, 10) - 0.025 * Math.pow(1 - b, 10);
}

// A layer as a closed slab between two height fields bottom(x, z) and top(x, z). It can be
// re-shaped every frame (goosebumps, wounds) and coloured per vertex (burns, scars).
export function slab(w, d, nx, nz, mat, sideMat = mat) {
  const nv = 2 * (nx + 1) * (nz + 1) + 4 * (nx + 1) + 4 * (nz + 1);
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3).fill(1);
  const xs = new Float32Array(nv), zs = new Float32Array(nv), up = new Uint8Array(nv);
  let v = 0; const idx = [], idxS = [];
  const put = (x, z, t, u, vv) => { xs[v] = x; zs[v] = z; up[v] = t; uv[v * 2] = u; uv[v * 2 + 1] = vv; return v++; };
  for (const t of [1, 0]) {
    const base = v;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) put(-w / 2 + (w * i) / nx, -d / 2 + (d * j) / nz, t, i / nx, 1 - j / nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1;
      if (t) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
    }
  }
  const edge = (pts, flip) => {
    const base = v, n = pts.length;
    pts.forEach(([x, z], k) => { put(x, z, 0, k / (n - 1), 0); put(x, z, 1, k / (n - 1), 1); });
    for (let k = 0; k < n - 1; k++) { const b0 = base + 2 * k, t0 = b0 + 1, b1 = b0 + 2, t1 = b0 + 3; if (flip) idxS.push(b0, t0, b1, b1, t0, t1); else idxS.push(b0, b1, t0, b1, t1, t0); }
  };
  const along = (n, f) => Array.from({ length: n + 1 }, (_, k) => f(k / n));
  edge(along(nx, (k) => [-w / 2 + w * k, d / 2]), false);
  edge(along(nx, (k) => [-w / 2 + w * k, -d / 2]), true);
  edge(along(nz, (k) => [-w / 2, -d / 2 + d * k]), false);
  edge(along(nz, (k) => [w / 2, -d / 2 + d * k]), true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx.concat(idxS));
  g.addGroup(0, idx.length, 0); g.addGroup(idx.length, idxS.length, 1);
  const mesh = new THREE.Mesh(g, [mat, sideMat]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.setFns = (bot, top) => {
    for (let k = 0; k < nv; k++) {
      const x = xs[k], z = zs[k], b = bot(x, z);
      pos[k * 3] = x; pos[k * 3 + 1] = up[k] ? Math.max(b, top(x, z)) : b; pos[k * 3 + 2] = z;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  };
  // fn(x, y, z) → [r, g, b] multiplier on the material colour (needs vertexColors).
  mesh.setColors = (fn) => {
    for (let k = 0; k < nv; k++) { const c = fn ? fn(xs[k], pos[k * 3 + 1], zs[k]) : null; col[k * 3] = c ? c[0] : 1; col[k * 3 + 1] = c ? c[1] : 1; col[k * 3 + 2] = c ? c[2] : 1; }
    g.attributes.color.needsUpdate = true;
  };
  return mesh;
}

// Point a beam made by kit.beam() from a to b (for things that move, like the arrector pili).
export function link(m, a, b) {
  const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.scale.y = A.distanceTo(B) / (m.userData.len || 1);            // kit.beam built with length len (default 1)
}

// A tangled coil (the secretory part of a sweat gland) around centre c.
export function coilPts(c, r, n = 90, turns = 3) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * Math.PI * 2 * turns;
    p.push(new THREE.Vector3(c[0] + r * Math.sin(a) * Math.cos(t * 2.2), c[1] + r * 0.55 * Math.sin(a * 1.7 + 0.5), c[2] + r * 0.45 * Math.cos(a) * Math.sin(t * 3 + 1)));
  }
  return p;
}

// ---------------------------------------------------------------- a hair follicle
// Built along local +y from the bulb. tilt = angle from vertical; the hair leans towards +x.
export const TILT = 0.52, TILT_UP = 0.2;                 // about 30° and 11° from vertical
function makeFollicle({ len = 2.8, r = 0.15, gland = true, hairLen = 1.5 } = {}) {
  const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
  const prof = [[0.02, -0.03], [0.2, 0.0], [r + 0.12, 0.16], [r + 0.08, 0.36], [r, 0.52], [r, len - 0.25], [r + 0.05, len + 0.02]];
  const sheathMat = tissue(C.sheath, { opacity: 0.55, depthWrite: false });
  const sheath = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 36), sheathMat);
  pivot.add(sheath);
  const papil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), tissue(0xd9606a)); papil.position.y = 0.1; papil.scale.y = 1.3; pivot.add(papil);
  const hairMat = M.plastic(C.hair, { roughness: 0.4 });
  const hair = tube([[0, 0.14, 0], [0, len * 0.5, 0], [0, len, 0], [0.08, len + hairLen * 0.45, 0], [0.32, len + hairLen * 0.85, 0], [0.55, len + hairLen, 0]], 0.05, hairMat, false, 60);
  pivot.add(hair);
  const bulbHair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), hairMat); bulbHair.position.y = 0.2; bulbHair.scale.set(1, 1.2, 1); pivot.add(bulbHair);
  let sebum = null;
  if (gland) {
    sebum = new THREE.Group();
    const sm = tissue(C.sebum, { clearcoat: 0.7 });
    [[-0.27, 0, 0, 0.16], [-0.42, -0.14, 0.05, 0.14], [-0.4, 0.15, -0.05, 0.13], [-0.55, 0.02, 0, 0.12]].forEach(([x, y, z, rr]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(rr, 18, 12), sm); s.position.set(x, y, z); sebum.add(s); });
    sebum.position.y = len * 0.72; pivot.add(sebum);
  }
  pivot.rotation.z = -TILT;
  return { group: g, pivot, sheath, sheathMat, hair, hairMat, sebum, len,
    // A point on the follicle's axis, fraction f of its length, offset sideways (local x).
    at(f, side = 0) { const p = new THREE.Vector3(side, f * len, 0); pivot.updateMatrixWorld(); return p.applyMatrix4(pivot.matrix).add(g.position); } };
}

// ---------------------------------------------------------------- the skin block
export function makeSkinBlock(stage, opts = {}) {
  const o = { hair: true, ridges: false, tone: 5, extras: true, ...opts };
  const root = new THREE.Group();
  const G = { corn: new THREE.Group(), epi: new THREE.Group(), derm: new THREE.Group(), hypo: new THREE.Group() };
  Object.values(G).forEach((g) => root.add(g));
  const mats = {
    corn: tissue(0xffffff, { vertexColors: true, roughness: 0.7 }),
    epi: tissue(0xffffff, { vertexColors: true }),
    derm: tissue(C.derm, { vertexColors: true }),
    hypo: tissue(C.hypo, { vertexColors: true, roughness: 0.6 }),
  };
  // The cut faces of the dermis and fat are a little see-through, like a thin slice under a
  // microscope, so the structures just behind them show.
  mats.dermSide = tissue(C.derm, { vertexColors: true, opacity: 0.62, depthWrite: false });
  mats.hypoSide = tissue(C.hypo, { vertexColors: true, opacity: 0.7, depthWrite: false, roughness: 0.6 });
  const st = { bumps: [], mod: null, tone: o.tone, flush: 0, burnDepth: 0 };
  const layers = {
    corn: slab(W, D, 96, 64, mats.corn), epi: slab(W, D, 96, 64, mats.epi),
    derm: slab(W, D, 96, 64, mats.derm, mats.dermSide), hypo: slab(W, D, 16, 10, mats.hypo, mats.hypoSide),
  };
  Object.entries(layers).forEach(([k, m]) => G[k].add(m));
  // Height functions, with optional goosebumps and a chapter's own modifier (a wound).
  const bump = (x, z) => { let b = 0; for (const q of st.bumps) b += q.h * Math.exp(-((x - q.x) ** 2 + (z - q.z) ** 2) / (2 * q.r * q.r)); return b; };
  const H = {
    surf: (x, z) => surface(x, z, o.ridges) + bump(x, z),
    derm: (x, z) => dermTop(x, z) + bump(x, z) * 0.6,
  };
  const reshape = () => {
    const m = st.mod || {};
    const dT = (x, z) => (m.derm ? m.derm(x, z, H.derm(x, z)) : H.derm(x, z));
    const eT = (x, z) => (m.epi ? m.epi(x, z, H.surf(x, z) - Y.corn, dT(x, z)) : H.surf(x, z) - Y.corn);
    const cT = (x, z) => (m.corn ? m.corn(x, z, H.surf(x, z), eT(x, z)) : H.surf(x, z));
    layers.hypo.setFns(() => 0, () => Y.hypo);
    layers.derm.setFns(() => Y.hypo, dT);
    const eB = (x, z) => (m.epiBot ? m.epiBot(x, z, dT(x, z)) : dT(x, z));
    layers.epi.setFns(eB, eT);
    layers.corn.setFns(eT, cT);
  };
  reshape();

  // ---- fat lobules on the cut faces of the hypodermis
  const lobules = [];
  for (let x = -2.7; x <= 2.75; x += 0.62) for (let y = 0.32; y < 1.45; y += 0.5) {
    const jx = x + (Math.sin(x * 12.9 + y * 7.1) * 0.08), jy = y + Math.cos(x * 5.3 + y * 3.1) * 0.06;
    if (Math.abs(jx - 0.3) < 0.85 && Math.abs(jy - 0.75) < 0.5) continue;       // the Pacinian corpuscle
    if (o.hair && Math.abs(jx + 1.25) < 0.4 && Math.abs(jy - 1.0) < 0.35) continue; // the apocrine coil
    lobules.push([jx, jy, FRONT - 0.12, 0.25 + 0.07 * Math.abs(Math.sin(x * 3 + y * 5))]);
  }
  for (let z = -1.7; z <= 1.75; z += 0.62) for (let y = 0.32; y < 1.45; y += 0.5) lobules.push([W / 2 - 0.12, y + Math.sin(z * 4) * 0.05, z, 0.25 + 0.06 * Math.abs(Math.cos(z * 3 + y))]);
  const fat = swarm(lobules.length, new THREE.SphereGeometry(0.9, 16, 12).scale(1, 1, 0.5), tissue(C.fat, { clearcoat: 0.6, roughness: 0.4 }));
  lobules.forEach((l, i) => fat.place(i, [l[0], l[1], l[2]], null, l[3])); fat.done(); G.hypo.add(fat);

  // ---- collagen (thick, wavy, pale) and elastin (thin, dark) fibres on the cut face of the dermis
  const colMat = tissue(0xf7dcd4, { roughness: 0.7 }), elaMat = tissue(0xb86a78, { roughness: 0.6 });
  for (let i = 0; i < 9; i++) {
    const y0 = 1.85 + i * 0.17, ph = i * 1.7;
    G.derm.add(tube(Array.from({ length: 16 }, (_, k) => [-3 + k * 0.4, y0 + 0.05 * Math.sin(k * 1.9 + ph), FRONT + 0.005]), i % 3 === 2 ? 0.012 : 0.022, i % 3 === 2 ? elaMat : colMat, false, 90));
  }

  // ---- blood vessels (dermis)
  const V = { deep: [], sup: [], loops: [], all: [] };
  const vessel = (pts, r, color, list) => {
    const c = pts.reduce((a, p) => a.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const m = tube(pts.map((p) => [p[0] - c.x, p[1] - c.y, p[2] - c.z]), r, tissue(color, { clearcoat: 0.8 }), false, 120);
    m.position.copy(c); G.derm.add(m); list.push(m); V.all.push(m); m.userData.color = color; return m;
  };
  const wav = (y, z, a, ph) => Array.from({ length: 13 }, (_, i) => [-3 + i * 0.5, y + a * Math.sin(i * 1.3 + ph), z + 0.04 * Math.cos(i + ph)]);
  vessel(wav(1.72, FRONT + 0.01, 0.04, 0), 0.075, C.artery, V.deep);
  vessel(wav(1.62, FRONT - 0.22, 0.05, 2), 0.09, C.vein, V.deep);
  vessel(wav(3.28, FRONT + 0.01, 0.03, 1), 0.045, C.artery, V.sup);
  vessel(wav(3.2, FRONT - 0.18, 0.03, 3), 0.055, C.vein, V.sup);
  [[0.55, 0.06], [2.75, 0.02]].forEach(([x, ph]) => vessel([[x, 1.72, FRONT + 0.01], [x + 0.08, 2.3, FRONT + 0.01], [x - 0.05, 2.8, FRONT + 0.01], [x, 3.28, FRONT + 0.01]], 0.04, C.artery, V.deep));
  const loopX = [];
  for (let k = -5; k <= 5; k++) { const x = k * 0.5; if (o.hair && (x > -1.3 && x < -0.2)) continue; if (Math.abs(x - 1.2) < 0.15) continue; loopX.push(x); }
  loopX.forEach((x) => vessel([[x - 0.07, 3.26, FRONT + 0.01], [x - 0.05, 3.55, FRONT + 0.01], [x, 3.63, FRONT + 0.01], [x + 0.05, 3.55, FRONT + 0.01], [x + 0.07, 3.23, FRONT - 0.1]], 0.02, C.artery, V.loops));

  // ---- nerves and receptors
  const nerveMat = tissue(C.nerve, { clearcoat: 0.6 });
  const nerve = (pts, r = 0.035) => { const m = tube(pts, r, nerveMat, false, 80); G.derm.add(m); return m; };
  const R = {};
  const glowMat = (c, op = 1) => tissue(c, { emissive: new THREE.Color(c), emissiveIntensity: 0.15, opacity: op, depthWrite: op >= 1 });
  // Pacinian corpuscle: nested capsules like an onion around one nerve ending, about 1 mm long.
  const pac = new THREE.Group(); pac.position.set(0.3, 0.78, FRONT + 0.01);
  const pacMats = [];
  [1, 0.82, 0.64, 0.46].forEach((s, i) => { const m = glowMat(C.pacini, i === 0 ? 0.35 : 0.3); pacMats.push(m); const e = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), m); e.scale.set(0.52 * s, 0.26 * s, 0.26 * s); pac.add(e); });
  const pacCore = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), glowMat(C.nerve)); pacCore.rotation.z = Math.PI / 2; pac.add(pacCore); pacMats.push(pacCore.material);
  G.hypo.add(pac); R.pacini = { obj: pac, mats: pacMats };
  // Ruffini ending: a spindle-shaped capsule lying along the stretch direction.
  const ruf = new THREE.Group(); ruf.position.set(2.15, 2.6, FRONT + 0.01);
  const rufM = glowMat(C.ruffini, 0.6); const rs = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), rufM); rs.scale.set(0.34, 0.09, 0.09); ruf.add(rs);
  const rufIn = tube([[-0.28, 0, 0], [-0.15, 0.03, 0.02], [0, -0.03, 0], [0.15, 0.03, -0.02], [0.28, 0, 0]], 0.012, glowMat(C.nerve), false, 30); ruf.add(rufIn);
  G.derm.add(ruf); R.ruffini = { obj: ruf, mats: [rufM, rufIn.material] };
  // Meissner corpuscles sit in the tips of the dermal papillae.
  const meisX = o.ridges ? [-2.5, -1.5, -0.5, 0, 0.5, 1.5, 2.5] : [0, 2.5];
  R.meissner = { objs: [], mats: [] };
  meisX.forEach((x) => { const m = glowMat(C.meissner); const e = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), m); e.scale.set(0.065, 0.12, 0.065); e.position.set(x, Y.derm + Y.pap - 0.1, FRONT + 0.01); G.derm.add(e); R.meissner.objs.push(e); R.meissner.mats.push(m); });
  // Merkel cells: small discs in the basal layer at the bottom of the rete ridges.
  const merkX = o.ridges ? [-2.25, -1.25, -0.25, 0.75, 1.75] : [-0.25, 0.75, 1.75];
  R.merkel = { objs: [], mats: [] };
  merkX.forEach((x) => { const m = glowMat(C.merkel); const e = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), m); e.position.set(x, Y.derm + 0.03, FRONT + 0.01); G.epi.add(e); R.merkel.objs.push(e); R.merkel.mats.push(m); });
  // Free nerve endings: bare branches that reach up into the epidermis (pain, heat, cold, itch).
  const freeMat = glowMat(C.free);
  const fr = new THREE.Group();
  [[[1.85, 3.25, 0], [1.72, 3.6, 0], [1.66, 3.84, 0]], [[1.85, 3.25, 0], [1.9, 3.62, 0], [1.94, 3.86, 0]], [[1.85, 3.25, 0], [2.02, 3.55, 0], [2.12, 3.82, 0]]]
    .forEach((pts) => fr.add(tube(pts.map((p) => [p[0], p[1], FRONT + 0.01]), 0.014, freeMat, false, 20)));
  G.derm.add(fr); R.free = { obj: fr, mats: [freeMat] };
  // The nerve trunk and its branches.
  nerve([[0.95, 0.05, FRONT - 0.1], [0.95, 0.5, FRONT + 0.01], [0.85, 0.78, FRONT + 0.01]]);
  nerve([[0.95, 0.5, FRONT + 0.01], [1.0, 1.3, FRONT + 0.01], [0.95, 2.2, FRONT + 0.01], [1.0, 2.6, FRONT + 0.01]]);
  nerve([[1.0, 2.6, FRONT + 0.01], [1.45, 2.62, FRONT + 0.01], [1.81, 2.6, FRONT + 0.01]], 0.025);
  nerve([[1.0, 2.6, FRONT + 0.01], [1.45, 3.0, FRONT + 0.01], [1.85, 3.25, FRONT + 0.01]], 0.022);
  nerve([[1.0, 2.6, FRONT + 0.01], [0.8, 3.1, FRONT + 0.01], [0.75, 3.52, FRONT + 0.01]], 0.02);
  nerve([[1.0, 2.6, FRONT + 0.01], [0.4, 2.95, FRONT + 0.01], [0.05, 3.3, FRONT + 0.01], [0.0, 3.5, FRONT + 0.01]], 0.02);
  if (o.ridges) meisX.filter((x) => x !== 0).forEach((x) => nerve([[x * 0.6 + 0.4, 2.9, FRONT + 0.01], [x, 3.35, FRONT + 0.01], [x, 3.5, FRONT + 0.01]], 0.016));

  // ---- sweat glands
  const sweatMat = tissue(C.sweat, { clearcoat: 0.9, opacity: 0.95 });
  const eccrine = (c, pore) => {
    const coil = coilPts(c, 0.22);
    const end = coil[coil.length - 1];
    const duct = [end, new THREE.Vector3(c[0] + 0.05, c[1] + 0.6, c[2]), new THREE.Vector3(pore[0] - 0.03, Y.derm - 0.3, pore[2]), new THREE.Vector3(pore[0], Y.derm, pore[2])];
    for (let i = 1; i <= 8; i++) { const t = i / 8, a = t * Math.PI * 3; duct.push(new THREE.Vector3(pore[0] + 0.05 * Math.cos(a), lerp(Y.derm + 0.02, Y.surf - 0.01, t), pore[2] + 0.05 * Math.sin(a))); }
    const g = new THREE.Group();
    g.add(tube(coil, 0.045, sweatMat, false, 220), tube(duct, 0.03, sweatMat, false, 120));
    G.derm.add(g); return g;
  };
  const glands = { eccrine: [eccrine([1.1, 2.05, FRONT + 0.01], [1.2, 0, FRONT + 0.01])] };
  if (o.extras) glands.eccrine.push(eccrine([2.3, 2.0, 0.4], [2.45, 0, 0.5]), eccrine([-2.2, 2.1, -0.9], [-2.3, 0, -1.0]));
  // Pores (and where sweat beads) on the top surface: about 100 to 600 per cm² depending on
  // the body site (Taylor & Machado-Moreira, Extrem Physiol Med 2:4, 2013); 12 are drawn here.
  const pores = [[1.2, FRONT + 0.01], [2.45, 0.5], [-2.3, -1.0], [0.3, -1.4], [-1.2, 0.9], [2.2, -1.2], [-0.4, -0.3], [1.3, 0.2], [-2.5, 1.2], [0.6, 1.1], [-1.6, -1.7], [2.7, 1.5]];

  // ---- hair follicles (not on the palms, soles or fingertips)
  const follicles = [];
  let arrector = null, apocrine = null;
  if (o.hair) {
    const f = makeFollicle(); f.group.position.set(-2.0, 1.5, FRONT + 0.01); G.derm.add(f.group); follicles.push(f);
    if (o.extras) [[0.9, 1.7, -0.9, 0.8], [-0.3, 1.6, 0.6, 0.85], [2.0, 1.8, -1.6, 0.75]].forEach(([x, y, z, s]) => { const e = makeFollicle({ len: 2.6 * s + 0.25, hairLen: 1.2 }); e.group.position.set(x, y, z); G.derm.add(e.group); follicles.push(e); });
    // Arrector pili: smooth muscle from the follicle (below the sebaceous gland) up to the
    // underside of the epidermis, on the obtuse-angle side. Contracting, it stands the hair up.
    arrector = beam([0, 0, 0], [0, 1, 0], 0.05, tissue(C.muscle));
    G.derm.add(arrector);
    // Apocrine gland: a bigger coil in the fat that opens into the follicle, above the sebaceous gland.
    const ac = coilPts([-1.25, 1.0, FRONT - 0.1], 0.3, 110, 3.5);
    const join = f.at(0.84, 0.1);
    apocrine = new THREE.Group();
    apocrine.add(tube(ac, 0.075, tissue(0xb7d8f0, { clearcoat: 0.8 }), false, 260), tube([ac[ac.length - 1], [-1.05, 1.9, FRONT + 0.01], [-0.95, 2.8, FRONT + 0.01], join], 0.04, tissue(0xb7d8f0), false, 60));
    G.derm.add(apocrine);
  }
  const erect = { k: 0 };
  const placeArrector = () => {
    if (!arrector) return;
    const f = follicles[0];
    const a = f.at(0.5, -0.17), b = new THREE.Vector3(a.x - 0.55, Y.derm - 0.04, a.z);
    link(arrector, a, b);
  };
  placeArrector();

  // ---- melanocytes in the basal layer: dark cells with branches that hand melanin to neighbours
  const melanocytes = new THREE.Group();
  const melMat = M.matte(C.melano);
  [-2.75, -1.75, 0.25, 1.25, 2.25].forEach((x) => {
    const c = new THREE.Group(); c.position.set(x, Y.derm + 0.05, FRONT + 0.01);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), melMat); c.add(b);
    [[0.13, 0.1], [-0.12, 0.12], [0.05, 0.16], [-0.04, 0.14]].forEach(([dx, dy]) => c.add(beam([0, 0, 0], [dx, dy, 0], 0.012, melMat, 6)));
    melanocytes.add(c);
  });
  G.epi.add(melanocytes);

  // ---- colour: tone for the epidermis, redness of the dermis for blood flow
  const setTone = (t) => {
    st.tone = t;
    const c = toneColor(t);
    mats.epi.color.copy(c);
    // The stratum corneum carries some melanin too, but is paler and more translucent.
    mats.corn.color.copy(c).lerp(new THREE.Color(0xf4ead8), 0.28);
    melMat.color.set(C.melano).lerp(new THREE.Color(0x1a0d06), clamp((t - 1) / 9, 0, 1));
  };
  setTone(o.tone);
  // flush: −1 (vessels narrowed, pale) … 0 … +1 (vessels wide, flushed).
  const setFlush = (k) => {
    st.flush = k;
    const dermC = new THREE.Color(C.derm);
    if (k > 0) dermC.lerp(new THREE.Color(0xd84b4b), 0.55 * k); else dermC.lerp(new THREE.Color(0xf2d2c8), -0.45 * k);
    mats.derm.color.copy(dermC); mats.dermSide.color.copy(dermC);
    const light = 1 - clamp((st.tone - 1) / 9, 0, 1) * 0.85;              // redness shows less through more melanin
    mats.epi.emissive.set(k > 0 ? 0x801818 : 0x000000); mats.epi.emissiveIntensity = Math.max(0, k) * 0.35 * light;
    const s = 1 + (k > 0 ? 0.55 : 0.6) * k;
    V.all.forEach((m) => { const r = m.userData.color === C.vein ? 1 + 0.5 * k : s; m.scale.set(1, clamp(r, 0.35, 2), clamp(r, 0.35, 2)); });
    V.loops.forEach((m) => { m.scale.set(clamp(1 + 0.4 * k, 0.5, 1.5), 1, clamp(1 + 0.4 * k, 0.5, 1.5)); m.visible = k > -0.85; });
  };

  // ---- goosebumps: tilt the follicle up and raise the skin around each hair
  const setErect = (k) => {
    erect.k = k;
    follicles.forEach((f) => { f.pivot.rotation.z = -lerp(TILT, TILT_UP, k); });
    placeArrector();
    arrector && (arrector.scale.x = arrector.scale.z = 1 + 0.6 * k);
    st.bumps = follicles.map((f) => { const p = f.at(1); return { x: p.x - 0.2, z: p.z, r: 0.38, h: 0.13 * k }; });
    reshape();
  };

  // ---- X-ray and explode
  const slabMats = [mats.corn, mats.epi, mats.derm, mats.hypo];
  const setXray = (k) => {
    slabMats.forEach((m, i) => { m.opacity = lerp(1, i < 2 ? 0.28 : 0.14, k); m.depthWrite = k < 0.3; });
    mats.dermSide.opacity = lerp(0.62, 0.12, k); mats.hypoSide.opacity = lerp(0.7, 0.12, k);
    fat.material.opacity = lerp(1, 0.35, k); fat.material.depthWrite = k < 0.3;
  };
  const OFF = { corn: [0, 1.6, 0], epi: [0, 0.9, 0], derm: [0, 0, 0], hypo: [0, -1.0, 0] };
  const setExplode = (k) => Object.entries(OFF).forEach(([n, off]) => G[n].position.set(off[0] * smooth(k), off[1] * smooth(k), off[2] * smooth(k)));

  return {
    root, G, mats, layers, R, V, glands, pores, follicles, arrector, apocrine, melanocytes, fat, st, H,
    setTone, setFlush, setErect, setXray, setExplode, reshape,
    setMod(m) { st.mod = m; reshape(); },
    get erect() { return erect.k; },
    surfY: (x, z) => H.surf(x, z),
    receptorsGlow(levels) {       // levels: { meissner, merkel, pacini, ruffini, free } 0..1
      for (const [k, v] of Object.entries(levels)) (R[k]?.mats || []).forEach((m) => { m.emissiveIntensity = 0.15 + 1.6 * v; });
    },
  };
}

// ---------------------------------------------------------------- labels, boards, layout
const TINT = { side: '#8ef0ff', gold: '#ffd166', blood: '#ff8a8a', nerve: '#ffe08a', sweat: '#9fd8ff', fat: '#ffe3a0', muscle: '#ffb0a0', recep: '#d7c2ff', good: '#6ee7a8', uv: '#c9a7ff', warn: '#ff8a8a' };
export function tint(l, cls) { const c = TINT[cls]; if (c) { l.element.style.borderColor = c; l.element.style.color = c; } return l; }
export function board(canvasTex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
}
export const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage the readout covers the upper left: re-centre once, unless orbited.
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = stage.host.clientWidth < 560;
    if (narrow && !done && !stage.moved && !inReel()) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}
// On phones keep only the readout's headline and two rows.
export function compactReadout(stage, api) {
  const full = api.readout;
  if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (stage.host.clientWidth >= 560 || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}
export function panel(g, w, h, title) {
  g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8ecf4'; g.font = '600 30px sans-serif'; g.fillText(title, 22, 44);
}

// ---------------------------------------------------------------- heat balance (temperature chapter)
// Saturation vapour pressure of water, kPa (Buck, J Appl Meteorol 20:1527, 1981).
export const psat = (T) => 0.61121 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
// Wet-bulb temperature from air temperature (°C) and relative humidity (%), at sea level
// (Stull, J Appl Meteorol Climatol 50:2267, 2011; good to about ±1 °C for RH 5–99%).
export function wetBulb(T, RH) {
  RH = clamp(RH, 5, 99);
  return T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) + Math.atan(T + RH) - Math.atan(RH - 1.676331) + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;
}
// Metabolic heat for an adult of 1.8 m² body surface (ASHRAE Handbook, Fundamentals, ch. 9:
// resting about 60 W/m², walking about 115–150 W/m², hard work 250+ W/m²).
export const ACT = { rest: { name: 'Resting', M: 105 }, walk: { name: 'Walking', M: 250 }, work: { name: 'Hard work or sport', M: 500 } };
export const AREA = 1.8, LATENT = 2430;                 // m²; J per gram of sweat evaporated at skin temperature
// A simple heat balance for bare skin, the classic partitional approach (ASHRAE Fundamentals
// ch. 9; Gagge & Gonzalez; Parsons, Human Thermal Environments):
//  dry loss  = (hc + hr)·A·(Tskin − Tair), with hr ≈ 4.7 W/m²K for radiation to surroundings at air temperature;
//  needed evaporation Ereq = M − dry;
//  most evaporation possible Emax = LR·hc·A·(p_sat(Tskin) − RH·p_sat(Tair)), Lewis ratio LR = 16.5 K/kPa;
//  sweat rate = Ereq / latent heat (about 2,430 J/g at skin temperature).
// hc ≈ 3.5 W/m²K in still air and ≈ 10 W/m²K in a 1.5 m/s breeze (8.3·v^0.6). Skin temperature
// is set by blood flow and sweating: here an illustrative 24–36 °C (Guyton & Hall, 14th ed., ch. 74).
export function heat(Tair, RH, act = 'rest', breeze = false) {
  const M_ = ACT[act].M, hc = breeze ? 10 : 3.5, h = hc + 4.7;
  const Tsk = clamp((Tair < 28 ? 34 - 0.32 * (28 - Tair) : 34 + 0.13 * (Tair - 28)) + 0.4 * (M_ - 105) / 400, 24, 36);
  const dry = h * AREA * (Tsk - Tair);
  const Ereq = M_ - dry;
  const Emax = Math.max(0, 16.5 * hc * AREA * (psat(Tsk) - (RH / 100) * psat(Tair)));
  // Sweat glands can make about 1–2 L an hour at most (Guyton & Hall ch. 74; Sawka et al., ACSM
  // position stand, Med Sci Sports Exerc 39:377, 2007). 1.8 L/h is used as the ceiling.
  const want = Math.max(0, Ereq) * 3600 / LATENT;
  const sweat = Math.min(1800, want * (Ereq > Emax ? 1.25 : 1));          // g/h; more drips when it cannot all dry
  const vaso = clamp(Ereq < 0 ? Ereq / 160 : Ereq / 450, -1, 1);
  return { M: M_, Tsk, dry, Ereq, Emax, sweat, vaso, cold: Ereq < -25, over: Ereq > Emax + 5, ratio: Ereq / Math.max(1, Emax), Tw: wetBulb(Tair, RH) };
}
// Skin blood flow for the whole body: about 0.25–0.5 L/min when comfortable, near zero in cold,
// up to about 6–8 L/min in severe heat (Johnson & Kellogg; Rowell, Human Circulation, 1986).
export const skinFlow = (v) => (v < 0 ? lerp(0.35, 0.05, -v) : lerp(0.35, 7, v * v));
