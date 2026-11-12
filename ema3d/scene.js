// «Мадина и ЭМА» — 3D-мультик на three.js. Время анимации управляется снаружи: window.render(t)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const eout = x => 1 - Math.pow(1 - x, 3);
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, fi = .45, fo = .4) => Math.min(a <= 0 ? 1 : seg(t, a, a + fi), 1 - seg(t, b - fo, b));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const $ = id => document.getElementById(id);

// ---------- рендерер ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
$('stage').insertBefore(renderer.domElement, $('stage').firstChild);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 200);

const hemi = new THREE.HemisphereLight('#fff4f6', '#c98a9a', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3ea', 2.0);
sun.position.set(3, 7, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
sun.shadow.bias = -0.0004; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
const camLight = new THREE.PointLight('#ffd6de', 0, 14, 1.4); scene.add(camLight);

const mat = (color, rough = .55, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const mesh = (geo, m, parent, pos = [0, 0, 0], shadow = true) => {
  const o = new THREE.Mesh(geo, m); o.position.set(...pos);
  o.castShadow = shadow; o.receiveShadow = true; parent && parent.add(o); return o;
};
function gradientTex(c1, c2, c3) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512;
  const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, c1); gr.addColorStop(.6, c2 || c1); gr.addColorStop(1, c3 || c2 || c1);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- тексты: ru / uz (выбор через ?lang=uz) ----------
const TXT = {
  ru: {
    caps: ['«Миома. Нужна <b>операция</b>»…', 'Можно ли лечить <b>без разреза</b>?', 'Узлы миомы <b>питаются кровью</b>', 'через маточные артерии', '<b>ЭМА</b> — эмболизация маточных артерий', 'Тонкий катетер через прокол <b>на руке или бедре</b>', '✂️ Без разрезов · под местной анестезией', 'Микрочастицы <b>перекрывают сосуды</b>', 'которые питают узлы миомы', 'Узлы <b>уменьшаются</b>, симптомы уходят', 'Преимущества <b>ЭМА</b>', 'Подходит ли вам ЭМА — <b>решает врач</b>', 'после обследования: УЗИ или МРТ', 'Информация носит ознакомительный характер. Есть противопоказания, необходима консультация специалиста'],
    pills: ['💗 Матка сохраняется', '📌 Сохрани · 💌 Отправь подруге'],
    cards: ['Без разрезов и швов', 'Процедура — около часа', 'Выписка через 1–2 дня', 'Матка сохраняется', 'Помогает и при аденомиозе'],
    paper: ['УЗИ', 'миома'],
  },
  uz: {
    caps: [
      '«Mioma. <b>Operatsiya</b> kerak»…',
      '<b>Kesmasdan</b> davolash mumkinmi?',
      'Mioma tugunlari <b>qon bilan oziqlanadi</b>',
      'bachadon arteriyalari orqali',
      '<b>EMA</b> — bachadon arteriyalari embolizatsiyasi',
      'Ingichka kateter <b>qo‘l yoki sondagi</b> kichik teshik orqali kiritiladi',
      '✂️ Kesiksiz · mahalliy og‘riqsizlantirish ostida',
      'Mikrozarrachalar <b>tomirlarni berkitadi</b>',
      'mioma tugunlarini oziqlantiradigan',
      'Tugunlar <b>kichrayadi</b>, belgilar yo‘qoladi',
      '<b>EMA</b> afzalliklari',
      'EMA sizga mos keladimi — <b>shifokor hal qiladi</b>',
      'tekshiruvdan keyin: UTT yoki MRT',
      'Ma’lumot tanishish uchun berilgan. Qarshi ko‘rsatmalar mavjud, mutaxassis maslahati zarur',
    ],
    tops: { 1: 470, 3: 470, 5: 470, 8: 470 },
    pills: ['💗 Bachadon saqlanadi', '📌 Saqlang · 💌 Dugonangizga yuboring'],
    ctaSize: 40,
    cards: ['Kesiksiz va choksiz', 'Muolaja — taxminan 1 soat', '1–2 kunda uyga qaytasiz', 'Bachadon saqlanadi', 'Adenomiozda ham yordam beradi'],
    paper: ['UTT', 'mioma'],
  },
};
const LANG = new URLSearchParams(location.search).get('lang') || 'ru';
const L = TXT[LANG] || TXT.ru;
const TOP = (i, d) => (L.tops && L.tops[i] != null) ? L.tops[i] : d;

// ================= Мадина =================
function makeGirl() {
  const skin = mat('#f6c9a8', .6), hair = mat('#3a2320', .5), dress = mat('#ff7a95', .55), dark = mat('#2b1b17', .3);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const capsule = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 16);
  for (const sx of [-1, 1]) {
    mesh(capsule(.085, .42), skin, body, [sx * .12, .32, 0]);
    const shoe = mesh(new THREE.SphereGeometry(1, 24, 16), mat('#a8304f', .4), body, [sx * .12, .06, .05]); shoe.scale.set(.12, .08, .19);
  }
  const prof = [[0, .5], [.43, .5], [.41, .56], [.34, .78], [.25, 1.02], [.19, 1.16], [.15, 1.22], [0, 1.24]].map(p => new THREE.Vector2(p[0], p[1]));
  mesh(new THREE.LatheGeometry(prof, 48), dress, body);
  const belt = mesh(new THREE.TorusGeometry(.262, .028, 12, 48), mat('#e4577a', .45), body, [0, .97, 0]); belt.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.06, .07, .16, 16), skin, body, [0, 1.27, 0]);
  const head = new THREE.Group(); head.position.set(0, 1.68, 0); body.add(head);
  mesh(new THREE.SphereGeometry(.42, 48, 32), skin, head);
  const hb = mesh(new THREE.SphereGeometry(.45, 48, 32), hair, head, [0, .05, -.08]); hb.scale.set(1, 1, .95);
  const cap = mesh(new THREE.SphereGeometry(.445, 48, 24, 0, Math.PI * 2, 0, Math.PI * .3), hair, head, [0, .02, .0]); cap.rotation.x = .42;
  mesh(new THREE.SphereGeometry(.2, 32, 24), hair, head, [0, .44, -.12]);
  mesh(new THREE.SphereGeometry(.06, 16, 12), mat('#ff7096', .4), head, [.22, .36, .05]);
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(.07, 16, 12), skin, head, [sx * .42, -.02, 0]);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * .15, .02, .385); head.add(e);
    const ball = mesh(new THREE.SphereGeometry(.058, 24, 16), dark, e, [0, 0, 0], false); ball.scale.set(1, 1.15, .55);
    mesh(new THREE.SphereGeometry(.018, 12, 8), mat('#ffffff', .2), e, [.02, .03, .03], false);
    eyes.push(e);
    const ch = mesh(new THREE.SphereGeometry(.075, 16, 12), mat('#ff8fa3', .6, { transparent: true, opacity: .65 }), head, [sx * .25, -.1, .33], false); ch.scale.set(1, .6, .35);
  }
  const brows = [];
  for (const sx of [-1, 1]) { const b = mesh(new THREE.CapsuleGeometry(.014, .09, 4, 8), hair, head, [sx * .15, .13, .4], false); b.rotation.z = Math.PI / 2; brows.push(b); }
  mesh(new THREE.SphereGeometry(.03, 12, 8), mat('#eab08f', .6), head, [0, -.06, .42], false);
  const mouth = mesh(new THREE.TorusGeometry(.065, .017, 8, 24, Math.PI), mat('#8a2c3a', .4), head, [0, -.15, .395], false);
  const mouthOpen = mesh(new THREE.SphereGeometry(.06, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#8a2c3a', .4), head, [0, -.15, .385], false);
  mouthOpen.scale.set(1, 1, .4);
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * .2, 1.13, 0); body.add(sh);
    mesh(capsule(.065, .2), dress, sh, [0, -.13, 0]);
    const el = new THREE.Group(); el.position.set(0, -.3, 0); sh.add(el);
    mesh(capsule(.055, .2), skin, el, [0, -.12, 0]);
    mesh(new THREE.SphereGeometry(.072, 16, 12), skin, el, [0, -.28, 0]);
    arms.push({ sh, el });
  }
  // листок с заключением УЗИ
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 330;
  const paperTex = new THREE.CanvasTexture(cv); paperTex.colorSpace = THREE.SRGBColorSpace;
  const drawPaper = () => {
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 330);
    c.fillStyle = '#3a1f2b'; c.font = '900 44px Nunito'; c.fillText(L.paper[0], 24, 60);
    c.fillStyle = '#cfd8dc'; for (let i = 0; i < 5; i++) c.fillRect(24, 95 + i * 30, 200 - (i % 2) * 50, 12);
    c.fillStyle = '#e8336f'; c.font = '900 40px Nunito'; c.fillText(L.paper[1], 24, 290); paperTex.needsUpdate = true;
  };
  const paper = mesh(new THREE.BoxGeometry(.42, .54, .01), [mat('#fff'), mat('#fff'), mat('#fff'), mat('#fff'), new THREE.MeshStandardMaterial({ map: paperTex, roughness: .7 }), mat('#fff')], body, [0, .98, .4]);
  paper.rotation.x = -.35;
  function pose(p) {
    const P = { armL: [0, -.15, 0], armR: [0, .15, 0], mood: 0, blink: 1, rotY: 0, bob: 0, paper: 0, tilt: 0, ...p };
    [P.armL, P.armR].forEach((a, i) => { arms[i].sh.rotation.set(a[0], 0, a[1]); arms[i].el.rotation.x = a[2]; });
    eyes.forEach(e => e.scale.y = Math.max(.08, P.blink));
    const sad = clamp(-P.mood), hap = clamp(P.mood);
    mouth.rotation.z = P.mood >= 0 ? Math.PI : 0;
    mouth.scale.set(1, P.mood >= 0 ? .6 + hap * .6 : .6 + sad * .4, 1);
    mouth.position.y = P.mood >= 0 ? -.13 : -.17;
    mouthOpen.visible = hap > .6; mouth.visible = !mouthOpen.visible;
    brows[0].rotation.z = Math.PI / 2 - .35 * sad + .1 * hap; brows[1].rotation.z = Math.PI / 2 + .35 * sad - .1 * hap;
    brows.forEach(b => b.position.y = .13 + .02 * sad + .02 * hap);
    body.position.y = P.bob; body.rotation.z = P.tilt; g.rotation.y = P.rotY;
    paper.visible = P.paper > 0;
  }
  return { g, pose, drawPaper };
}
const madina = makeGirl(); scene.add(madina.g);

