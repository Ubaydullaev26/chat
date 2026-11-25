// «Матку — удалять? Покажу, как проходит ЭМА»: Мадина в слезах, Дилноза показывает процедуру в 3D, затем — призыв.
// Дворик и героини — из «Мифов» (mm), анимация процедуры — proc.js. Реплики — lines.json (voice_ep.py).
import * as THREE from 'three';
import { createEngine } from '../core/engine.js';
import { makePerson } from '../chars/family.js';
import { actTrack } from '../chars/acting.js';
import { clamp, lerp, smooth } from '../core/util.js';
import * as W from '../mm/world.js';
import { MADINA, DILNOZA } from '../mm/scene.js';
import { makeProcedure, BG } from './proc.js';

const SC = 1.5;
const TXT = {
  ru: {
    hook: '<small>38 лет.</small>«Матку — удалять» 😱', stop: 'СТОП ✋',
    l_uterus: 'Узлы миомы <b>питаются кровью</b>', l_xray: '<b>ЭМА</b> — эмболизация маточных артерий', l_xray2: '✂️ Прокол на руке · без разреза',
    l_tunnel: 'Микрочастицы <b>перекрывают сосуды</b>', l_shrink: 'Узлы <b>уменьшаются</b>', keep: '💗 Матка сохраняется',
    cards: ['⏱️ Процедура — около часа', '🏠 Домой через 1–2 дня', '✂️ Без разреза и швов'],
    q: 'Почему об этом молчат? 👇', doc: '👩‍⚕️ Интервенционный хирург',
    cta: 'Напиши <b>«ЭМА»</b> в комментариях 👇',
    tiny: 'Подходит не всем: решение принимает врач после обследования',
    names: { dil: 'Дилноза', mad: 'Мадина' },
  },
  uz: {
    hook: '<small>38 yosh.</small>«Bachadonni olib tashlash kerak» 😱', stop: 'TO‘XTA ✋',
    l_uterus: 'Mioma tugunlari <b>qon bilan oziqlanadi</b>', l_xray: '<b>EMA</b> — bachadon arteriyalari embolizatsiyasi', l_xray2: '✂️ Qo‘lda kichik teshik · kesiksiz',
    l_tunnel: 'Mikrozarrachalar <b>tomirlarni berkitadi</b>', l_shrink: 'Tugunlar <b>kichrayadi</b>', keep: '💗 Bachadon saqlanadi',
    cards: ['⏱️ Muolaja — taxminan 1 soat', '🏠 1–2 kunda uyga', '✂️ Kesiksiz va choksiz'],
    q: 'Nega bu haqda jim turishadi? 👇', doc: '👩‍⚕️ Intervension jarroh',
    cta: 'Izohlarda <b>«EMA»</b> deb yozing 👇',
    tiny: 'Hammaga ham mos emas: qarorni shifokor tekshiruvdan keyin qabul qiladi',
    names: { dil: 'Dilnoza', mad: 'Madina' },
  },
};
const LANG = new URLSearchParams(location.search).get('lang') || 'ru';
const T = TXT[LANG] || TXT.ru;
const NAME = { dil: [T.names.dil, '#7fe0c8'], mad: [T.names.mad, '#ffb3c8'] };

let eng, world, mad, dil, proc, L, DUR, SHOTS, ACT_D, ACT_M, ov = {};
const P_MAD = [0.36, 0, 1.75], P_DIL = [-0.36, 0, 1.62];
const at = (i, k) => lerp(L[i].start, L[i].end, k);
const PROC = ['uterus', 'xray', 'tunnel', 'shrink'];

