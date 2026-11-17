// «5 мифов о миоме»: Дилноза пересказывает страшилки, Мадина отвечает. Узбекский дворик, топчан с чаем.
// Время, реплики и громкость голоса — из lines.json (его пишет voice.py). Кадр — чистая функция времени t.
import * as THREE from 'three';
import { createEngine } from '../core/engine.js';
import { makePerson, MOM } from '../chars/family.js';
import { actTrack } from '../chars/acting.js';
import { clamp, lerp, smooth } from '../core/util.js';
import * as W from './world.js';

const SC = 1.5;
export const MADINA = { ...MOM, name: 'madina' };
export const DILNOZA = { ...MOM, name: 'dilnoza',
  col: { ...MOM.col, hat: 0xf4e3ea, cuff: 0xd9b9c6, scarf2: 0xe8dcc6, sleeve: 0x2f8f7a, leg: 0x2f5f6a, knee: 0x2f5f6a },
  atlas: ['#2f8f7a', '#f2c94c', '#7a3f9f', '#f4efe4', '#1f4f6f'],
  look: { ...MOM.look, eyeRX: 10, eyeRY: 15.5, browUp: 5, mouthW: 27 } };

const MYTH = ['', '«Миома — это рак»', '«Матку обязательно удалят»', '«С миомой не забеременеть»', '«Травы растворят миому»', '«Не болит — значит, не опасно»'];
const TRUTH = ['', 'Миома — доброкачественный узел, не рак', 'Есть методы, сохраняющие матку: ЭМА, удаление узлов', 'Многие беременеют и рожают — решает врач', 'Травы не помогают, а узлы растут', 'Часто без симптомов — УЗИ раз в год'];
const NAME = { dil: ['Дилноза', '#7fe0c8'], mad: ['Мадина', '#ffb3c8'] };

let eng, world, mad, dil, L, DUR, SHOTS, ACT_D, ACT_M, ov = {};
const P_MAD = [0.36, 0, 1.75], P_DIL = [-0.36, 0, 1.62];

/** Планы: [время начала, имя]. Говорящая — крупно, к концу ответа — средний план с реакцией подруги. */
function buildShots() {
  const s = [[0, 'est'], [2.0, 'dil']];
  L.forEach((l, i) => {
    if (i === 0) return;
    if (i === 10) { s.push([l.start - 0.12, 'two']); return; }
    if (i === 11) { s.push([l.start - 0.12, 'fin']); return; }
    s.push([l.start - 0.12, l.who === 'dil' ? 'dil' : 'mad']);
    if (l.who === 'mad') s.push([lerp(l.start, l.end, 0.58), 'two']);
  });
  return s;
}
function buildActs() {
  const d = [[0, 'sad'], [L[0].start, 'scared']], m = [[0, 'happy', 0.6]];
  const at = (i, k) => lerp(L[i].start, L[i].end, k);
  d.push([at(1, 0.15), 'sad'], [at(1, 0.75), 'happy']);
  m.push([L[1].start, 'happy']);
  d.push([L[2].start, 'sad'], [at(3, 0.65), 'wow']);
  m.push([L[2].start, 'think', 0.6], [L[3].start, 'wink'], [at(3, 0.35), 'happy']);
  d.push([L[4].start, 'think'], [at(5, 0.65), 'happy']);
  m.push([L[4].start, 'happy', 0.5], [L[5].start, 'happy']);
  d.push([L[6].start, 'smug'], [at(7, 0.55), 'shy']);
  m.push([L[6].start, 'think', 0.7], [L[7].start, 'determined']);
  d.push([L[8].start, 'shrug'], [at(9, 0.6), 'wow']);
  m.push([L[8].start, 'happy', 0.5], [L[9].start, 'determined'], [at(9, 0.55), 'point']);
  d.push([L[10].start - 0.1, 'joy'], [L[11].start + 0.6, 'happy']);
  m.push([L[10].start, 'happy'], [L[11].start, 'wink'], [at(11, 0.45), 'wave']);
  return [d, m];
}

function mkOv(cls, html, top, layer) {
  const e = document.createElement('div'); e.className = 'ov ' + cls; e.style.top = top + 'px'; e.innerHTML = '<div>' + html + '</div>';
  layer.appendChild(e); return e;
}