// ================= Сцена 1: комната =================
const room = new THREE.Group(); scene.add(room);
mesh(new THREE.PlaneGeometry(30, 30), mat('#f4c3c3', .9), room).rotation.x = -Math.PI / 2;
const wallB = mesh(new THREE.PlaneGeometry(30, 12), mat('#ffe3dd', .95), room, [0, 6, -3]);
const wallL = mesh(new THREE.PlaneGeometry(12, 12), mat('#ffd3cf', .95), room, [-4.2, 6, 3]); wallL.rotation.y = Math.PI / 2;
mesh(new THREE.CylinderGeometry(1.7, 1.7, .03, 64), mat('#ffb3c1', .95), room, [0, .015, .3]);
{ // окно
  const w = new THREE.Group(); w.position.set(1.7, 2.6, -2.95); room.add(w);
  mesh(new RoundedBoxGeometry(1.7, 2.0, .12, 4, .05), mat('#ffffff', .5), w);
  mesh(new THREE.PlaneGeometry(1.5, 1.8), mat('#bfe6ff', .3, { emissive: '#bfe6ff', emissiveIntensity: .55 }), w, [0, 0, .065]);
  mesh(new THREE.BoxGeometry(.06, 1.8, .06), mat('#fff'), w, [0, 0, .09]); mesh(new THREE.BoxGeometry(1.5, .06, .06), mat('#fff'), w, [0, 0, .09]);
  for (const sx of [-1, 1]) { const c = mesh(new RoundedBoxGeometry(.45, 2.4, .08, 3, .03), mat('#ff9fb4', .8), w, [sx * 1.0, -.1, .15]); }
}
{ // диван
  const s = new THREE.Group(); s.position.set(-.3, 0, -1.9); room.add(s);
  const m = mat('#8fd3c3', .7);
  mesh(new RoundedBoxGeometry(2.8, .5, 1.0, 5, .15), m, s, [0, .35, 0]);
  mesh(new RoundedBoxGeometry(2.8, 1.0, .35, 5, .15), m, s, [0, .85, -.38]);
  for (const sx of [-1, 1]) mesh(new RoundedBoxGeometry(.35, .75, 1.0, 5, .15), m, s, [sx * 1.4, .55, 0]);
  mesh(new RoundedBoxGeometry(.6, .5, .18, 4, .08), mat('#ffd36e', .7), s, [.7, .85, -.15]).rotation.z = .2;
}
{ // растение
  const p = new THREE.Group(); p.position.set(-2.6, 0, -1.2); room.add(p);
  mesh(new THREE.CylinderGeometry(.32, .24, .6, 32), mat('#e97a5a', .6), p, [0, .3, 0]);
  const leaf = mat('#5fbf7f', .6);
  [[0, 1.0, 0, .38], [-.25, .85, .1, .3], [.25, .9, -.05, .32], [0, 1.35, .05, .28], [.15, 1.2, .2, .22]].forEach(([x, y, z, r]) => mesh(new THREE.SphereGeometry(r, 24, 16), leaf, p, [x, y, z]));
}
{ // торшер
  const l = new THREE.Group(); l.position.set(2.6, 0, -1.5); room.add(l);
  mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 12), mat('#a1586c'), l, [0, 1.1, 0]);
  mesh(new THREE.CylinderGeometry(.3, .3, .05, 32), mat('#a1586c'), l, [0, .03, 0]);
  mesh(new THREE.CylinderGeometry(.25, .45, .5, 32, 1, true), mat('#ffe08a', .5, { emissive: '#ffd36e', emissiveIntensity: .6, side: THREE.DoubleSide }), l, [0, 2.3, 0]);
}
const bgRoom = gradientTex('#ffe9e4', '#ffd7dc');

