import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cameraAt, stopIndexAt, swapAlpha } from '../core/camera.ts';
import { toCamera } from '../core/frames.ts';
import { resolve } from '../core/lens.ts';
import type { Lens } from '../core/lens.ts';
import { sample } from '../core/timeline.ts';
import type { Job } from '../core/job.ts';
import type { WorldObject } from '../core/world.ts';

export type Stage = { seek(t: number): Promise<void>; duration: number; stops: number[]; lang: 'en' | 'ru' };

const W = 1920;
const H = 1080;
// Font size by block role, in layout pixels at 1920 wide (stage/SPEC.md section 3).
const ROLE_PX = { title: 51, label: 42, note: 37 } as const;
const DRAWN: WorldObject['kind'][] = ['molecule', 'mesh', 'surface'];
const TRACK_PROPS = ['position', 'opacity'];
const HIDE_BELOW = 0.002;
// Planes in camera distances. The far plane is far out, so a closed container such as the liquid stays in view while the camera is deep inside it. The depth buffer is logarithmic.
const NEAR = 1e-3;
const FAR = 1e6;

type Entry = {
  obj: WorldObject;
  group: THREE.Group;
  exact: THREE.Object3D | null;
  stand: THREE.Object3D | null;
  mats: { exact: THREE.MeshStandardMaterial; stand: THREE.MeshStandardMaterial };
  base: number; // the opacity the lens gives this role
  positionTrack: number; // index into timeline.tracks, or -1
  opacityTrack: number;
  attenuation: number; // glass only: the attenuation distance as a fraction of the size, or 0
};

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const [ra, rb] = [hexToRgb(a), hexToRgb(b)];
  return `rgb(${ra.map((v, i) => Math.round(v + (rb[i] - v) * t)).join(',')})`;
};

/** A soft backdrop made from the lens colours: a light pool in the middle of a dark lens, darker edges on a light lens.
 *  It stays fixed on the screen, and glass and liquid refract it, which is what makes them read as glass and liquid. */
function backdrop(lens: Lens): THREE.CanvasTexture {
  const w = 1024;
  const h = 576;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const [r, gr, b] = hexToRgb(lens.background);
  const dark = 0.2126 * r + 0.7152 * gr + 0.0722 * b < 128;
  const centre = dark ? mixHex(lens.background, lens.text.color, 0.1) : lens.background;
  const edge = dark ? lens.background : mixHex(lens.background, lens.text.color, 0.1);
  const grad = g.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h * 0.46, w * 0.62);
  grad.addColorStop(0, centre);
  grad.addColorStop(1, edge);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paint(object: THREE.Object3D, material: THREE.Material) {
  object.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = material;
  });
}