export async function init(canvas, layer) {
  const J = await (await fetch('./lines.json')).json();
  L = J.lines; DUR = J.duration;
  eng = await createEngine(canvas);
  eng.look({ sunDir: W.SUN, sun: '#fff0d8', sunI: 3.0, sky: '#c2dcff', skyI: 1.2, ground: '#b48a62' });
  world = W.build(eng);
  mad = makePerson(eng, MADINA); mad.root.scale.setScalar(SC); eng.scene.add(mad.root);
  dil = makePerson(eng, DILNOZA); dil.root.scale.setScalar(SC); eng.scene.add(dil.root);
  const cupG = new THREE.CylinderGeometry(0.032, 0.02, 0.03, 18);
  const cup = (hand) => { const c = new THREE.Mesh(cupG, eng.M('enamel', 0xf6f6f2, { outline: 0.6 })); c.position.set(0, -0.02, 0.02); c.castShadow = true; hand.add(c); };
  cup(mad.handL); cup(dil.handR);
  mad.root.position.set(...P_MAD); mad.root.rotation.y = -0.62;
  dil.root.position.set(...P_DIL); dil.root.rotation.y = 0.62;
  SHOTS = buildShots();
  eng.cuts = SHOTS.slice(1).map((s) => s[0]);
  [ACT_D, ACT_M] = buildActs();
  // оверлей
  if (layer) {
    ov.title = mkOv('title', '5 мифов о <b>миоме</b>', 300, layer);
    ov.myth = []; ov.truth = [];
    for (let k = 1; k <= 5; k++) {
      ov.myth[k] = mkOv('card myth', `<div class="lab">МИФ №${k}</div><div class="txt">${MYTH[k]}</div><div class="stamp">❌</div>`, 300, layer);
      ov.truth[k] = mkOv('card truth', `<div class="lab">ПРАВДА</div><div class="txt">${TRUTH[k]}</div><div class="stamp">✅</div>`, 300, layer);
    }
    ov.sub = mkOv('sub', '', 1450, layer);
    ov.cta = mkOv('cta', '📌 Сохрани · 💌 Отправь подруге', 300, layer);
    ov.tiny = mkOv('tiny', 'Информация носит ознакомительный характер. Необходима консультация специалиста', 410, layer);
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
  const [t0, name] = shotAt(t), u = t - t0;
  const head = 1.36;
  if (name === 'est') { const k = smooth(0, 2.0, t); return { pos: [lerp(1.4, 0.3, k), lerp(2.6, 1.55, k), lerp(10.5, 6.0, k)], look: [0, lerp(1.4, 1.2, k), 1.2], fov: 34 }; }
  // крупный план: голова в средней полосе кадра, плашка сверху её не закрывает
  if (name === 'dil') return { pos: [0.75 - 0.02 * u, 1.5, 3.85 - 0.05 * u], look: [-0.33, head + 0.12, 1.62], fov: 31 };
  if (name === 'mad') return { pos: [-0.8 + 0.02 * u, 1.5, 3.95 - 0.05 * u], look: [0.36, head + 0.12, 1.75], fov: 31 };
  if (name === 'two') return { pos: [0.1 + 0.03 * u, 1.55, 6.3 - 0.06 * u], look: [0, 1.38, 1.65], fov: 30 };
  // финал: камера облетает подруг
  const a = -0.35 + 0.11 * u, r = 4.9;
  return { pos: [Math.sin(a) * r, 1.6, 1.7 + Math.cos(a) * r], look: [0, 1.2, 1.7], fov: 33 };
}

function update(t) {
  const D = actTrack(ACT_D, t), M = actTrack(ACT_M, t);
  // Дилноза: без приседаний (платье не любит согнутых колен); в мифе про травы показывает пиалу
  const herbs = smooth(L[6].start - 0.2, L[6].start + 0.3, t) * (1 - smooth(L[7].start + 0.5, L[7].start + 1.0, t));
  const dk = { ...D };
  if (!dk.gestR || herbs > 0.5) { dk.gestR = 'palms'; dk.gestRK = 0.35 + 0.65 * herbs; }
  // в испуге зубы стиснуты и рот не открывается под голос: пока она говорит, подмешиваем удивление
  const md = mouthOf('dil', t);
  if (dk.emo === 'scared' && !dk.emo2 && L.some((l) => l.who === 'dil' && t >= l.start - 0.1 && t < l.end)) { dk.emo2 = 'wow'; dk.emo2K = 0.6; }
  dil.pose({ ...dk, crouch: 0, shrink: Math.min(dk.shrink ?? 0, 0.3), mouth: md, blink: blink(t, 0.4), t,
    headYaw: (dk.headYaw ?? 0) + 0.12 * Math.sin(t * 0.7) });
  const mk = { ...M };
  if (!mk.gestL) { mk.gestL = 'palms'; mk.gestLK = 0.85; }
  mad.pose({ ...mk, crouch: 0, mouth: mouthOf('mad', t), blink: blink(t, 1.9), t, headYaw: (mk.headYaw ?? 0) + 0.1 * Math.sin(t * 0.6 + 1) });
  const c = camera(t);
  eng.setCamera({ ...c, near: 0.1, far: 12000 });
  const name = shotAt(t)[1];
  const fp = name === 'dil' ? [-0.36, 1.35, 1.62] : name === 'mad' ? [0.36, 1.35, 1.75] : [0, 1.3, 1.7];
  eng.focus = eng.camera.position.distanceTo(new THREE.Vector3(...fp));
  eng.aperture = name === 'dil' || name === 'mad' ? 0.035 : 0.015;
  eng.shadow.center.set(0, 1, 0.8); eng.shadow.radius = 6;
  world.sky.follow(eng.camera);
  world.clouds.drift(t);
}

const fade = (t, a, b, f = 0.25) => clamp(Math.min((t - a) / f, (b - t) / f));
const pop = (t, a) => { const x = clamp((t - a) / 0.35); const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function overlay(t) {
  if (!ov.title) return;
  const set = (e, o, tr) => { e.style.opacity = clamp(o); e.style.transform = tr || ''; };
  set(ov.title, fade(t, 0.3, L[1].start - 0.1), `scale(${0.6 + 0.4 * pop(t, 0.3)})`);
  for (let k = 1; k <= 5; k++) {
    const q = L[2 * k - 2], a = L[2 * k - 1];
    // миф появляется, когда о нём спрашивают; правда — сменяет его, когда Мадина отвечает
    const mA = k === 1 ? L[1].start - 0.1 : q.start, mB = a.start + 0.15;
    set(ov.myth[k], fade(t, mA, mB, 0.2), `translateY(${(1 - pop(t, mA)) * 60}px) rotate(${(1 - clamp((t - mA) / 0.3)) * -3}deg)`);
    const tA = a.start + 0.1, tB = (L[2 * k] ? L[2 * k].start : a.end + 1) - 0.1;
    set(ov.truth[k], fade(t, tA, tB, 0.2), `translateY(${(1 - pop(t, tA)) * 60}px)`);
    for (const [card, t0] of [[ov.myth[k], mA + 0.25], [ov.truth[k], tA + 0.25]]) {
      const st = card.querySelector('.stamp'), p = pop(t, t0);
      st.style.opacity = clamp((t - t0) * 8); st.style.transform = `scale(${lerp(2.2, 1, clamp(p))}) rotate(${lerp(-25, -8, clamp(p))}deg)`;
    }
  }
  // субтитры текущей реплики
  const cur = L.find((l) => t >= l.start - 0.05 && t < l.end + 0.25);
  if (cur) {
    const [nm, col] = NAME[cur.who];
    const html = `<span class="who" style="color:${col}">${nm}:</span>${cur.text}`;
    if (ov.sub.firstChild.innerHTML !== html) ov.sub.firstChild.innerHTML = html;
    set(ov.sub, fade(t, cur.start - 0.05, cur.end + 0.25, 0.12));
  } else set(ov.sub, 0);
  const ct = L[11].start + 0.4;
  set(ov.cta, fade(t, ct, DUR + 1), `scale(${0.5 + 0.5 * pop(t, ct)})`);
  set(ov.tiny, fade(t, ct + 0.8, DUR + 1));
}

export function render(t) { eng.frame(t, update); overlay(t); }