// ================= Сцены 2 и 5: матка с узлами и сосудами =================
const uterusG = new THREE.Group(); scene.add(uterusG);
const pink = mat('#f48fb1', .5);
function uterusGeo() {
  const g = new THREE.SphereGeometry(1, 96, 64); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = lerp(.42, 1.08, eio(clamp((y + 1) / 1.45)));
    x *= k * 1.05; z *= k * .72; if (y > 0) y *= .82;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
const uGeo = uterusGeo();
mesh(uGeo, pink, uterusG);
mesh(new THREE.CapsuleGeometry(.3, .45, 8, 24), pink, uterusG, [0, -1.15, 0]);
const tubes = [];
for (const sx of [-1, 1]) {
  const c = new THREE.CatmullRomCurve3([[.8, .45, 0], [1.4, .85, .05], [2.05, .7, .1], [2.35, .15, .2]].map(v => new THREE.Vector3(v[0] * sx, v[1], v[2])));
  mesh(new THREE.TubeGeometry(c, 48, .1, 16), pink, uterusG);
  for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(.09, 12, 8), pink, uterusG, [sx * (2.35 + Math.cos(i) * .14), .05 + Math.sin(i * 1.3) * .14, .22]);
  const ov = mesh(new THREE.SphereGeometry(.32, 32, 24), mat('#f9c1d6', .5), uterusG, [sx * 1.7, -.25, .15]); ov.scale.set(1, .7, .7);
}
function makeFibroid(r) {
  const g = new THREE.Group();
  const m = mat('#d0566f', .45);
  const ball = mesh(new THREE.SphereGeometry(r, 48, 32), m, g);
  const face = new THREE.Group(); face.position.z = r * .93; g.add(face);
  const dk = mat('#3b1420', .3);
  const eyes = [-1, 1].map(sx => { const e = mesh(new THREE.SphereGeometry(r * .12, 16, 12), dk, face, [sx * r * .3, r * .08, r * .02], false); e.scale.z = .5; return e; });
  const brows = [-1, 1].map(sx => { const b = mesh(new THREE.CapsuleGeometry(r * .03, r * .2, 4, 8), dk, face, [sx * r * .3, r * .3, r * .0], false); b.rotation.z = Math.PI / 2 + sx * .45; return b; });
  const mouth = mesh(new THREE.TorusGeometry(r * .14, r * .035, 8, 20, Math.PI), dk, face, [0, -r * .3, -r * .02], false);
  return { g, ball, m, eyes, brows, mouth, r };
}
const fibs = [[.55, .62, .5, .38], [-.72, .05, .5, .3], [.12, -.2, .66, .22]].map(([x, y, z, r]) => { const f = makeFibroid(r); f.g.position.set(x, y, z); uterusG.add(f.g); return f; });
// сосуды: маточные артерии и ветви к узлам
const artMat = mat('#e0303f', .4, { emissive: '#ff2a3c', emissiveIntensity: .25 });
const branchMat = mat('#e0303f', .4, { emissive: '#ff2a3c', emissiveIntensity: .25 });
const vessels = [];
for (const sx of [-1, 1]) {
  const c = new THREE.CatmullRomCurve3([[2.3, -2.0, .3], [1.5, -1.3, .45], [.95, -.75, .55], [.98, .1, .55]].map(v => new THREE.Vector3(v[0] * sx, v[1], v[2])));
  vessels.push(mesh(new THREE.TubeGeometry(c, 64, .06, 12), artMat, uterusG));
}
const branchPts = [
  [[.98, .1, .55], [.95, .45, .6], [.75, .62, .72]],
  [[-.98, .1, .55], [-.9, .1, .62], [-.85, .08, .68]],
  [[.98, -.3, .55], [.6, -.35, .72], [.25, -.25, .82]],
];
const branches = branchPts.map(pts => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v))), 32, .045, 10), branchMat, uterusG));
const plugs = branchPts.map(pts => { const p = new THREE.Group(); p.position.set(...pts[1]); uterusG.add(p);
  for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(.035, 12, 8), mat('#5fe0ff', .3, { emissive: '#3fd8ff', emissiveIntensity: 1.2 }), p, [(rnd() - .5) * .1, (rnd() - .5) * .1, (rnd() - .5) * .08], false);
  return p; });