export function createStage(
  canvas: HTMLCanvasElement,
  job: Job,
  lens: Lens,
  path: string,
  assets: Map<string, THREE.Object3D>,
  environment?: THREE.Texture | null,
): Stage {
  const camPath = job.paths.find((p) => p.id === path);
  if (!camPath) throw new Error(`unknown path "${path}"`);
  const world = job.world;
  for (const tr of job.timeline.tracks) {
    if (!TRACK_PROPS.includes(tr.prop)) throw new Error(`timeline prop "${tr.prop}" on "${tr.target}" is not supported`);
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(new THREE.Color(lens.background));

  const scene = new THREE.Scene();
  scene.background = backdrop(lens);
  const camera = new THREE.PerspectiveCamera(40, W / H, NEAR, FAR);
  scene.add(camera);
  // Light and reflections come from the lens HDRI in the material library. Without one, a plain built-in room is used.
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (environment) {
    scene.environment = pmrem.fromEquirectangular(environment).texture;
    scene.environmentIntensity = lens.environment?.intensity ?? 1;
  } else {
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.4;
  }
  // Lights ride with the camera, so the look does not change with the view direction.
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(0.5, 1, 1);
  camera.add(key, key.target);
  key.target.position.set(0, 0, -1);
  // A cool light from behind gives the glossy edge on a dark stage.
  const rim = new THREE.DirectionalLight(0x9fc4ff, 2.2);
  rim.position.set(-3, 2, -4);
  camera.add(rim, rim.target);
  rim.target.position.set(0, 0, -1);
  camera.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.7));

  const entries: Entry[] = [];
  for (const obj of world.objects) {
    if (!DRAWN.includes(obj.kind) || !obj.asset) continue;
    const style = resolve(obj, lens);
    // A role with transmission is glass or liquid: it refracts the scene behind it and ignores the flat opacity.
    const glass = (style.transmission ?? 0) > 0;
    const base = glass ? 1 : style.opacity ?? 1;
    const track = (prop: string) =>
      job.timeline.tracks.findIndex((tr) => tr.target === obj.id && tr.prop === prop);
    const positionTrack = track('position');
    const opacityTrack = track('opacity');
    const fades = !glass && (base < 1 || opacityTrack >= 0 || !!obj.standIn);
    const material = () =>
      glass
        ? new THREE.MeshPhysicalMaterial({
            color: style.color,
            metalness: style.metalness,
            roughness: style.roughness,
            transmission: style.transmission,
            thickness: style.thickness ?? 0, // in object units, so it scales with the object
            attenuationColor: new THREE.Color(style.attenuation?.color ?? '#ffffff'),
            emissive: new THREE.Color(style.emissive?.color ?? '#000000'),
            emissiveIntensity: style.emissive?.intensity ?? 0,
            // Glass does not hide what is inside it, so it does not write depth.
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        : new THREE.MeshStandardMaterial({
            color: style.color,
            metalness: style.metalness,
            roughness: style.roughness,
            transparent: fades,
            // A fully opaque role keeps depth writing while it fades, so its inner surfaces do not fight. Translucent roles do not write depth.
            depthWrite: base >= 1,
            side: THREE.DoubleSide,
          });
    const mats = { exact: material(), stand: material() };
    const proto = assets.get(obj.asset);
    if (!proto) throw new Error(`object "${obj.id}": asset "${obj.asset}" is not loaded`);
    const exact = proto.clone(true);
    paint(exact, mats.exact);
    const group = new THREE.Group();
    if (obj.rotation) group.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
    group.add(exact);
    let stand: THREE.Object3D | null = null;
    if (obj.standIn) {
      const sp = assets.get(obj.standIn.asset);
      if (!sp) throw new Error(`object "${obj.id}": stand-in asset "${obj.standIn.asset}" is not loaded`);
      stand = sp.clone(true);
      paint(stand, mats.stand);
      group.add(stand);
    }
    // Glass does not see other glass behind it, so a later object in the job draws over an earlier one: list the liquid after its tube.
    const order = entries.length;
    group.traverse((o) => {
      o.renderOrder = order;
    });
    scene.add(group);
    entries.push({
      obj,
      group,
      exact,
      stand,
      mats,
      base,
      positionTrack,
      opacityTrack,
      attenuation: glass ? style.attenuation?.distance ?? 0 : 0,
    });
  }

  // Layout blocks: HTML over the canvas. One block list per stop and language.
  const layoutEl = canvas.parentElement?.querySelector<HTMLElement>('[data-layout]') ?? null;
  let shown = '';
  function showLayout(stop: number, lang: 'en' | 'ru') {
    if (!layoutEl) return;
    layoutEl.style.background = `linear-gradient(to top, ${lens.background}d9 0%, ${lens.background}00 42%)`;
    const id = `${stop}/${lang}`;
    if (id === shown) return;
    shown = id;
    layoutEl.replaceChildren();
    const entry = job.layout.find((l) => l.stop === stop && l.lang === lang);
    for (const b of entry?.blocks ?? []) {
      const el = document.createElement('div');
      el.className = 'block';
      el.dataset.block = b.id;
      el.dataset.role = b.role;
      const [x, y, w, h] = b.box;
      Object.assign(el.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        fontSize: `${ROLE_PX[b.role]}px`,
        color: lens.text.color,
        fontFamily: `${lens.text.family}, Arial, sans-serif`,
      });
      el.textContent = b.text;
      layoutEl.appendChild(el);
    }
  }

  const stage: Stage = {
    duration: world.duration,
    stops: camPath.stops.slice(),
    lang: job.langs[0],
    async seek(t: number) {
      const cam = cameraAt(world, camPath, t);
      const d = cam.distance; // one render unit is one camera distance
      camera.fov = cam.fov;
      camera.near = NEAR;
      camera.far = FAR;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0, 0);
      const look = toCamera(world, cam.target, cam.at);
      const lx = look[0] / d;
      const ly = look[1] / d;
      const lz = look[2] / d;
      camera.up.set(0, Math.abs(ly) > 0.999 ? 0 : 1, Math.abs(ly) > 0.999 ? 1 : 0);
      camera.lookAt(lx, ly, lz);
      camera.updateMatrixWorld(true);

      for (const e of entries) {
        const { obj } = e;
        const live = t >= obj.window[0] && t <= obj.window[1];
        const pos =
          e.positionTrack >= 0
            ? (sample(job.timeline.tracks[e.positionTrack], t) as [number, number, number])
            : obj.position;
        const rel = toCamera(world, { frame: obj.frame, pos }, cam.at); // metres
        e.group.position.set(rel[0] / d, rel[1] / d, rel[2] / d);
        e.group.scale.setScalar(obj.size / d);
        const dist = Math.hypot(rel[0], rel[1], rel[2]);
        const anim = e.opacityTrack >= 0 ? (sample(job.timeline.tracks[e.opacityTrack], t) as number) : 1;
        const alpha = obj.standIn ? swapAlpha(dist, obj.standIn.swapAt) : 0;
        const exactOp = live ? (1 - alpha) * anim * e.base : 0;
        const standOp = live ? alpha * anim * e.base : 0;
        // Render units are camera distances, so a distance in object sizes becomes size / d units.
        if (e.attenuation > 0) (e.mats.exact as THREE.MeshPhysicalMaterial).attenuationDistance = (e.attenuation * obj.size) / d;
        e.mats.exact.opacity = exactOp;
        e.mats.stand.opacity = standOp;
        if (e.exact) e.exact.visible = exactOp > HIDE_BELOW;
        if (e.stand) e.stand.visible = standOp > HIDE_BELOW;
        e.group.visible = live && (exactOp > HIDE_BELOW || standOp > HIDE_BELOW);
      }
      renderer.render(scene, camera);
      showLayout(stopIndexAt(camPath, t), stage.lang);
    },
  };
  return stage;
}
