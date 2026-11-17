// Мир сцены «Мифы о миоме»: узбекский дворик — мощёный двор, глинобитная стена с синей резной дверью,
// деревья за стеной, топчан с чаем под виноградным навесом. Единицы — метры. Камера смотрит на −z.
import * as THREE from 'three';
import { lerp, rng, noise2, fbm2, roundBox, canvasTex } from '../core/util.js';
import * as N from '../world/nature.js';
import { makeTapchan } from '../props/resort.js';
import { ell, merge, place, roughen, scaleGeo } from '../chars/shapes.js';
import { noise3 } from '../core/util.js';

export const h = () => 0;
export const SUN = (() => { const v = new THREE.Vector3(0.55, 0.72, 0.42).normalize(); return [v.x, v.y, v.z]; })();
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Плитка двора: тёплый кирпич ёлочкой у топчана, дальше утоптанная земля. */
function groundColor(x, z) {
  const brick = lin('#c98e62'), brick2 = lin('#b7784f'), seam = lin('#9a6a4a'), dirt = lin('#cfae84'), dirt2 = lin('#bf9a6c');
  const u = (x + z) * 3.2, v = (x - z) * 3.2;
  const cell = (Math.floor(u) + Math.floor(v)) % 2 === 0;
  const fu = u - Math.floor(u), fv = v - Math.floor(v);
  let c = mix3(brick, brick2, noise2(Math.floor(u) * 1.7, Math.floor(v) * 1.3, 4));
  if (fu < 0.06 || fv < 0.06) c = seam;
  if (!cell) c = mix3(c, brick2, 0.25);
  const r = Math.hypot(x * 0.8, z - 0.6);
  const k = Math.min(1, Math.max(0, (r - 3.2) / 1.2));
  return mix3(c, mix3(dirt, dirt2, fbm2(x * 0.3, z * 0.3, 3, 9)), k);
}

/** Резная дверь: синие створки с узором, деревянная рама. */
function doorTex() {
  return canvasTex(512, 1024, (c, w, hh) => {
    c.fillStyle = '#1f4f8f'; c.fillRect(0, 0, w, hh);
    c.strokeStyle = '#f1d27a'; c.lineWidth = 10;
    for (const x0 of [0, w / 2]) {
      c.strokeRect(x0 + 24, 24, w / 2 - 48, hh - 48);
      for (let k = 0; k < 3; k++) {
        const cy = 170 + k * 320, cx = x0 + w / 4;
        c.beginPath(); c.moveTo(cx, cy - 90); c.lineTo(cx + 70, cy); c.lineTo(cx, cy + 90); c.lineTo(cx - 70, cy); c.closePath(); c.stroke();
        c.beginPath(); c.arc(cx, cy, 26, 0, Math.PI * 2); c.fillStyle = '#f1d27a'; c.fill();
      }
    }
    c.fillStyle = '#0f2f5f'; c.fillRect(w / 2 - 4, 0, 8, hh);
  });
}