const bgUterus = gradientTex('#fff1f6', '#fbd3e2', '#efb0c8');

// ================= Сцена 3: путь катетера («рентген») =================
const xray = new THREE.Group(); scene.add(xray);
const glass = new THREE.MeshStandardMaterial({ color: '#a9dcff', roughness: .3, transparent: true, opacity: .3, depthWrite: false, emissive: '#4a8be0', emissiveIntensity: .45 });
const bodyParts = [
  [new THREE.SphereGeometry(.4, 32, 24), [0, 3.2, 0]],
  [new THREE.CapsuleGeometry(.62, .95, 8, 32), [0, 1.78, 0]],
  [new THREE.CylinderGeometry(.14, .16, .3, 16), [0, 2.85, 0]],
];
bodyParts.forEach(([g, p]) => mesh(g, glass, xray, p, false));
for (const sx of [-1, 1]) {
  const a = mesh(new THREE.CapsuleGeometry(.16, 1.2, 8, 16), glass, xray, [sx * 1.0, 1.78, 0], false); a.rotation.z = sx * .32;
  mesh(new THREE.CapsuleGeometry(.22, 1.35, 8, 16), glass, xray, [sx * .3, -.25, 0], false);
}
const pathPts = [[1.27, .95, .12], [1.12, 1.65, .12], [.82, 2.38, .14], [.38, 2.5, .18], [.06, 2.32, .2], [0, 1.65, .22], [0, 1.0, .22], [.2, .72, .22], [.14, .55, .28], [.02, .5, .32]].map(v => new THREE.Vector3(...v));
const cathCurve = new THREE.CatmullRomCurve3(pathPts);
mesh(new THREE.TubeGeometry(cathCurve, 200, .028, 8), mat('#ff4b5c', .4, { emissive: '#ff2a3c', emissiveIntensity: .6 }), xray, [0, 0, 0], false);
const cathGeo = new THREE.TubeGeometry(cathCurve, 200, .05, 10);
const cath = mesh(cathGeo, mat('#7ff3ff', .2, { emissive: '#3fe0ff', emissiveIntensity: 1.6 }), xray, [0, 0, 0], false);
const cathTip = mesh(new THREE.SphereGeometry(.09, 16, 12), mat('#ffffff', .2, { emissive: '#9ff7ff', emissiveIntensity: 2.5 }), xray, [0, 0, 0], false);
const wristRing = mesh(new THREE.TorusGeometry(.14, .025, 8, 32), mat('#ffffff', .2, { emissive: '#fff59d', emissiveIntensity: 2 }), xray, [1.27, .95, .14], false);
const miniU = mesh(uGeo, mat('#ff8fb3', .4, { emissive: '#ff6f9f', emissiveIntensity: .5 }), xray, [0, .48, .3], false); miniU.scale.setScalar(.2);
const bgXray = gradientTex('#16213d', '#22365f', '#2c4a7c');

