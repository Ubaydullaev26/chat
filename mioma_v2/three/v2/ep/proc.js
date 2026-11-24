// Анимация процедуры ЭМА для движка v2: матка с узлами и артериями, «рентген» с катетером, полёт внутри артерии.
// Всё стоит в стороне от дворика (точка ORIGIN), сцена показывает нужную часть по плану. Позы — функции времени.
import * as THREE from 'three';
import { clamp, lerp } from '../core/util.js';

export const ORIGIN = new THREE.Vector3(300, 0, 0);
const eio = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function gradTexBG(c1, c2, c3) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512;
  const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, c1); gr.addColorStop(0.6, c2); gr.addColorStop(1, c3);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const BG = { uterus: gradTexBG('#fff1f6', '#fbd3e2', '#efb0c8'), xray: gradTexBG('#16213d', '#22365f', '#2c4a7c') };

function uterusGeo() {
  const g = new THREE.SphereGeometry(1, 96, 64), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = lerp(0.42, 1.08, eio(clamp((y + 1) / 1.45)));
    x *= k * 1.05; z *= k * 0.72; if (y > 0) y *= 0.82;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}

export function makeProcedure(eng) {
  const root = eng.group(eng.scene, [ORIGIN.x, ORIGIN.y, ORIGIN.z]);
  const M = (role, c, o = {}) => eng.M(role, c, o);
  const mesh = (g, m, parent, pos, shadow = true) => { const o = eng.mesh(g, m, parent, pos); o.castShadow = shadow; o.receiveShadow = shadow; return o; };

  // ---------------- матка ----------------
  const U = eng.group(root, [0, 1.5, 0]);
  const pink = M('enamel', 0xf48fb1);
  const uGeo = uterusGeo();
  mesh(uGeo, pink, U);
  mesh(new THREE.CapsuleGeometry(0.3, 0.45, 8, 24), pink, U, [0, -1.15, 0]);
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([[0.8, 0.45, 0], [1.4, 0.85, 0.05], [2.05, 0.7, 0.1], [2.35, 0.15, 0.2]].map((v) => new THREE.Vector3(v[0] * sx, v[1], v[2])));
    mesh(new THREE.TubeGeometry(c, 48, 0.1, 16), pink, U);
    for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.09, 12, 8), pink, U, [sx * (2.35 + Math.cos(i) * 0.14), 0.05 + Math.sin(i * 1.3) * 0.14, 0.22]);
    const ov = mesh(new THREE.SphereGeometry(0.32, 32, 24), M('enamel', 0xf9c1d6), U, [sx * 1.7, -0.25, 0.15]); ov.scale.set(1, 0.7, 0.7);
  }
  const dark = M('eye', 0x3b1420, { outline: false });
  const fibs = [[0.55, 0.62, 0.5, 0.38], [-0.72, 0.05, 0.5, 0.3], [0.12, -0.2, 0.66, 0.22]].map(([x, y, z, r]) => {
    const g = eng.group(U, [x, y, z]);
    const m = M('enamel', 0xd0566f, { unique: true });
    mesh(new THREE.SphereGeometry(r, 48, 32), m, g);
    const face = eng.group(g, [0, 0, r * 0.93]);
    const eyes = [-1, 1].map((sx) => { const e = mesh(new THREE.SphereGeometry(r * 0.12, 16, 12), dark, face, [sx * r * 0.3, r * 0.08, r * 0.02], false); e.scale.z = 0.5; return e; });
    const brows = [-1, 1].map((sx) => { const b = mesh(new THREE.CapsuleGeometry(r * 0.03, r * 0.2, 4, 8), dark, face, [sx * r * 0.3, r * 0.3, 0], false); b.rotation.z = Math.PI / 2 + sx * 0.45; return b; });
    const mouth = mesh(new THREE.TorusGeometry(r * 0.14, r * 0.035, 8, 20, Math.PI), dark, face, [0, -r * 0.3, -r * 0.02], false);
    return { g, m, eyes, brows, mouth };
  });
  const artMat = M('paint', 0xe0303f, { unique: true, emissive: new THREE.Color(0xff2a3c), emissiveIntensity: 0.25 });
  const brMat = M('paint', 0xe0303f, { unique: true, emissive: new THREE.Color(0xff2a3c), emissiveIntensity: 0.25 });
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([[2.3, -2.0, 0.3], [1.5, -1.3, 0.45], [0.95, -0.75, 0.55], [0.98, 0.1, 0.55]].map((v) => new THREE.Vector3(v[0] * sx, v[1], v[2])));
    mesh(new THREE.TubeGeometry(c, 64, 0.06, 12), artMat, U);
  }
  const brPts = [[[0.98, 0.1, 0.55], [0.95, 0.45, 0.6], [0.75, 0.62, 0.72]], [[-0.98, 0.1, 0.55], [-0.9, 0.1, 0.62], [-0.85, 0.08, 0.68]], [[0.98, -0.3, 0.55], [0.6, -0.35, 0.72], [0.25, -0.25, 0.82]]];
  brPts.forEach((pts) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(...v))), 32, 0.045, 10), brMat, U));
  const plugMat = M('paint', 0x29c6ff, { emissive: new THREE.Color(0x29c6ff), emissiveIntensity: 0.9, outline: 0.5 });
  const plugs = brPts.map((pts) => { const p = eng.group(U, pts[1]); for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.035, 12, 8), plugMat, p, [(rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.08], false); return p; });

  /** mode: 'grow' — узлы появляются, артерии пульсируют; 'shrink' — после ЭМА: сосуды серые, узлы уменьшаются. u — доля плана 0…1. */
  function uterusPose(t, mode, u) {
    const pulse = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 7));
    artMat.emissiveIntensity = pulse;
    const shrink = mode === 'shrink' ? eio(seg(u, 0.12, 0.85)) : 0;
    const gray = mode === 'shrink' ? seg(u, 0.0, 0.2) : 0;
    brMat.color.set(0xe0303f).lerp(new THREE.Color(0x9a8f99), gray); brMat.emissiveIntensity = pulse * (1 - gray);
    plugs.forEach((p) => (p.visible = mode === 'shrink'));
    fibs.forEach((f, i) => {
      const grow = mode === 'grow' ? back(seg(u, 0.05 + i * 0.1, 0.25 + i * 0.1)) : 1;
      f.g.scale.setScalar(Math.max(0.001, grow * lerp(1, 0.42, shrink)) * (1 + Math.sin(t * 4 + i) * 0.025));
      f.m.color.set(0xd0566f).lerp(new THREE.Color(0xf2c6d3), shrink);
      f.eyes.forEach((e) => (e.scale.y = mode === 'shrink' ? lerp(1, 0.12, seg(u, 0.3, 0.55)) : 1));
      f.brows.forEach((b, j) => (b.rotation.z = Math.PI / 2 + (j ? -1 : 1) * lerp(0.45, -0.1, shrink)));
      f.mouth.rotation.z = shrink > 0.5 ? Math.PI : 0;
      f.g.rotation.z = Math.sin(t * 2 + i) * 0.08;
    });
    U.rotation.y = Math.sin(t * 0.5) * 0.06;
  }

  // ---------------- «рентген»: прозрачное тело и путь катетера ----------------
  const X = eng.group(root, [0, 0, -40]);
  const glass = M('enamel', 0xa9dcff, { transparent: true, opacity: 0.3, depthWrite: false, outline: false, emissive: new THREE.Color(0x4a8be0), emissiveIntensity: 0.45 });
  mesh(new THREE.SphereGeometry(0.4, 32, 24), glass, X, [0, 3.2, 0], false);
  mesh(new THREE.CapsuleGeometry(0.62, 0.95, 8, 32), glass, X, [0, 1.78, 0], false);
  mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.3, 16), glass, X, [0, 2.85, 0], false);
  for (const sx of [-1, 1]) {
    const a = mesh(new THREE.CapsuleGeometry(0.16, 1.2, 8, 16), glass, X, [sx * 1.0, 1.78, 0], false); a.rotation.z = sx * 0.32;
    mesh(new THREE.CapsuleGeometry(0.22, 1.35, 8, 16), glass, X, [sx * 0.3, -0.25, 0], false);
  }
  const path = new THREE.CatmullRomCurve3([[1.27, 0.95, 0.12], [1.12, 1.65, 0.12], [0.82, 2.38, 0.14], [0.38, 2.5, 0.18], [0.06, 2.32, 0.2], [0, 1.65, 0.22], [0, 1.0, 0.22], [0.2, 0.72, 0.22], [0.14, 0.55, 0.28], [0.02, 0.5, 0.32]].map((v) => new THREE.Vector3(...v)));
  mesh(new THREE.TubeGeometry(path, 200, 0.028, 8), M('paint', 0xff4b5c, { emissive: new THREE.Color(0xff2a3c), emissiveIntensity: 0.6, outline: false }), X, [0, 0, 0], false);
  const cathGeo = new THREE.TubeGeometry(path, 200, 0.05, 10);
  mesh(cathGeo, M('paint', 0x7ff3ff, { emissive: new THREE.Color(0x3fe0ff), emissiveIntensity: 1.2, outline: false }), X, [0, 0, 0], false);
  const tip = mesh(new THREE.SphereGeometry(0.09, 16, 12), M('paint', 0xffffff, { emissive: new THREE.Color(0x9ff7ff), emissiveIntensity: 1.6, outline: false, unique: true }), X, [0, 0, 0], false);
  const ring = mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 32), M('paint', 0xffffff, { emissive: new THREE.Color(0xfff59d), emissiveIntensity: 1.6, outline: false }), X, [1.27, 0.95, 0.14], false);
  const miniU = mesh(uGeo, M('paint', 0xff8fb3, { emissive: new THREE.Color(0xff6f9f), emissiveIntensity: 0.5, unique: true, outline: 0.6 }), X, [0, 0.48, 0.3], false);
  miniU.scale.setScalar(0.2);
  function xrayPose(t, u) {
    const p = eio(seg(u, 0.08, 0.92));
    cathGeo.setDrawRange(0, Math.max(6, Math.floor(cathGeo.index.count * p / 60) * 60));
    tip.position.copy(path.getPointAt(clamp(p)));
    tip.scale.setScalar(1 + 0.25 * Math.sin(t * 10));
    ring.scale.setScalar(1 + 0.3 * Math.sin(t * 6)); ring.visible = u < 0.35;
    miniU.material.emissiveIntensity = 0.4 + 0.5 * seg(u, 0.85, 1) * (0.5 + 0.5 * Math.sin(t * 8));
  }

  // ---------------- полёт внутри артерии ----------------
  const Tn = eng.group(root, [0, 0, -120]);
  const tPts = []; for (let i = 0; i <= 14; i++) tPts.push(new THREE.Vector3(Math.sin(i * 0.9) * 1.6, Math.cos(i * 0.7) * 1.2, -i * 5));
  const curve = new THREE.CatmullRomCurve3(tPts);
  const wall = mesh(new THREE.TubeGeometry(curve, 600, 1.15, 48), M('paint', 0xc9405a, { side: THREE.BackSide, emissive: new THREE.Color(0x5a0d20), emissiveIntensity: 0.6, outline: false }), Tn, [0, 0, 0], false);
  const frames = curve.computeFrenetFrames(600, false);
  const off = (u, r, a) => { const i = Math.round(clamp(u) * 600), p = curve.getPointAt(clamp(u)); return p.addScaledVector(frames.normals[i], Math.cos(a) * r).addScaledVector(frames.binormals[i], Math.sin(a) * r); };
  const cPts = []; for (let i = 0; i <= 120; i++) cPts.push(off(i / 120, 0.5, Math.PI * 0.75));
  const cCurve = new THREE.CatmullRomCurve3(cPts);
  const tCathGeo = new THREE.TubeGeometry(cCurve, 600, 0.085, 16);
  mesh(tCathGeo, M('enamel', 0xe9f1f5, { outline: false }), Tn, [0, 0, 0], false);
  const tTip = mesh(new THREE.SphereGeometry(0.095, 20, 14), M('enamel', 0xf4fbff, { outline: false }), Tn, [0, 0, 0], false);
  const rbcGeo = new THREE.LatheGeometry([[0, -0.05], [0.12, -0.07], [0.2, -0.05], [0.24, 0], [0.2, 0.05], [0.12, 0.07], [0, 0.05]].map((p) => new THREE.Vector2(p[0], p[1])), 24);
  const RBC = 170, rbc = new THREE.InstancedMesh(rbcGeo, M('paint', 0xe2384f, { outline: false, emissive: new THREE.Color(0x7a0d1f), emissiveIntensity: 0.3 }), RBC);
  rbc.frustumCulled = false; Tn.add(rbc);
  const rbcD = Array.from({ length: RBC }, () => ({ u: rnd(), r: 0.55 + rnd() * 0.42, a: rnd() * 6.28, rx: rnd() * 6, ry: rnd() * 6, s: 0.8 + rnd() * 0.5 }));
  const MS = 160, micro = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 14, 10), M('paint', 0x29c6ff, { outline: false, emissive: new THREE.Color(0x0fb4f0), emissiveIntensity: 1.1 }), MS);
  micro.frustumCulled = false; Tn.add(micro);
  const msD = Array.from({ length: MS }, (_, i) => ({ rel: 0.25 + (i / MS) * 0.55 + rnd() * 0.02, r: rnd() * 0.5, a: rnd() * 6.28, sp: 0.028 + rnd() * 0.012, pile: rnd() }));
  const lamp = new THREE.PointLight(0xffd6de, 0, 14, 1.4); Tn.add(lamp);
  const dummy = new THREE.Object3D();
  const camU = (u) => lerp(0.02, 0.46, eio(seg(u, 0, 0.8)));
  /** Камера внутри артерии в долю плана u (dur — длительность плана, с). Возвращает позицию и цель в мировых координатах. */
  function tunnelPose(t, u, dur) {
    const cu = camU(u), cp = curve.getPointAt(cu), look = curve.getPointAt(cu + 0.03);
    lamp.position.copy(cp); lamp.intensity = 7;
    const tipU = cu + 0.065, per = 16 * 6, s0 = Math.floor((cu + 0.028) * 600) * per, s1 = Math.floor(clamp(tipU) * 600) * per;
    tCathGeo.setDrawRange(s0, Math.max(0, s1 - s0));
    tTip.position.copy(cCurve.getPointAt(clamp(tipU)));
    // кровоток замедляется, когда пробка собрана
    const F = t - 0.2 * Math.pow(clamp((u - 0.6) * dur, 0, 2), 2) - 0.8 * Math.max(0, (u - 0.6) * dur - 2);
    rbcD.forEach((d, i) => {
      const uu = (((d.u + F * 0.012 * d.s) % 1) + 1) % 1;
      dummy.position.copy(off(uu, d.r, d.a + t * 0.2)); dummy.rotation.set(d.rx + t * d.s, d.ry + t * 0.7, 0); dummy.scale.setScalar(0.75);
      dummy.updateMatrix(); rbc.setMatrixAt(i, dummy.matrix);
    });
    rbc.instanceMatrix.needsUpdate = true;
    const uEnd = camU(1) + 0.072;
    msD.forEach((d, i) => {
      const lt = (u - d.rel) * dur;
      if (lt < 0) dummy.scale.setScalar(0);
      else {
        let uu = camU(d.rel) + 0.065 + lt * (d.sp * 6 + 0.05);
        const piled = uu >= uEnd - d.pile * 0.012; if (piled) uu = uEnd - d.pile * 0.012;
        dummy.position.copy(off(uu, piled ? Math.sqrt(d.r * 2) * 0.95 : d.r * (1 - Math.exp(-lt * 3)), d.a));
        if (!piled) dummy.position.add(off(uu, 0.5 * Math.exp(-lt * 2.5), Math.PI * 0.75).sub(curve.getPointAt(uu)));
        dummy.scale.setScalar(piled ? 1.25 : 1);
      }
      dummy.updateMatrix(); micro.setMatrixAt(i, dummy.matrix);
    });
    micro.instanceMatrix.needsUpdate = true;
    const w = Tn.getWorldPosition(new THREE.Vector3());
    return { pos: cp.clone().add(w), look: look.clone().add(w) };
  }

  return { root, U, X, Tn, uterusPose, xrayPose, tunnelPose, wall };
}