function buildShots() {
  return [
    [0, 'mad0'], [L[1].start - 0.1, 'dil'], [L[2].start - 0.08, 'mad'], [L[3].start - 0.08, 'dilz'],
    [L[4].start - 0.15, 'uterus'], [L[5].start - 0.15, 'xray'], [L[6].start - 0.15, 'tunnel'], [L[7].start - 0.15, 'shrink'],
    [L[8].start - 0.15, 'two'], [L[9].start - 0.08, 'madz'], [L[10].start - 0.08, 'dil'], [at(10, 0.45), 'two'], [at(10, 0.72), 'fin'],
  ];
}
function buildActs() {
  const m = [[0, 'cry'], [L[1].start + 0.4, 'sad'], [L[2].start, 'think'], [L[3].start, 'think', 0.6], [L[8].start, 'wow'],
    [L[9].start, 'wow'], [L[10].start, 'happy'], [at(10, 0.72), 'wave']];
  const d = [[0, 'sad', 0.6], [L[1].start, 'point'], [at(1, 0.7), 'determined'], [L[2].start, 'smug'], [L[3].start, 'wink'],
    [L[8].start, 'happy'], [L[9].start, 'smug'], [L[10].start, 'happy'], [at(10, 0.3), 'determined'], [at(10, 0.72), 'wave']];
  return [d, m];
}
function mkOv(cls, html, top, layer) {
  const e = document.createElement('div'); e.className = 'ov ' + cls; e.style.top = top + 'px'; e.innerHTML = '<div>' + html + '</div>';
  layer.appendChild(e); return e;
}

export async function init(canvas, layer) {
  const J = await (await fetch(LANG === 'ru' ? './lines.json' : `./lines_${LANG}.json`)).json();
  L = J.lines; DUR = J.duration;
  eng = await createEngine(canvas);
  eng.look({ sunDir: W.SUN, sun: '#fff0d8', sunI: 3.0, sky: '#c2dcff', skyI: 1.2, ground: '#b48a62' });
  world = W.build(eng);
  mad = makePerson(eng, MADINA); mad.root.scale.setScalar(SC); eng.scene.add(mad.root);
  dil = makePerson(eng, DILNOZA); dil.root.scale.setScalar(SC); eng.scene.add(dil.root);
  mad.root.position.set(...P_MAD); mad.root.rotation.y = -0.62;
  dil.root.position.set(...P_DIL); dil.root.rotation.y = 0.62;
  proc = makeProcedure(eng);
  SHOTS = buildShots();
  eng.cuts = SHOTS.slice(1).map((s) => s[0]);
  [ACT_D, ACT_M] = buildActs();
  if (layer) {
    ov.hook = mkOv('hook', T.hook, 280, layer);
    ov.stop = mkOv('stop', T.stop, 300, layer);
    ov.lab = { uterus: mkOv('lab', T.l_uterus, 280, layer), xray: mkOv('lab', T.l_xray, 280, layer), tunnel: mkOv('lab', T.l_tunnel, 280, layer), shrink: mkOv('lab', T.l_shrink, 280, layer) };
    ov.xray2 = mkOv('pill', T.l_xray2, 1250, layer);
    ov.keep = mkOv('green', T.keep, 1250, layer);
    ov.cards = T.cards.map((c, i) => mkOv('pill', c, 280 + i * 118, layer));
    ov.q = mkOv('q', T.q, 290, layer);
    ov.doc = mkOv('doc', T.doc, 300, layer);
    ov.sub = mkOv('sub', '', 1450, layer);
    ov.cta = mkOv('cta2', T.cta, 280, layer);
    ov.tiny = mkOv('tiny', T.tiny, 460, layer);
    ov.flash = document.getElementById('flash');
  }
  return { duration: DUR, fps: 30 };
}

const blink = (t, off) => { const p = (t + off) % 3.7; return p < 0.11 ? 1 : 0; };
function mouthOf(who, t) {
  for (const l of L) if (l.who === who && t >= l.start && t < l.end) {
    const f = (t - l.start) * 30, i = Math.floor(f), a = l.env[i] ?? 0, b = l.env[i + 1] ?? a;
    return lerp(a, b, f - i);
  }
  return 0;
}
const shotAt = (t) => { let k = 0; for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i][0] <= t) k = i; return [SHOTS[k][0], SHOTS[k][1], SHOTS[k + 1] ? SHOTS[k + 1][0] : DUR]; };
const O = (x, y, z) => [x + 300, y, z];   // координаты процедуры (proc.ORIGIN)