// ================= Сцена 4: полёт внутри артерии =================
const tunnel = new THREE.Group(); scene.add(tunnel);
const tPts = []; for (let i = 0; i <= 14; i++) tPts.push(new THREE.Vector3(Math.sin(i * .9) * 1.6, Math.cos(i * .7) * 1.2, -i * 5));
const tCurve = new THREE.CatmullRomCurve3(tPts);
const tGeo = new THREE.TubeGeometry(tCurve, 600, 1.15, 48);
mesh(tGeo, mat('#c9405a', .75, { side: THREE.BackSide, emissive: '#5a0d20', emissiveIntensity: .35 }), tunnel, [0, 0, 0], false);
const frames = tCurve.computeFrenetFrames(600, false);
const frameAt = u => { const i = Math.round(clamp(u) * 600); return { n: frames.normals[i], b: frames.binormals[i], p: tCurve.getPointAt(clamp(u)) }; };
const offsetPt = (u, r, a) => { const f = frameAt(u); return f.p.clone().addScaledVector(f.n, Math.cos(a) * r).addScaledVector(f.b, Math.sin(a) * r); };
// катетер — чуть ниже центра
const cPts = []; for (let i = 0; i <= 120; i++) cPts.push(offsetPt(i / 120, .5, Math.PI * .75));
const cCurve2 = new THREE.CatmullRomCurve3(cPts);
const tCath = mesh(new THREE.TubeGeometry(cCurve2, 600, .085, 16), mat('#e9f1f5', .35, { emissive: '#bfefff', emissiveIntensity: .15 }), tunnel, [0, 0, 0], false);
const tCathTip = mesh(new THREE.SphereGeometry(.095, 20, 14), mat('#f4fbff', .3, { emissive: '#9ff7ff', emissiveIntensity: .6 }), tunnel, [0, 0, 0], false);
// эритроциты
const rbcGeo = new THREE.LatheGeometry([[0, -.05], [.12, -.07], [.2, -.05], [.24, 0], [.2, .05], [.12, .07], [0, .05]].map(p => new THREE.Vector2(p[0], p[1])), 24);
const RBC = 170, rbc = new THREE.InstancedMesh(rbcGeo, mat('#e2384f', .45, { emissive: '#7a0d1f', emissiveIntensity: .3 }), RBC); rbc.frustumCulled = false; tunnel.add(rbc);
const rbcData = Array.from({ length: RBC }, () => ({ u: rnd(), r: .55 + rnd() * .42, a: rnd() * 6.28, rx: rnd() * 6, ry: rnd() * 6, s: .8 + rnd() * .5 }));
// микросферы
const MS = 160, micro = new THREE.InstancedMesh(new THREE.SphereGeometry(.085, 14, 10), mat('#05506f', .3, { emissive: '#0fb4f0', emissiveIntensity: 1.6 }), MS); micro.frustumCulled = false; tunnel.add(micro);
const camU = t => lerp(.02, .46, eio(seg(t, 18.5, 25.2)));
const msData = Array.from({ length: MS }, (_, i) => ({ rel: 20.4 + i / MS * 5.2 + rnd() * .2, r: rnd() * .5, a: rnd() * 6.28, sp: .028 + rnd() * .012, pile: rnd() }));
const dummy = new THREE.Object3D();
const plugGlow = new THREE.PointLight('#3fd8ff', 0, 6, 1.2); tunnel.add(plugGlow);

