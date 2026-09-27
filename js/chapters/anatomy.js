// Chapter 1: a magnified block of skin with its three layers and what lives in them.
// Facts (see js/skin.js for the anatomy sources):
//  - The skin is the body's largest organ: about 1.5 to 2 m² in an adult and about 3.5 to 4 kg
//    (Cleveland Clinic, "Skin: layers, structure and function": about 22 sq ft and 8 lb; NCI
//    SEER Training "Introduction to the Integumentary System"). Figures of about 15 to 16% of
//    body weight also appear; they count the skin differently (some include the fat beneath).
//  - Epidermis about 0.1 mm on most skin, 0.05 mm on the eyelids, up to 1.5 mm on the soles;
//    dermis about 1 to 4 mm (Kolarsick et al., J Dermatol Nurses Assoc 3:203, 2011).
//  - Eccrine sweat glands: about 2 to 4 million over the body (Guyton & Hall, 14th ed., ch. 74;
//    Taylor & Machado-Moreira, Extrem Physiol Med 2:4, 2013). Apocrine glands are mostly in the
//    armpits and groin and become active at puberty.
//  - About 5 million hair follicles over the body, about 100,000 of them on the scalp (AAD,
//    "Hair loss: who gets and causes"; Britannica "Hair").
import { THREE } from '../kit.js';
import { makeSkinBlock, tint, fitNarrow, compactReadout, inReel, Y, FRONT } from '../skin.js';

const VIEW = { pos: [1.0, 6.2, 11.2], target: [-2.2, 3.8, 0] };
const GROUPS = {
  layers: 'The layers', hair: 'Hair and glands', nerves: 'Nerves and vessels',
};

