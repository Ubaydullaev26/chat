// «Мифы о миоме»: две подруги на топчане во дворе. Прототип для проверки вида.
import * as THREE from 'three';
import { createEngine } from '../core/engine.js';
import { makePerson, MOM } from '../chars/family.js';
import { act } from '../chars/acting.js';
import { query } from '../core/util.js';
import * as W from './world.js';

const SC = 1.5;
export const MADINA = { ...MOM, name: 'madina' };
export const DILNOZA = { ...MOM, name: 'dilnoza',
  col: { ...MOM.col, hat: 0xf4e3ea, cuff: 0xd9b9c6, scarf2: 0xe8dcc6, sleeve: 0x2f8f7a, leg: 0x2f5f6a, knee: 0x2f5f6a },
  atlas: ['#2f8f7a', '#f2c94c', '#7a3f9f', '#f4efe4', '#1f4f6f'],
  look: { ...MOM.look, eyeRX: 10, eyeRY: 15.5, browUp: 5, mouthW: 27 } };

let eng, world, mad, dil;
export async function init(canvas) {
  eng = await createEngine(canvas);
  eng.look({ sunDir: W.SUN, sun: '#fff0d8', sunI: 3.0, sky: '#c2dcff', skyI: 1.2, ground: '#b48a62' });
  world = W.build(eng);
  mad = makePerson(eng, MADINA); mad.root.scale.setScalar(SC); eng.scene.add(mad.root);
  dil = makePerson(eng, DILNOZA); dil.root.scale.setScalar(SC); eng.scene.add(dil.root);
  for (const c of [mad, dil]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.02, 0.03, 18), eng.M('enamel', 0xf6f6f2, { outline: 0.6 }));
    cup.position.set(0, -0.02, 0.02); c.handR.add(cup);
  }
  return { duration: 6, fps: 30 };
}
function update(t) {
  const q = query();
  mad.root.position.set(0.5, 0, 1.75); mad.root.rotation.y = -0.55;
  dil.root.position.set(-0.5, 0, 1.6); dil.root.rotation.y = 0.55;
  mad.pose({ ...act(q.get('mE') || 'happy', 1, t), gestR: 'palms', gestRK: 1, t });
  dil.pose({ ...act(q.get('dE') || 'scared', 1, t), crouch: 0, shrink: 0.3, t });
  const cam = q.get('cam') || 'wide';
  if (cam === 'wide') eng.setCamera({ pos: [0.25, 1.5, 6.3], look: [0, 1.2, 1.0], fov: 34, far: 12000 });
  if (cam === 'dil') eng.setCamera({ pos: [0.55, 1.45, 3.5], look: [-0.45, 1.35, 1.6], fov: 26, far: 12000 });
  if (cam === 'mad') eng.setCamera({ pos: [-0.6, 1.45, 3.6], look: [0.5, 1.35, 1.75], fov: 26, far: 12000 });
  eng.focus = eng.camera.position.distanceTo(new THREE.Vector3(0, 1.3, 1.7)); eng.aperture = 0.02;
  eng.shadow.center.set(0, 1, 0.8); eng.shadow.radius = 6;
  world.sky.follow(eng.camera);
}
export function render(t) { eng.frame(t, update); }