// ================= Сцены 6–7: студия =================
const studio = new THREE.Group(); scene.add(studio);
mesh(new THREE.CylinderGeometry(3.2, 3.3, .25, 96), mat('#ffe1ea', .8), studio, [0, -.125, 0]);
mesh(new THREE.TorusGeometry(3.25, .06, 12, 96), mat('#ff9fb8', .5), studio, [0, 0, 0]).rotation.x = Math.PI / 2;
const heartShape = new THREE.Shape(); heartShape.moveTo(0, .25); heartShape.bezierCurveTo(0, .3, -.1, .5, -.3, .5); heartShape.bezierCurveTo(-.65, .5, -.65, .1, -.65, .1);
heartShape.bezierCurveTo(-.65, -.1, -.45, -.35, 0, -.6); heartShape.bezierCurveTo(.45, -.35, .65, -.1, .65, .1); heartShape.bezierCurveTo(.65, .1, .65, .5, .3, .5); heartShape.bezierCurveTo(.1, .5, 0, .3, 0, .25);
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: .18, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 4, curveSegments: 16 }); heartGeo.center();
const hearts = Array.from({ length: 34 }, (_, i) => {
  const m = mesh(heartGeo, mat(['#ff5c8a', '#ff8fab', '#ffc94d', '#ff7a95', '#b388ff', '#5fd3a0'][i % 6], .35), studio, [0, 0, 0], false);
  return { m, x: (rnd() - .5) * 7, z: (rnd() - .5) * 3 - .5, d: rnd() * 8, sp: .9 + rnd() * .7, rs: (rnd() - .5) * 4, sc: .18 + rnd() * .16 };
});
const bgStudio = gradientTex('#ffe0ea', '#fff0e6', '#ffd0df');
const bgFinal = gradientTex('#ffc7da', '#ffe7d6', '#ffbcd2');

// ================= Текстовый слой =================
const layer = $('layer');
const mk = (cls, html, top) => { const d = document.createElement('div'); d.className = cls; d.style.top = top + 'px'; d.innerHTML = '<div>' + html + '</div>'; layer.appendChild(d); return d; };
const CAPS = [
  ['cap big', L.caps[0], TOP(0, 250), .4, 5.5],
  ['cap sub', L.caps[1], TOP(1, 440), 1.8, 5.5],
  ['cap big', L.caps[2], TOP(2, 250), 5.9, 11.5],
  ['cap sub', L.caps[3], TOP(3, 440), 6.8, 11.5],
  ['cap big', L.caps[4], TOP(4, 250), 11.9, 18.5],
  ['cap sub', L.caps[5], TOP(5, 450), 13.2, 18.5],
  ['cap sub', L.caps[6], TOP(6, 1360), 14.8, 18.5],
  ['cap big', L.caps[7], TOP(7, 250), 18.9, 27.5],
  ['cap sub', L.caps[8], TOP(8, 450), 20.2, 27.5],
  ['cap big', L.caps[9], TOP(9, 250), 27.9, 35.0],
  ['cap big', L.caps[10], TOP(10, 250), 35.4, 45.0],
  ['cap big', L.caps[11], TOP(11, 250), 45.4, 56],
  ['cap sub', L.caps[12], TOP(12, 450), 46.4, 56],
  ['cap tiny', L.caps[13], TOP(13, 690), 50.0, 56],
].map(([c, h, top, a, b]) => ({ el: mk(c, h, top), a, b, k: 'cap' }));
const pill = (html, top, a, b, bg, sh, fs = 54) => { const d = mk('pill', html, top); d.firstChild.style.cssText = `background:${bg};box-shadow:0 8px 0 ${sh},0 16px 30px rgba(0,0,0,.25);font-size:${fs}px`; return { el: d, a, b, k: 'pill' }; };
const PILLS = [
  pill(L.pills[0], 1380, 30.6, 35.0, '#2fb36d', '#1e8a50'),
  pill(L.pills[1], (L.pillTops && L.pillTops[1]) || 575, 49.2, 56, '#e8336f', '#b51f52', L.ctaSize || 46),
];
const CARDS = ['✂️', '⏱️', '🏠', '💗', '✅'].map((ic, i) => [ic, L.cards[i]])
  .map(([ic, txt], i) => { const d = document.createElement('div'); d.className = 'card'; d.style.left = '60px'; d.style.top = (470 + i * 152) + 'px'; d.style.width = '660px';
    d.innerHTML = `<div class="ic">${ic}</div><div>${txt}</div>`; layer.appendChild(d); return { el: d, a: 36.2 + i * 1.3, b: 45.0, k: 'card' }; });

// ================= render(t) =================
const B = [5.5, 11.5, 18.5, 27.5, 35, 45];
const shotAt = t => B.filter(b => t >= b).length; // 0..6
const blinkAt = (t, o = 0) => { const ph = (t + o) % 3.4; return ph < .14 ? Math.abs(ph - .07) / .07 : 1; };

