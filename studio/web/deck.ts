import { stopIndexAt } from '../core/camera.ts';
import type { CameraPath } from '../core/camera.ts';
import type { Job } from '../core/job.ts';
import type { Stage } from './renderer.ts';

const STAGE_W = 1920;
const STAGE_H = 1080;

export type DeckResizeResult = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  transform: string;
};

export type DeckState = {
  stopIndex: number;
  beatIndex: number;
  stop: number;
  t: number;
  duration: number;
  stops: number[];
  lang: 'en' | 'ru';
  playing: boolean;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  transform: string;
};

export type DeckController = {
  readonly stopIndex: number;
  readonly beatIndex: number;
  readonly stop: number;
  readonly time: number;
  readonly duration: number;
  readonly stops: number[];
  readonly lang: 'en' | 'ru';
  readonly playing: boolean;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  t(): number;
  getState(): DeckState;
  next(): DeckState;
  prev(): DeckState;
  goto(stop: number): DeckState;
  seek(time: number): DeckState;
  seekFrame(frame: number, fps?: number): DeckState;
  togglePlay(): DeckState;
  switchLang(): DeckState;
  onKey(key: string): DeckState;
  handleKey(key: string): DeckState;
  resize(width: number, height: number): DeckResizeResult;
};

export type MountDeckOptions = {
  root?: HTMLElement;
  stage?: Stage;
  lang?: 'en' | 'ru';
  onSeek?: (t: number, state: DeckState) => void;
};

function resolveDeckPath(job: Job): CameraPath {
  const found = job.paths.find((p) => p.kind === 'deck') ?? job.paths[0];
  if (found && found.stops.length > 0) return found;
  return {
    id: 'deck',
    kind: 'deck',
    keys: [],
    stops: [0],
  };
}

