// @ts-check

import { BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments, WireframeGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

import sentiment from 'wink-sentiment';

import { firehose } from 'bski';

import { makeClock } from '../clock';
import { createAtlasRenderer } from '../render';
import { handleWindowResizes } from './handle-window-resizes';
import { setupScene } from './setup-scene';
import { startAnimation } from './start-animation';
import { layoutCalculator } from '../layout/calculator';

/**
 * @param {HTMLDivElement} elem
 * @param {Promise<void>} [unmountPromise]
 */
export function boot(elem, unmountPromise) {
  const clock = makeClock();
  /** @type {ProfilePosition[]} */
  const profilePositions = [];
  /** @type {[ProfilePosition,ProfilePosition, strength: number][]} */
  const profileLinks = [];

  let lastRender = clock.nowMSec;

  const {
    scene,
    camera,
    lights,
    renderer,
    stats,
    orbit
  } = setupScene(clock);

  elem.appendChild(renderer.domElement);

  handleWindowResizes(camera, renderer);

  startAnimation({
    camera,
    clock,
    scene,
    orbit: /** @type {OrbitControls} */(orbit.controls),
    renderer,
    stats,
    onRedrawLive,
    onRedrawRare
  });

  const atlasRenderer = createAtlasRenderer({
    clock,
    nodesLive: streamAccountPositions(),
  });

  scene.add(atlasRenderer.mesh);

  const box = new BoxGeometry(1, 1, 1);
  const geo = new EdgesGeometry(/** @type {*} */(box));
  const mat = new LineBasicMaterial({ color: 0x808080, linewidth: 1, opacity: 0.54, transparent: true });
  const wireframe = new LineSegments(geo, mat);
  scene.add(wireframe);

  function onRedrawLive() {
    const delta = lastRender ? clock.nowMSec - lastRender : 0;
    lastRender = clock.nowMSec;
    orbit.controls?.update?.(Math.min(delta / 1000, 0.2));

    atlasRenderer.redraw(camera);
  }

  function onRedrawRare() {
    if (profilePositions.length < 10) return;

    const layout = layoutCalculator({
      nodes: profilePositions,
      edges: profileLinks
    });

    layout?.run?.(5);
  }

  async function* streamAccountPositions() {
    /** @type {{[uri: string]: number}} */
    const profileIndexByDID = {};

    let lastInject = Date.now();

    for await (const chunk of firehose()) {
      const distinctNewShortDIDs = [];
      for (const th of chunk) {
        if (th.action !== 'create') continue;
        if (th.$type === 'app.bsky.feed.post') {
          /** @type {{ score: number, normalizedScore: number }} */
          const snt = sentiment(th.text);
        }
      }

      const retrieveProfiles = [];
      for (const th of distinctThreads) {
        const thWithPos = /** @type {ThreadWithPosition} */(th);
        calcPos(thWithPos);

        const existingProfileIndex = profileIndexByDID[th.root.shortDID];
        if (typeof existingProfileIndex === 'number') {
          if (!seenThreadUris.has(th.root.uri)) {
            profilePositions[existingProfileIndex].mass += Math.sqrt(th.all.length) / 20000;
            seenThreadUris.add(th.root.uri);
          }
        } else {
          // TODO: retrieve profiles
        }
      }

      await Promise.all(retrieveProfiles);

      lastInject = Date.now();

      console.log('threads: ', profilePositions);
      yield profilePositions;
    }
  }

  // TODO: handle unmountPromise

/**
 * @typedef {import('../../package').CompactThreadPostSet & {
 *  x: number,
 *  y: number
 * }} ThreadWithPosition
 */

  /**
   * @param {ThreadWithPosition} thread
   */
  function calcPos(thread) {
    const oldX = thread.x || 0;
    const oldY = thread.y || 0;

    thread.x = 0;
    thread.y = 0;

    if (thread.root.text?.length) {
      for (let i = 0; i < thread.root.text.length; i++) {
        const charCode = thread.root.text.charCodeAt(i);
        thread.x += 1 / charCode;
        thread.x = Math.pow(10, thread.x);
        thread.x = thread.x - Math.floor(thread.x);
      }
      thread.x = thread.x - 0.5;
    }

    for (let i = 0; i < thread.root.uri.length; i++) {
      const charCode = thread.root.uri.charCodeAt(i);
      thread.y += 1 / charCode;
      thread.y = Math.pow(10, thread.y);
      thread.y = thread.y - Math.floor(thread.y);
    }

    thread.y = thread.y - 0.5;

    if (oldX && oldY) {
      const dist = Math.sqrt(thread.x * thread.x + thread.y * thread.y);
      const angle = Math.atan2(thread.y, thread.x);

      const rotateAngle = (2 * Math.random() - 1) * Math.PI * 2 / 360 * 15;

      thread.x = oldX + Math.cos(angle + rotateAngle) * dist;
      thread.y = oldY + Math.sin(angle + rotateAngle) * dist;
    }
  }
}

/**
 * @typedef {import('../../package').CompactProfile & {
 *  index: number;
 *  x: number;
 *  y: number;
 *  mass: number;
 *  color: number;
 * }} ProfilePosition
 */

function deriveColor(shortDID) {
  let hash = 0;
  for (let i = 0; i < shortDID.length; i++) {
    hash = ((hash << 5) - hash) + shortDID.charCodeAt(i);
    hash |= 0;
  }

  let h = hash / 138727 + 1 / hash;
  h = Math.pow(10, (h - Math.floor(h)) * Math.PI);
  h = h - Math.floor(h);

  h = Math.pow(10, h);
  h = h - Math.floor(h);

  let l = Math.pow(10, h);
  l = l - Math.floor(l);

  const c = hlsToRgb(h, 0.4 + 0.7 * l, 1);
  return c;
}

function hlsToRgb(h, l, s) {
  let r, g, b;

  if (s == 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return (
    ((r * 255 * 255 * 255) | 0) +
    ((g * 255 * 255) | 0) +
    ((b * 255) | 0)
  );
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