function render(t) {
  const shot = shotAt(t);
  room.visible = shot === 0; uterusG.visible = shot === 1 || shot === 4; xray.visible = shot === 2;
  tunnel.visible = shot === 3; studio.visible = shot >= 5; madina.g.visible = shot === 0 || shot >= 5;
  scene.fog = null; camLight.intensity = 0; sun.intensity = 2.0; hemi.intensity = .9; scene.environmentIntensity = .55;
  let dip = 0; for (const b of B) dip = Math.max(dip, 1 - Math.abs(t - b) / .38); $('dip').style.opacity = clamp(dip);
  const tgt = new THREE.Vector3();

  if (shot === 0) { // комната
    scene.background = bgRoom;
    const k = eio(seg(t, 0, 5.5));
    camera.fov = 35; camera.position.set(lerp(-1.2, .25, k), lerp(3.2, 2.3, k), lerp(10.5, 6.6, k)); tgt.set(0, 1.85, 0);
    madina.g.position.set(0, 0, .3);
    madina.pose({ armL: [-1.0, .28, -.9], armR: [-1.0, -.28, -.9], mood: lerp(-.3, -.9, seg(t, .5, 3)), blink: blinkAt(t), paper: 1, tilt: Math.sin(t * 1.5) * .02, rotY: Math.sin(t * .8) * .08 });
  }
  else if (shot === 1 || shot === 4) { // матка
    scene.background = bgUterus;
    const s4 = shot === 4;
    const ang = s4 ? lerp(.35, -.2, eio(seg(t, 27.5, 35))) : lerp(-.45, .3, eio(seg(t, 5.5, 11.5)));
    const dist = s4 ? 12.5 : lerp(15, 12.5, eio(seg(t, 5.5, 11.5)));
    camera.fov = 35; camera.position.set(Math.sin(ang) * dist, 1.4, Math.cos(ang) * dist); tgt.set(0, -1.6, 0);
    uterusG.position.set(0, -.55, 0); uterusG.rotation.y = Math.sin(t * .5) * .05;
    const pulse = .25 + .35 * (.5 + .5 * Math.sin(t * 7));
    artMat.emissiveIntensity = pulse;
    const shrink = s4 ? eio(seg(t, 28.6, 33.5)) : 0;
    const gray = s4 ? seg(t, 28.0, 29.2) : 0;
    branchMat.color.set('#e0303f').lerp(new THREE.Color('#9a8f99'), gray); branchMat.emissiveIntensity = pulse * (1 - gray);
    plugs.forEach(p => p.visible = s4);
    fibs.forEach((f, i) => {
      const grow = s4 ? 1 : back(seg(t, 6.2 + i * .45, 6.9 + i * .45));
      f.g.scale.setScalar(Math.max(.001, grow * lerp(1, .42, shrink)) * (1 + Math.sin(t * 4 + i) * .025));
      f.m.color.set('#d0566f').lerp(new THREE.Color('#f2c6d3'), shrink);
      f.eyes.forEach(e => e.scale.y = s4 ? lerp(1, .12, seg(t, 29.5, 30.5)) : blinkAt(t, i));
      f.brows.forEach((b, j) => b.rotation.z = Math.PI / 2 + (j ? -1 : 1) * lerp(.45, -.1, shrink));
      f.mouth.rotation.z = shrink > .5 ? Math.PI : 0;
      f.g.rotation.z = Math.sin(t * 2 + i) * .08;
    });
  }
  else if (shot === 2) { // рентген
    scene.background = bgXray; sun.intensity = .6; hemi.intensity = .5; scene.environmentIntensity = .3;
    const p = eio(seg(t, 13.0, 17.6));
    const cnt = cathGeo.index.count; cath.geometry.setDrawRange(0, Math.max(6, Math.floor(cnt * p / 6) * 6));
    cathTip.position.copy(cathCurve.getPointAt(clamp(p)));
    cathTip.scale.setScalar(1 + .25 * Math.sin(t * 10));
    wristRing.scale.setScalar(1 + .3 * Math.sin(t * 6)); wristRing.visible = t < 15.5;
    miniU.material.emissiveIntensity = .4 + .4 * seg(t, 16.5, 17.6) * (.5 + .5 * Math.sin(t * 8));
    const z = eio(seg(t, 11.5, 18.5));
    camera.fov = 35; camera.position.set(lerp(1.3, .8, z), lerp(1.9, 1.5, z), lerp(10.2, 9.0, z)); tgt.set(lerp(.7, .5, z), lerp(1.55, 1.35, z), 0);
  }
  else if (shot === 3) { // артерия
    scene.background = new THREE.Color('#3a0612'); scene.fog = new THREE.Fog('#4a0817', 2, 19);
    sun.intensity = 0; hemi.intensity = .25; scene.environmentIntensity = .15;
    const cu = camU(t);
    const cp = tCurve.getPointAt(cu), look = tCurve.getPointAt(cu + .03);
    camera.fov = 60; camera.position.copy(cp); tgt.copy(look);
    camLight.position.copy(cp); camLight.intensity = 7;
    const tipU = cu + .065;
    const per = 16 * 6, s0 = Math.floor((cu + .028) * 600) * per, s1 = Math.floor(clamp(tipU) * 600) * per; tCath.geometry.setDrawRange(s0, Math.max(0, s1 - s0));
    tCathTip.position.copy(cCurve2.getPointAt(clamp(tipU)));
    rbcData.forEach((d, i) => {
      const F = t - .2 * Math.pow(clamp(t - 24, 0, 2), 2) - .8 * Math.max(0, t - 26); // кровоток замедляется после закупорки
      let u = (d.u + F * .012 * d.s) % 1;
      dummy.position.copy(offsetPt(u, d.r, d.a + t * .2)); dummy.rotation.set(d.rx + t * d.s, d.ry + t * .7, 0); dummy.scale.setScalar(.75);
      dummy.updateMatrix(); rbc.setMatrixAt(i, dummy.matrix);
    }); rbc.instanceMatrix.needsUpdate = true;
    const uEnd = camU(99) + .072;
    msData.forEach((d, i) => {
      const lt = t - d.rel;
      if (lt < 0) { dummy.scale.setScalar(0); }
      else {
        const startU = camU(d.rel) + .065;
        let u = startU + lt * (d.sp * 6 + .05); const piled = u >= uEnd - d.pile * .012;
        if (piled) u = uEnd - d.pile * .012;
        dummy.position.copy(offsetPt(u, piled ? Math.sqrt(d.r * 2) * .95 : d.r * (1 - Math.exp(-lt * 3)), d.a));
        if (!piled) dummy.position.add(offsetPt(u, .5 * Math.exp(-lt * 2.5), Math.PI * .75).sub(tCurve.getPointAt(u)));
        dummy.scale.setScalar(piled ? 1.25 : 1);
      }
      dummy.updateMatrix(); micro.setMatrixAt(i, dummy.matrix);
    }); micro.instanceMatrix.needsUpdate = true;
    plugGlow.position.copy(tCurve.getPointAt(uEnd)); plugGlow.intensity = 5 * seg(t, 23.5, 26.5);
  }
  else { // студия: 5 — преимущества, 6 — финал
    const fin = shot === 6;
    scene.background = fin ? bgFinal : bgStudio;
    const ang = fin ? lerp(-.6, .6, eio(seg(t, 45, 56))) : lerp(.35, .05, eio(seg(t, 35, 45)));
    camera.fov = 35; camera.position.set(Math.sin(ang) * 8.6, 2.4, Math.cos(ang) * 8.6);
    if (fin) {
      tgt.set(0, 2.25, 0); madina.g.position.set(0, 0, 0);
      const jt = t - 45.6, jump = jt > 0 ? Math.abs(Math.sin(jt * 3.8)) * .35 * (t < 50 ? 1 : .5) : 0;
      madina.pose({ armL: [0, -2.55, -.2], armR: [0, 2.55 + Math.sin(t * 7) * .15, .2], mood: 1, blink: blinkAt(t), bob: jump, rotY: Math.sin(t * 1.3) * .15 });
    } else {
      tgt.set(-.95, 2.1, 0); madina.g.position.set(0, 0, 0);
      madina.pose({ armL: [0, -.15, 0], armR: [0, 2.3 + Math.sin(t * 6) * .25, .5], mood: .8, blink: blinkAt(t), rotY: -.25 + Math.sin(t) * .05 });
    }
    hearts.forEach(h => {
      const lt = t - 45.6 - h.d; h.m.visible = fin && lt > 0;
      if (lt > 0) { h.m.position.set(h.x + Math.sin(lt * 1.5 + h.d) * .3, 6.5 - lt * h.sp, h.z); h.m.rotation.set(Math.sin(lt) * .4, lt * h.rs, Math.sin(lt * .7) * .3); h.m.scale.setScalar(h.sc); }
    });
  }
  camera.aspect = W / H; camera.updateProjectionMatrix(); camera.lookAt(tgt);
  sun.target.position.set(0, 0, 0);
  renderer.render(scene, camera);

  for (const c of CAPS) { const o = win(t, c.a, c.b, .4, .35), k = eout(seg(t, c.a, c.a + .45)); c.el.style.opacity = o; c.el.style.transform = `translateY(${(1 - k) * 50}px) scale(${.92 + .08 * k})`; }
  for (const c of PILLS) { const o = win(t, c.a, c.b, .3, .35), k = back(seg(t, c.a, c.a + .5)); c.el.style.opacity = o; c.el.style.transform = `scale(${.4 + .6 * k})`; }
  CARDS.forEach((c, i) => { const o = win(t, c.a, c.b, .3, .35), k = back(seg(t, c.a, c.a + .55)); c.el.style.opacity = o;
    c.el.style.transform = `perspective(900px) translateX(${(1 - clamp(k)) * -220}px) rotateY(${lerp(-35, -9, clamp(k)) + Math.sin(t * 1.4 + i) * 2}deg) scale(${.7 + .3 * k})`; });
}

(async () => {
  await document.fonts.load('900 40px Nunito'); await document.fonts.ready;
  madina.drawPaper();
  window.render = render; window.DURATION = 56;
  render(0); window.ready = true;
})();