export default {
  id: 'anatomy',
  short: 'Inside your skin',
  title: 'The body’s largest organ',
  subtitle: 'Three layers, about 2 m² and 4 kg, packed with hair, glands, nerves and blood.',
  view: VIEW,
  learn: `<p>Your skin is an <b>organ</b>, and the biggest one you have: about <b>1.5 to 2 m²</b>, the size of a single bed sheet, and about <b>3.5 to 4 kg</b>. It keeps water in and germs out, holds your temperature at 37 °C, feels the world, and even makes vitamin D.</p>
    <p>This is a tiny block of it, magnified about 20 times, cut open like a model. On top is the <b>epidermis</b>, only about <b>0.1 mm</b> thick on most of the body (thicker on your soles, thinner on your eyelids; we drew it thicker so you can see it). Its outer skin, the <b>stratum corneum</b>, is made of dead, flattened cells. At its base, the <b>basal layer</b> makes new cells, and <b>melanocytes</b> there make the pigment melanin.</p>
    <p>Under it is the <b>dermis</b>, about 1 to 4 mm of tough, stretchy tissue made of <b>collagen</b> and <b>elastin</b> fibres. It holds the <b>blood vessels</b>, <b>nerves</b> and <b>touch receptors</b>, the <b>hair follicles</b> with their <b>sebaceous (oil) glands</b> and tiny <b>arrector pili</b> muscles, and the coiled <b>sweat glands</b>. Its bumpy top, the <b>dermal papillae</b>, locks into the epidermis like a zip so the layers don’t slide apart. Deepest is the <b>hypodermis</b>, a cushion of <b>fat</b> that stores energy and keeps heat in.</p>
    <p class="tip"><b>Try it:</b> pull the layers apart, then switch on X-ray to see the glands, vessels and receptors hidden inside. Change which labels are shown.</p>`,
  terms: [
    { t: 'Epidermis', d: 'The thin outer layer of skin, constantly renewed from its basal layer. It has no blood vessels of its own.' },
    { t: 'Stratum corneum', d: 'The outermost part of the epidermis: flat, dead cells full of keratin, glued with fats. It is the main barrier.' },
    { t: 'Dermis', d: 'The thick, tough middle layer, made of collagen and elastin, with blood vessels, nerves, glands and hair roots.' },
    { t: 'Hypodermis', d: 'The fatty layer under the dermis, also called subcutaneous tissue. It cushions, insulates and stores energy.' },
    { t: 'Melanocyte', d: 'A cell in the basal layer that makes melanin, the pigment that colours skin and hair and absorbs UV light.' },
    { t: 'Sebaceous gland', d: 'A small gland beside a hair follicle that makes sebum, an oil that coats hair and skin.' },
    { t: 'Eccrine gland', d: 'The common sweat gland, a coiled tube that opens straight onto the skin. You have about 2 to 4 million.' },
  ],
  defaults: { explode: 0, xray: false, show: 'layers', labels: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Pull the layers apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: see inside the layers' },
    { key: 'show', type: 'seg', label: 'Label', options: Object.entries(GROUPS).map(([v, label]) => ({ v, label })) },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Which is the skin’s outermost layer?', options: ['The dermis', 'The epidermis', 'The hypodermis', 'The muscle'], answer: 1, why: 'The epidermis is on top. Its outer part, the stratum corneum, is made of dead, flattened cells.' },
    { q: 'Where are the skin’s blood vessels, nerves and sweat glands?', options: ['In the stratum corneum', 'Mostly in the dermis', 'Only in the fat', 'The skin has none'], answer: 1, why: 'The epidermis has no blood vessels. The dermis holds the vessels, nerves, glands and hair roots.' },
    { q: 'About how big is an adult’s skin?', options: ['About the size of a postcard', 'About 1.5 to 2 m², like a bed sheet', 'About 20 m², like a room', 'About 200 m², like a tennis court'], answer: 1, why: 'Spread flat, adult skin covers about 1.5 to 2 m² and weighs about 3.5 to 4 kg.' },
  ],
  reel: [
    { ms: 5000, caption: 'Your skin is your largest organ: about 2 square metres and 4 kilograms.', set: { explode: 0, xray: false, labels: false }, view: { pos: [4.2, 6.4, 11.5], target: [0, 2.6, 0] }, spin: 0.35 },
    { ms: 5400, caption: 'Pull it apart: a thin epidermis on top, a tough dermis full of vessels and nerves, then fat.', set: { xray: true, labels: false }, anim: { explode: [0, 0.9] }, view: { pos: [3.4, 6.6, 12.5], target: [0, 2.6, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.y = 0.9; stage.root.add(root);
    const sk = makeSkinBlock(stage, { tone: 5 });
    root.add(sk.root);
    const L = (html, pos, parent, cls, set) => { const l = tint(stage.label(html, pos, parent), cls); l.userData.set = set; return l; };
    const z = FRONT + 0.3;
    const labs = [
      L('Stratum corneum (dead cells)', [2.4, Y.surf + 0.5, z], sk.G.corn, 'side', 'layers'),
      L('Epidermis', [3.0, Y.derm + 0.1, z], sk.G.epi, 'side', 'layers'),
      L('Dermis: collagen and elastin', [2.9, 2.75, z], sk.G.derm, 'side', 'layers'),
      L('Hypodermis: fat', [2.9, 0.55, z], sk.G.hypo, 'fat', 'layers'),
      L('Basal layer and melanocytes', [-2.2, Y.derm - 0.28, z], sk.G.epi, 'gold', 'layers'),
      L('Dermal papillae', [0.2, 3.1, z], sk.G.derm, '', 'layers'),
      L('Hair', [0.4, 5.3, z], sk.G.derm, 'gold', 'hair'),
      L('Sebaceous (oil) gland', [-1.1, 3.95, z], sk.G.derm, 'fat', 'hair'),
      L('Arrector pili muscle', [-2.5, 3.1, z], sk.G.derm, 'muscle', 'hair'),
      L('Hair follicle', [-2.55, 1.9, z], sk.G.derm, 'gold', 'hair'),
      L('Apocrine sweat gland', [-1.3, 0.35, z], sk.G.hypo, 'sweat', 'hair'),
      L('Eccrine sweat gland', [1.35, 1.55, z], sk.G.derm, 'sweat', 'hair'),
      L('Sweat pore', [1.4, Y.surf + 0.45, z], sk.G.corn, 'sweat', 'hair'),
      L('Pacinian corpuscle', [0.3, 0.25, z], sk.G.hypo, 'recep', 'nerves'),
      L('Ruffini ending', [2.35, 2.25, z], sk.G.derm, 'recep', 'nerves'),
      L('Meissner corpuscle', [2.6, Y.surf + 0.4, z], sk.G.derm, 'recep', 'nerves'),
      L('Merkel cells', [-0.4, Y.surf + 0.4, z], sk.G.epi, 'recep', 'nerves'),
      L('Free nerve endings', [1.4, 3.35, z], sk.G.derm, 'nerve', 'nerves'),
      L('Nerve', [0.55, 1.35, z], sk.G.derm, 'nerve', 'nerves'),
      L('Blood vessels', [-2.4, 1.55, z], sk.G.derm, 'blood', 'nerves'),
      L('Capillary loops', [-2.1, 3.0, z], sk.G.derm, 'blood', 'nerves'),
    ];
    const scale = tint(stage.label('1 mm', [-2.5, -0.35, FRONT], root), 'side');
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x8ef0ff })); bar.position.set(-2.5, -0.15, FRONT); root.add(bar);
    let xr = 0;
    const fit = fitNarrow(stage, { pos: [0.4, 6.6, 12.5], target: [0, 3.4, 0] });
    return compactReadout(stage, {
      update(dt, s) {
        dt = Math.max(0, dt);
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 6);
        sk.setXray(xr);
        sk.setExplode(s.explode);
        const narrow = fit();
        labs.forEach((l) => { l.visible = s.labels && l.userData.set === s.show && !(narrow && /Dermal papillae|Capillary|Basal/.test(l.element.textContent)); });
        scale.visible = bar.visible = s.labels && !inReel();
      },
      readout: (s) => `<div class="big">Your largest organ</div>
        <div class="row"><span>Area, adult</span><b>about 1.5 to 2 m²</b></div>
        <div class="row"><span>Mass, adult</span><b>about 3.5 to 4 kg</b></div>
        <div class="row"><span>Epidermis</span><b>about 0.1 mm (0.05 to 1.5)</b></div>
        <div class="row"><span>Dermis</span><b>about 1 to 4 mm</b></div>
        <div class="row"><span>Sweat glands</span><b>about 2 to 4 million</b></div>
        <small>${s.xray ? 'X-ray on: the layers are see-through.' : 'Magnified about 20 times. The epidermis is drawn thicker than life so you can see it.'}</small>`,
    });
  },
};