function camera(t) {
  const [t0, name, t1] = shotAt(t), u = t - t0, k = clamp(u / (t1 - t0)), head = 1.36;
  if (name === 'mad0') return { pos: [-0.72 + 0.05 * u, 1.5, 3.7 - 0.12 * u], look: [0.36, head + 0.22, 1.75], fov: 29 };
  if (name === 'dil') return { pos: [0.75 - 0.03 * u, 1.5, 3.85 - 0.08 * u], look: [-0.33, head + 0.12, 1.62], fov: 31 };
  // «смотри, сейчас покажу» — наезд на Дилнозу перед переходом
  if (name === 'dilz') { const z = smooth(0, 1.6, u); return { pos: [lerp(0.75, 0.2, z), 1.48, lerp(3.85, 2.6, z)], look: [-0.34, head + 0.1, 1.62], fov: lerp(31, 26, z) }; }
  if (name === 'mad') return { pos: [-0.8 + 0.02 * u, 1.5, 3.95 - 0.06 * u], look: [0.36, head + 0.12, 1.75], fov: 31 };
  if (name === 'madz') { const z = smooth(0, 0.5, u); return { pos: [lerp(-0.8, -0.55, z), 1.5, lerp(3.95, 3.2, z)], look: [0.36, head + 0.2, 1.75], fov: lerp(31, 28, z) }; }
  if (name === 'two') return { pos: [0.1 + 0.03 * u, 1.55, 6.3 - 0.08 * u], look: [0, 1.38, 1.65], fov: 30 };
  if (name === 'fin') { const a = -0.3 + 0.12 * u, r = 4.9; return { pos: [Math.sin(a) * r, 1.6, 1.7 + Math.cos(a) * r], look: [0, 1.25, 1.7], fov: 33 }; }
  // процедура: матка в нижней половине кадра, надпись сверху
  if (name === 'uterus' || name === 'shrink') {
    const a = name === 'uterus' ? lerp(-0.45, 0.25, eio(k)) : lerp(0.3, -0.15, eio(k)), d = name === 'uterus' ? lerp(12.5, 10.5, eio(k)) : 10.5;
    return { pos: O(Math.sin(a) * d, 2.6, Math.cos(a) * d), look: O(0, 1.15, 0), fov: 35 };
  }
  if (name === 'xray') { const z = eio(k); return { pos: O(lerp(1.3, 0.8, z), lerp(1.9, 1.5, z), -40 + lerp(10.2, 9.0, z)), look: O(lerp(0.7, 0.5, z), lerp(1.55, 1.35, z), -40), fov: 35 }; }
  const c = proc.tunnelPose(t, k, t1 - t0);
  return { pos: [c.pos.x, c.pos.y, c.pos.z], look: [c.look.x, c.look.y, c.look.z], fov: 60 };
}
const eio = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

function update(t) {
  const [t0, name, t1] = shotAt(t), k = clamp((t - t0) / (t1 - t0)), inProc = PROC.includes(name);
  // что видно: дворик или процедура
  world.sky.mesh.visible = !inProc; world.clouds.root.visible = !inProc;
  proc.U.visible = name === 'uterus' || name === 'shrink'; proc.X.visible = name === 'xray'; proc.Tn.visible = name === 'tunnel';
  eng.scene.background = name === 'xray' ? BG.xray : name === 'tunnel' ? new THREE.Color('#3a0612') : inProc ? BG.uterus : null;
  eng.scene.fog = name === 'tunnel' ? new THREE.Fog('#4a0817', 2, 19) : null;
  if (name === 'uterus') proc.uterusPose(t, 'grow', k);
  if (name === 'shrink') proc.uterusPose(t, 'shrink', k);
  if (name === 'xray') proc.xrayPose(t, k);
  const D = actTrack(ACT_D, t), M = actTrack(ACT_M, t);
  dil.pose({ ...D, crouch: 0, shrink: Math.min(D.shrink ?? 0, 0.3), mouth: mouthOf('dil', t), blink: blink(t, 0.4), t, headYaw: (D.headYaw ?? 0) + 0.1 * Math.sin(t * 0.7) });
  mad.pose({ ...M, crouch: 0, shrink: Math.min(M.shrink ?? 0, 0.3), mouth: mouthOf('mad', t), blink: blink(t, 1.9), t, headYaw: (M.headYaw ?? 0) + 0.08 * Math.sin(t * 0.6 + 1) });
  eng.setCamera({ ...camera(t), near: name === 'tunnel' ? 0.05 : 0.1, far: 12000 });
  if (inProc) {
    const c = name === 'xray' ? [300.5, 1.4, -40] : name === 'tunnel' ? [eng.camera.position.x, eng.camera.position.y, eng.camera.position.z] : [300, 1.5, 0];
    eng.focus = eng.camera.position.distanceTo(new THREE.Vector3(...c)) || 3; eng.aperture = 0;
    eng.shadow.center.set(...c); eng.shadow.radius = 5;
  } else {
    const fp = name.startsWith('dil') ? [-0.36, 1.35, 1.62] : name.startsWith('mad') ? [0.36, 1.35, 1.75] : [0, 1.3, 1.7];
    eng.focus = eng.camera.position.distanceTo(new THREE.Vector3(...fp));
    eng.aperture = name === 'two' || name === 'fin' ? 0.015 : 0.035;
    eng.shadow.center.set(0, 1, 0.8); eng.shadow.radius = 6;
  }
  world.sky.follow(eng.camera);
  world.clouds.drift(t);
}

