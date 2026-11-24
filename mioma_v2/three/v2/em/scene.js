// «Мне 38. Врач сказал: матку — удалять»: Мадина в слезах, Дилноза рассказывает про ЭМА. Тот же дворик, что в «Мифах».
// Короткий ролик для удержания: крючок в первом кадре, склейки каждые 1,5–2 с. Реплики — из lines.json (voice_em.py).
import * as THREE from 'three';
import { createEngine } from '../core/engine.js';
import { makePerson, MOM } from '../chars/family.js';
import { actTrack } from '../chars/acting.js';
import { clamp, lerp, smooth } from '../core/util.js';
import * as W from '../mm/world.js';
import { MADINA, DILNOZA } from '../mm/scene.js';

const SC = 1.5;
const TXT = {
  ru: {
    hook: '<small>38 лет.</small>«Матку — удалять» 😱', stop: 'СТОП ✋',
    cards: ['✂️ Без разреза', '🏠 Домой через 1–2 дня', '💗 Матка остаётся'],
    q: 'Почему об этом молчат? 👇', doc: '👩‍⚕️ Интервенционный хирург',
    cta: 'Напиши <b>«ЭМА»</b> в директ — подскажем, подходит ли тебе',
    tiny: 'Подходит не всем: решение принимает врач после обследования',
    names: { dil: 'Дилноза', mad: 'Мадина' },
  },
};
const LANG = new URLSearchParams(location.search).get('lang') || 'ru';
const T = TXT[LANG] || TXT.ru;
const NAME = { dil: [T.names.dil, '#7fe0c8'], mad: [T.names.mad, '#ffb3c8'] };

let eng, world, mad, dil, L, DUR, SHOTS, ACT_D, ACT_M, ov = {};
const P_MAD = [0.36, 0, 1.75], P_DIL = [-0.36, 0, 1.62];
const at = (i, k) => lerp(L[i].start, L[i].end, k);