export function build(eng) {
  const R = rng(7);
  N.makeTerrain(eng, { h, x0: -30, x1: 30, z0: -30, z1: 30, step: 0.25, color: (x, z) => groundColor(x, z) });
  const sky = N.makeSky(eng, { top: '#4a8fdc', mid: '#86bdea', hor: '#d9ecf7' });
  // стена двора
  const wallM = eng.M('canvas', 0xe6c99a, { ns: 0.6 });
  const wall = [];
  for (const [x, w] of [[-4.6, 5.2], [4.0, 4.2]]) wall.push(place(roundBox(w, 2.8, 0.45, 0.06), [x, 1.4, -3.4]));
  wall.push(place(roundBox(2.8, 0.7, 0.45, 0.06), [-0.7, 2.45, -3.4]));
  eng.mesh(merge(wall.map((g) => { g.deleteAttribute('uv'); return g; })), wallM, eng.scene);
  // пояс изразцов (майолика): синие и бирюзовые звёзды на белом
  const tile = canvasTex(1024, 128, (c, w, hh) => {
    c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, hh);
    for (let k = 0; k < 16; k++) {
      const cx = (k + 0.5) * w / 16, cy = hh / 2;
      c.fillStyle = k % 2 ? '#1f5fae' : '#18a0a8';
      c.beginPath();
      for (let j = 0; j < 16; j++) { const a = j * Math.PI / 8, r = j % 2 ? 22 : 50; c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
      c.closePath(); c.fill();
      c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#1f3f7f'; c.fillRect(0, 0, w, 10); c.fillRect(0, hh - 10, w, 10);
  }, { repeat: true });
  tile.repeat.set(3, 1);
  const tm = eng.M('enamel', 0xffffff, { map: tile, outline: false });
  for (const [x, w] of [[-4.6, 5.2], [4.0, 4.2]]) eng.mesh(new THREE.PlaneGeometry(w - 0.2, 0.32), tm, eng.scene, [x + (x < 0 ? -0.05 : 0.05), 2.35, -3.17]);
  // карниз
  eng.mesh(merge([place(roundBox(14, 0.14, 0.62, 0.05), [0, 2.86, -3.38])].map((g) => { g.deleteAttribute('uv'); return g; })), eng.M('wood', 0x7a4a2a), eng.scene);
  // дверь в проёме
  const dm = eng.M('paint', 0xffffff, { map: doorTex() });
  const door = new THREE.PlaneGeometry(1.7, 2.1);
  eng.mesh(door, dm, eng.scene, [-0.7, 1.05, -3.3]);
  eng.mesh(merge([place(new THREE.BoxGeometry(1.9, 0.12, 0.14), [-0.7, 2.13, -3.28]), place(new THREE.BoxGeometry(0.1, 2.15, 0.14), [-1.6, 1.07, -3.28]), place(new THREE.BoxGeometry(0.1, 2.15, 0.14), [0.2, 1.07, -3.28])]),
    eng.M('wood', 0x6a3f22), eng.scene);
  // окно с решёткой-панджара справа
  eng.mesh(new THREE.PlaneGeometry(1.1, 0.9), eng.M('paint', 0x2b3a4a), eng.scene, [3.2, 1.55, -3.16]);
  const grid = [];
  for (let k = 0; k <= 5; k++) grid.push(place(new THREE.BoxGeometry(0.03, 0.9, 0.03), [3.2 - 0.55 + k * 0.22, 1.55, -3.13]), place(new THREE.BoxGeometry(1.1, 0.03, 0.03), [3.2, 1.1 + k * 0.18, -3.13]));
  eng.mesh(merge(grid), eng.M('wood', 0xe9e1cf), eng.scene);
  // деревья за стеной и у стены
  N.makeTrees(eng, h, [{ x: -5.5, z: -5.2, s: 1.35 }, { x: 5.6, z: -5.6, s: 1.5 }, { x: 1.8, z: -6.5, s: 1.2 }, { x: -7.5, z: -1.5, s: 1.3 }], { leaf: 0x3f7a3a });
  // горшки с цветами у стены
  const pots = [], flowers = [];
  for (const [x, z] of [[1.4, -2.9], [2.0, -2.95], [-2.6, -2.9]]) {
    pots.push(place(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 18), [x, 0.16, z]));
    for (let k = 0; k < 6; k++) flowers.push(place(ell(0.07, 0.07, 0.07, 10, 8), [x + (R() - 0.5) * 0.25, 0.42 + R() * 0.12, z + (R() - 0.5) * 0.2]));
  }
  eng.mesh(merge(pots), eng.M('enamel', 0xc8643a), eng.scene);
  eng.mesh(merge(flowers), eng.M('paint', 0xe0385a, { outline: 0.6 }), eng.scene);
  // топчан
  const tap = makeTapchan(eng, { size: 2.2 });
  eng.scene.add(tap);
  // виноградный навес над топчаном: столбы, балки, листва
  const posts = [], beams = [];
  for (const sx of [-1, 1]) for (const z of [-1.4, 1.6]) posts.push(place(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 10), [sx * 1.5, 1.3, z]));
  for (const z of [-1.4, 1.6]) beams.push(place(new THREE.BoxGeometry(3.2, 0.1, 0.1), [0, 2.6, z]));
  for (let k = 0; k < 6; k++) beams.push(place(new THREE.BoxGeometry(0.07, 0.07, 3.2), [-1.5 + k * 0.6, 2.66, 0.1]));
  eng.mesh(merge(posts), eng.M('wood', 0x6a4a2a), eng.scene);
  eng.mesh(merge(beams), eng.M('wood', 0x7d5532), eng.scene);
  const leaves = [], grapes = [];
  for (let k = 0; k < 46; k++) {
    const g = roughen(new THREE.IcosahedronGeometry(1, 2), 0.25, (x, y, z) => noise3(x * 2 + k, y * 2, z * 2, k) - 0.5);
    const r = 0.28 + R() * 0.22;
    leaves.push(place(scaleGeo(g, r * 1.2, r * 0.55, r), [(R() - 0.5) * 3.4, 2.78 + R() * 0.12, -1.5 + R() * 3.2]));
  }
  for (let k = 0; k < 9; k++) {
    const x = (R() - 0.5) * 2.6, z = -1.0 + R() * 2.4;
    for (let j = 0; j < 7; j++) grapes.push(place(ell(0.04, 0.04, 0.04, 8, 6), [x + (R() - 0.5) * 0.08, 2.55 - j * 0.035 - R() * 0.03, z + (R() - 0.5) * 0.08]));
  }
  eng.mesh(merge(leaves), eng.M('leaf', 0x4f8f3a, { ns: 0.4, outline: 1.0 }), eng.scene);
  eng.mesh(merge(grapes), eng.M('enamel', 0x6a2a6a, { outline: 0.5 }), eng.scene);
  const clouds = N.makeClouds(eng, [{ x: -40, y: 60, z: -160, s: 9, v: 0.6 }, { x: 50, y: 75, z: -200, s: 11, v: 0.4 }]);
  return { sky, clouds, tap };
}