const fade = (t, a, b, f = 0.2) => clamp(Math.min((t - a) / f, (b - t) / f));
const pop = (t, a) => { const x = clamp((t - a) / 0.3); const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function overlay(t) {
  if (!ov.hook) return;
  const set = (e, o, tr) => { e.style.opacity = clamp(o); e.style.transform = tr || ''; };
  set(ov.hook, t < L[1].start - 0.1 ? 1 : 0, `scale(${1 + 0.03 * Math.sin(t * 6)})`);
  set(ov.stop, fade(t, L[1].start, L[2].start - 0.05, 0.12), `scale(${lerp(2.4, 1, clamp(pop(t, L[1].start)))}) rotate(-6deg)`);
  // подписи процедуры
  [['uterus', 4], ['xray', 5], ['tunnel', 6], ['shrink', 7]].forEach(([n, i]) => { const a = L[i].start - 0.1, b = (L[i + 1]?.start ?? DUR) - 0.15; set(ov.lab[n], fade(t, a, b, 0.15), `translateY(${(1 - clamp(pop(t, a))) * 40}px)`); });
  set(ov.xray2, fade(t, at(5, 0.12), L[6].start - 0.15, 0.15), `scale(${0.6 + 0.4 * pop(t, at(5, 0.12))})`);
  set(ov.keep, fade(t, at(7, 0.45), L[8].start - 0.15, 0.15), `scale(${0.5 + 0.5 * pop(t, at(7, 0.45))})`);
  ov.cards.forEach((c, i) => { const a = at(8, 0.05 + i * 0.25); set(c, fade(t, a, L[9].start - 0.05, 0.15), `translateX(${(1 - clamp(pop(t, a))) * -260}px)`); });
  set(ov.q, fade(t, L[9].start, L[10].start - 0.05, 0.12), `scale(${0.5 + 0.5 * pop(t, L[9].start)})`);
  set(ov.doc, fade(t, at(10, 0.03), at(10, 0.6), 0.15), `scale(${0.6 + 0.4 * pop(t, at(10, 0.03))})`);
  const cur = L.find((l) => t >= l.start - 0.05 && t < l.end + 0.15);
  if (cur) {
    const [nm, col] = NAME[cur.who];
    const html = `<span class="who" style="color:${col}">${nm}:</span>${cur.text}`;
    if (ov.sub.firstChild.innerHTML !== html) ov.sub.firstChild.innerHTML = html;
    set(ov.sub, fade(t, cur.start - 0.05, cur.end + 0.15, 0.1));
  } else set(ov.sub, 0);
  const ct = at(10, 0.62);
  set(ov.cta, fade(t, ct, DUR + 1), `scale(${0.5 + 0.5 * pop(t, ct)})`);
  set(ov.tiny, fade(t, ct + 0.5, DUR + 1));
  // белая вспышка на входе в процедуру и на выходе из неё
  const f1 = L[4].start - 0.15, f2 = L[8].start - 0.15;
  ov.flash.style.opacity = Math.max(0, 1 - Math.abs(t - f1) / 0.22, 1 - Math.abs(t - f2) / 0.22).toFixed(3);
}

export function render(t) { eng.frame(t, update); overlay(t); }