function buildShots() {
  return [
    [0, 'mad0'],
    [L[1].start - 0.1, 'dil'],
    [L[2].start - 0.08, 'mad'],
    [L[3].start - 0.08, 'dil'], [at(3, 0.36), 'two'], [at(3, 0.68), 'dil2'],
    [L[4].start - 0.08, 'madz'],
    [L[5].start - 0.08, 'dil'], [at(5, 0.5), 'two'],
    [L[5].end + 0.15, 'fin'],
  ];
}
function buildActs() {
  const m = [[0, 'cry'], [L[1].start + 0.4, 'sad'], [L[2].start, 'think'], [at(3, 0.2), 'sad', 0.6], [at(3, 0.7), 'wow'],
    [L[4].start, 'wow'], [L[5].start, 'happy'], [L[5].end, 'wave']];
  const d = [[0, 'sad', 0.6], [L[1].start, 'point'], [at(1, 0.7), 'determined'], [L[2].start, 'smug'], [L[3].start, 'happy'],
    [at(3, 0.55), 'determined'], [L[4].start, 'smug'], [L[5].start, 'wink'], [at(5, 0.4), 'happy'], [L[5].end, 'wave']];
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
  SHOTS = buildShots();
  eng.cuts = SHOTS.slice(1).map((s) => s[0]);
  [ACT_D, ACT_M] = buildActs();
  if (layer) {
    ov.hook = mkOv('hook', T.hook, 280, layer);
    ov.stop = mkOv('stop', T.stop, 300, layer);
    ov.cards = T.cards.map((c, i) => mkOv('pill', c, 280 + i * 118, layer));
    ov.q = mkOv('q', T.q, 290, layer);
    ov.doc = mkOv('doc', T.doc, 300, layer);
    ov.sub = mkOv('sub', '', 1450, layer);
    ov.cta = mkOv('cta2', T.cta, 280, layer);
    ov.tiny = mkOv('tiny', T.tiny, 580, layer);
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
const shotAt = (t) => { let s = SHOTS[0]; for (const x of SHOTS) if (x[0] <= t) s = x; return s; };

function camera(t) {
  const [t0, name] = shotAt(t), u = t - t0, head = 1.36;
  // первый кадр — крупно плачущая Мадина, камера медленно наезжает
  if (name === 'mad0') return { pos: [-0.72 + 0.05 * u, 1.5, 3.7 - 0.12 * u], look: [0.36, head + 0.22, 1.75], fov: 29 };
  if (name === 'dil') return { pos: [0.75 - 0.03 * u, 1.5, 3.85 - 0.08 * u], look: [-0.33, head + 0.12, 1.62], fov: 31 };
  if (name === 'dil2') return { pos: [-0.15 + 0.03 * u, 1.48, 3.7 - 0.06 * u], look: [-0.36, head + 0.12, 1.62], fov: 30 };
  if (name === 'mad') return { pos: [-0.8 + 0.02 * u, 1.5, 3.95 - 0.06 * u], look: [0.36, head + 0.12, 1.75], fov: 31 };
  // «почему мне никто не сказал?!» — резкий наезд
  if (name === 'madz') { const k = smooth(0, 0.5, u); return { pos: [lerp(-0.8, -0.55, k), 1.5, lerp(3.95, 3.2, k)], look: [0.36, head + 0.2, 1.75], fov: lerp(31, 28, k) }; }
  if (name === 'two') return { pos: [0.1 + 0.03 * u, 1.55, 6.3 - 0.08 * u], look: [0, 1.38, 1.65], fov: 30 };
  const a = -0.3 + 0.12 * u, r = 4.9;
  return { pos: [Math.sin(a) * r, 1.6, 1.7 + Math.cos(a) * r], look: [0, 1.25, 1.7], fov: 33 };
}

function update(t) {
  const D = actTrack(ACT_D, t), M = actTrack(ACT_M, t);
  dil.pose({ ...D, crouch: 0, shrink: Math.min(D.shrink ?? 0, 0.3), mouth: mouthOf('dil', t), blink: blink(t, 0.4), t,
    headYaw: (D.headYaw ?? 0) + 0.1 * Math.sin(t * 0.7) });
  mad.pose({ ...M, crouch: 0, shrink: Math.min(M.shrink ?? 0, 0.3), mouth: mouthOf('mad', t), blink: blink(t, 1.9), t,
    headYaw: (M.headYaw ?? 0) + 0.08 * Math.sin(t * 0.6 + 1) });
  eng.setCamera({ ...camera(t), near: 0.1, far: 12000 });
  const name = shotAt(t)[1];
  const fp = name.startsWith('dil') ? [-0.36, 1.35, 1.62] : name.startsWith('mad') ? [0.36, 1.35, 1.75] : [0, 1.3, 1.7];
  eng.focus = eng.camera.position.distanceTo(new THREE.Vector3(...fp));
  eng.aperture = name === 'two' || name === 'fin' ? 0.015 : 0.035;
  eng.shadow.center.set(0, 1, 0.8); eng.shadow.radius = 6;
  world.sky.follow(eng.camera);
  world.clouds.drift(t);
}

const fade = (t, a, b, f = 0.2) => clamp(Math.min((t - a) / f, (b - t) / f));
const pop = (t, a) => { const x = clamp((t - a) / 0.3); const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function overlay(t) {
  if (!ov.hook) return;
  const set = (e, o, tr) => { e.style.opacity = clamp(o); e.style.transform = tr || ''; };
  // крючок виден уже в первом кадре: он же обложка ролика
  set(ov.hook, t < L[1].start - 0.1 ? 1 : fade(t, -1, L[1].start - 0.1, 0.15), `scale(${1 + 0.03 * Math.sin(t * 6)})`);
  const s0 = L[1].start;
  set(ov.stop, fade(t, s0, L[2].start - 0.05, 0.12), `scale(${lerp(2.4, 1, clamp(pop(t, s0)))}) rotate(-6deg)`);
  ov.cards.forEach((c, i) => { const a = at(3, 0.08 + i * 0.27); set(c, fade(t, a, L[4].start - 0.05, 0.15), `translateX(${(1 - clamp(pop(t, a))) * -260}px)`); });
  set(ov.q, fade(t, L[4].start, L[5].start - 0.05, 0.12), `scale(${0.5 + 0.5 * pop(t, L[4].start)})`);
  set(ov.doc, fade(t, at(5, 0.05), L[5].end + 0.1, 0.15), `scale(${0.6 + 0.4 * pop(t, at(5, 0.05))})`);
  const cur = L.find((l) => t >= l.start - 0.05 && t < l.end + 0.15);
  if (cur) {
    const [nm, col] = NAME[cur.who];
    const html = `<span class="who" style="color:${col}">${nm}:</span>${cur.text}`;
    if (ov.sub.firstChild.innerHTML !== html) ov.sub.firstChild.innerHTML = html;
    set(ov.sub, fade(t, cur.start - 0.05, cur.end + 0.15, 0.1));
  } else set(ov.sub, 0);
  const ct = L[5].end + 0.15;
  set(ov.cta, fade(t, ct, DUR + 1), `scale(${0.5 + 0.5 * pop(t, ct)})`);
  set(ov.tiny, fade(t, ct + 0.5, DUR + 1));
}

export function render(t) { eng.frame(t, update); overlay(t); }