/** Pure deck state controller handling keyboard navigation, beat stepping, frame seeking, and resize. */
export function createDeckController(job: Job): DeckController {
  const deckPath = resolveDeckPath(job);
  const stops = deckPath.stops.length > 0 ? deckPath.stops.slice() : [0];
  const duration = job.world?.duration ?? Math.max(...stops, 0);
  const langs: ('en' | 'ru')[] = job.langs?.length ? job.langs.slice() : ['en'];

  let stopIndex = 0;
  let currentT = stops[0] ?? 0;
  let playing = false;
  let lang: 'en' | 'ru' = langs[0];
  let width = STAGE_W;
  let height = STAGE_H;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let transform = 'translate(0px, 0px) scale(1)';

  const getState = (): DeckState => ({
    stopIndex,
    beatIndex: stopIndex,
    stop: stopIndex,
    t: currentT,
    duration,
    stops: stops.slice(),
    lang,
    playing,
    width,
    height,
    scale,
    offsetX,
    offsetY,
    transform,
  });

  const goto = (targetStop: number): DeckState => {
    const idx = Math.max(0, Math.min(stops.length - 1, Math.trunc(targetStop)));
    stopIndex = idx;
    currentT = stops[idx] ?? 0;
    playing = false;
    return getState();
  };

  const next = (): DeckState => goto(stopIndex + 1);
  const prev = (): DeckState => goto(stopIndex - 1);

  const seek = (time: number): DeckState => {
    const clamped = Math.max(0, Math.min(duration, Number.isFinite(time) ? time : 0));
    currentT = clamped;
    stopIndex = stopIndexAt(deckPath, clamped);
    return getState();
  };

  const seekFrame = (frame: number, fps = 30): DeckState => {
    const safeFps = fps > 0 ? fps : 30;
    return seek(Math.max(0, frame) / safeFps);
  };

  const togglePlay = (): DeckState => {
    playing = !playing;
    return getState();
  };

  const switchLang = (): DeckState => {
    const idx = langs.indexOf(lang);
    lang = langs[(idx + 1) % langs.length] ?? 'en';
    return getState();
  };

  const handleKey = (key: string): DeckState => {
    switch (key) {
      case 'ArrowRight':
      case 'PageDown':
      case 'Enter':
        return next();
      case 'ArrowLeft':
      case 'PageUp':
        return prev();
      case ' ':
      case 'Space': {
        const wasPlaying = playing;
        if (stopIndex < stops.length - 1) {
          next();
        }
        playing = !wasPlaying;
        return getState();
      }
      case 'l':
      case 'L':
        return switchLang();
      default:
        return getState();
    }
  };

  const resize = (w: number, h: number): DeckResizeResult => {
    const safeW = Math.max(1, w);
    const safeH = Math.max(1, h);
    width = safeW;
    height = safeH;
    scale = Math.min(safeW / STAGE_W, safeH / STAGE_H);
    offsetX = (safeW - STAGE_W * scale) / 2;
    offsetY = (safeH - STAGE_H * scale) / 2;
    transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    return { width, height, scale, offsetX, offsetY, transform };
  };

  return {
    get stopIndex() {
      return stopIndex;
    },
    get beatIndex() {
      return stopIndex;
    },
    get stop() {
      return stopIndex;
    },
    get time() {
      return currentT;
    },
    get duration() {
      return duration;
    },
    get stops() {
      return stops.slice();
    },
    get lang() {
      return lang;
    },
    get playing() {
      return playing;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get scale() {
      return scale;
    },
    t: () => currentT,
    getState,
    next,
    prev,
    goto,
    seek,
    seekFrame,
    togglePlay,
    switchLang,
    onKey: handleKey,
    handleKey,
    resize,
  };
}

function isStage(val: unknown): val is Stage {
  return typeof val === 'object' && val !== null && typeof (val as Stage).seek === 'function';
}

/** Mounts a live deck player over a stage or DOM container, wiring keyboard and resize controls. */
export function mountDeck(
  stageOrJob: Stage | Job,
  jobOrOpts?: Job | MountDeckOptions,
  maybeRoot?: HTMLElement,
): DeckController {
  let stage: Stage | undefined;
  let job: Job;
  let root: HTMLElement | undefined;
  let onSeek: ((t: number, state: DeckState) => void) | undefined;

  if (isStage(stageOrJob)) {
    stage = stageOrJob;
    job = jobOrOpts as Job;
    root = maybeRoot;
  } else {
    job = stageOrJob;
    const opts = (jobOrOpts ?? {}) as MountDeckOptions;
    stage = opts.stage;
    root = opts.root;
    onSeek = opts.onSeek;
  }

  const ctrl = createDeckController(job);

  const sync = (state: DeckState) => {
    if (stage) {
      stage.lang = state.lang;
      void stage.seek(state.t);
    }
    if (onSeek) onSeek(state.t, state);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Enter', ' ', 'l', 'L'].includes(ev.key)) {
        ev.preventDefault();
        const st = ctrl.handleKey(ev.key);
        sync(st);
      }
    });
    window.addEventListener('resize', () => {
      const r = ctrl.resize(window.innerWidth, window.innerHeight);
      if (root) root.style.transform = r.transform;
    });
  }

  if (root && typeof window !== 'undefined') {
    const r = ctrl.resize(window.innerWidth || STAGE_W, window.innerHeight || STAGE_H);
    root.style.transform = r.transform;
  }

  return {
    get stopIndex() {
      return ctrl.stopIndex;
    },
    get beatIndex() {
      return ctrl.beatIndex;
    },
    get stop() {
      return ctrl.stop;
    },
    get time() {
      return ctrl.time;
    },
    get duration() {
      return ctrl.duration;
    },
    get stops() {
      return ctrl.stops;
    },
    get lang() {
      return ctrl.lang;
    },
    get playing() {
      return ctrl.playing;
    },
    get width() {
      return ctrl.width;
    },
    get height() {
      return ctrl.height;
    },
    get scale() {
      return ctrl.scale;
    },
    t: () => ctrl.t(),
    getState: () => ctrl.getState(),
    next: () => {
      const st = ctrl.next();
      sync(st);
      return st;
    },
    prev: () => {
      const st = ctrl.prev();
      sync(st);
      return st;
    },
    goto: (stop: number) => {
      const st = ctrl.goto(stop);
      sync(st);
      return st;
    },
    seek: (time: number) => {
      const st = ctrl.seek(time);
      sync(st);
      return st;
    },
    seekFrame: (frame: number, fps?: number) => {
      const st = ctrl.seekFrame(frame, fps);
      sync(st);
      return st;
    },
    togglePlay: () => ctrl.togglePlay(),
    switchLang: () => {
      const st = ctrl.switchLang();
      sync(st);
      return st;
    },
    onKey: (key: string) => {
      const st = ctrl.onKey(key);
      sync(st);
      return st;
    },
    handleKey: (key: string) => {
      const st = ctrl.handleKey(key);
      sync(st);
      return st;
    },
    resize: (w: number, h: number) => {
      const r = ctrl.resize(w, h);
      if (root) root.style.transform = r.transform;
      return r;
    },
  };
}

