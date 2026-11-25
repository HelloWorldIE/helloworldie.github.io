/* ==========================================================================
   HelloWorld hub: the City's props. Everything here is made from data the
   viewer's own GitHub access returns, so this public file holds no names:

     font column   a font file in a repo: a fluted column with the font's
                   own letters carved round the shaft
     statue        an SVG (a repo's SVG file, its hub/icon.svg, or a
                   category's icon): made solid and stood on a plinth
     flag          a tool the project is built with, shared with others
     garden        tests: a hedged garden, a model tree for each test file
     ruin          a retired (archived) project
     crane         a project marked "in progress" or "experimental"
     demo sign     a demo to try: a small play sign by the door
     live eyes     a live project: the bot's two eyes on its roof
     lock          a private repo
     beacon        a live site, on its own small island
     boat, cloud, bird, person, line car: life around the City

   It looks like a calm architectural model: matte paper tones, soft edges,
   no glow. Colour is never baked in. Each part is painted with a TONE
   index, and one shared uniform turns indices into the palette's colours,
   so a theme change repaints every prop at once.
   Each maker returns plain geometry or a mesh; hwc-city.js places them.
   ========================================================================== */
import * as THREE from '../vendor/three/three.module.min.js';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';
import { SVGLoader } from '../vendor/three/addons/loaders/SVGLoader.js';
import { slab, pill } from './city-architecture.js?v=1';

/* The palette slots. hwc-ui.js gives a colour for each name, light and dark. */
export const TONES = ['body', 'body2', 'body3', 'card', 'edge', 'lot', 'statue', 'ink', 'accent', 'accentSoft', 'accentFaint', 'lawn', 'tree', 'dim', 'frame', 'stone'];
export const TONE = {}; TONES.forEach((n, i) => { TONE[n] = i; });

const cyl = (rt, rb, h, seg, y = 0, x = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y + h / 2, z);

/* Paint every vertex with a tone index (red) and a shade (green, 0.5 = as is). */
export function paint(geo, tone, shade = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const n = g.getAttribute('position').count, a = new Float32Array(n * 3), t = (TONE[tone] != null ? TONE[tone] : tone) / 15;
  for (let i = 0; i < n; i++) { a[i * 3] = t; a[i * 3 + 1] = shade * 0.5; a[i * 3 + 2] = 0; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const merge = (parts) => { const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false); g.computeVertexNormals(); return g; };

/* One matte material for every painted prop: the tone index picks the palette colour. */
export function propMaterial(uniforms, opts = {}) {
  const mat = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9, metalness: 0 }, opts));
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTones = uniforms.uTones;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTones[16];')
      .replace('#include <color_fragment>', `#if defined( USE_COLOR )
        int ti = int( vColor.r * 15.0 + 0.5 );
        diffuseColor.rgb = uTones[ ti ] * ( vColor.g * 2.0 );
      #endif`);
  };
  mat.customProgramCacheKey = () => 'hwc-tone';
  return mat;
}

/* ---------------- font columns ---------------- */
/* The column without its shaft (plinth, base, capital), and the shaft alone, so the shaft can carry
   the carved letters. Both are 1 unit tall and 1 unit across. */
export function columnParts() {
  const rest = merge([
    paint(slab(1.3, 0.07, 1.3, 0, 0.3, 0.02), 'body2'),
    paint(cyl(0.63, 0.67, 0.06, 32, 0.07), 'body'),
    paint(cyl(0.6, 0.52, 0.05, 32, 0.91), 'body'),
    paint(slab(1.24, 0.05, 1.24, 0.95, 0.3, 0.015), 'body2')
  ]);
  const shaft = new THREE.CylinderGeometry(0.5, 0.55, 0.78, 64, 6, true);
  const p = shaft.getAttribute('position');
  for (let i = 0; i < p.count; i++) {                        /* twenty flutes */
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.035 * (0.5 + 0.5 * Math.cos(a * 20));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  shaft.translate(0, 0.13 + 0.39, 0);
  shaft.computeVertexNormals();
  return { rest, shaft };
}
/* Paper with the font's own letters cut into it, winding down the shaft. The canvas wraps once
   round the column; each line is sheared so it drops one line in one turn, which makes the lines
   one continuous helix. Two textures: the surface with soft grooves, and a bump map in which the
   letters are low, so the light catches the edges of the cut. The material's colour tints both
   for the theme. */
export function carvedTexture(fontCss, title, aspect) {
  const W = 512, H = Math.round(Math.min(1024, Math.max(256, W * aspect)));
  const size = 44, step = Math.round(size * 1.45), slope = step / W;
  const text = title + '   ·   Aa Bb Cc Dd Ee Ff   ·   0123456789   ·   ';
  const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const helix = (g, draw) => {
    g.font = fontCss.replace('{size}', size + 'px');
    g.textBaseline = 'middle';
    const pw = Math.max(60, g.measureText(text).width);
    g.setTransform(1, slope, 0, 1, 0, 0);                  /* y' = y + slope * x: the line falls as it goes round */
    for (let k = -2; k * step < H + step; k++) {
      const y = k * step + step / 2;
      for (let x = -(((k * W) % pw) + pw) % pw; x < W; x += pw) draw(x, y);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  };
  const col = canvas(), g = col.getContext('2d');
  g.fillStyle = '#f4f2f8'; g.fillRect(0, 0, W, H);
  helix(g, (x, y) => {
    g.fillStyle = 'rgba(38,36,48,.22)'; g.fillText(text, x - 1, y - 1);     /* shade in the top of the cut */
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText(text, x + 1, y + 1);   /* light on the bottom edge */
    g.fillStyle = '#b9b4c6'; g.fillText(text, x, y);                         /* the floor of the groove */
  });
  const bump = canvas(), b = bump.getContext('2d');
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, W, H);
  b.filter = 'blur(1.1px)';                                                   /* a soft bevel at the edges of the cut */
  helix(b, (x, y) => { b.fillStyle = '#000000'; b.fillText(text, x, y); });
  const map = new THREE.CanvasTexture(col), bm = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace;
  [map, bm].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; });
  return { map, bump: bm };
}

/* ---------------- statues from SVG ---------------- */
/* A flat triangle mesh made solid: front, back and walls round the outline. */
function thicken(flat, depth) {
  const pos = flat.getAttribute('position'), out = [], edges = new Map();
  const k = (x, y) => x.toFixed(3) + ',' + y.toFixed(3);
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const v = [0, 1, 2].map((j) => [pos.getX(t + j), pos.getY(t + j)]);
    out.push(v[0][0], v[0][1], depth, v[1][0], v[1][1], depth, v[2][0], v[2][1], depth);
    out.push(v[0][0], v[0][1], 0, v[2][0], v[2][1], 0, v[1][0], v[1][1], 0);
    [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
      const ka = k(v[a][0], v[a][1]), kb = k(v[b][0], v[b][1]), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [v[a], v[b]]);
    });
  }
  edges.forEach(([p, q]) => out.push(p[0], p[1], 0, q[0], q[1], 0, q[0], q[1], depth, p[0], p[1], 0, q[0], q[1], depth, p[0], p[1], depth));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return g;
}
/* Any SVG (filled shapes or stroked lines) as a solid, 1 unit tall, standing on y = 0. */
export function svgGeometry(svgText, depthRatio = 0.16) {
  let data;
  /* shapes only: colours, gradients and see-through fills mean nothing in a matte statue */
  let src = String(svgText).replace(/currentColor/g, '#000').replace(/url\([^)]*\)/g, '#000')
    .replace(/rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,[^)]*\)/g, 'rgb($1,$2,$3)');
  if (!/xmlns=/.test(src)) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  try { data = new SVGLoader().parse(src); } catch (e) { return null; }
  const parts = [];
  let vb = 24;
  const m = /viewBox="[\d.\s-]+?\s([\d.]+)\s([\d.]+)"/.exec(svgText);
  if (m) vb = Math.max(+m[1], +m[2]) || 24;
  const depth = vb * depthRatio;
  data.paths.forEach((path) => {
    const st = (path.userData && path.userData.style) || {};
    const filled = st.fill && st.fill !== 'none' && st.fill !== 'transparent';
    if (filled) SVGLoader.createShapes(path).forEach((sh) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 8 });
      parts.push(g.index ? g.toNonIndexed() : g);
    });
    if (st.stroke && st.stroke !== 'none') path.subPaths.forEach((sp) => {
      const pts = sp.getPoints(12);
      if (pts.length < 2) return;
      const flat = SVGLoader.pointsToStroke(pts, st);
      if (flat) parts.push(thicken(flat, depth));
    });
  });
  if (!parts.length) return null;
  const clean = parts.map((g) => { const n = new THREE.BufferGeometry(); n.setAttribute('position', g.getAttribute('position')); return n; });
  const g = mergeGeometries(clean, false);
  if (!g) return null;
  g.scale(1, -1, 1);                                   /* SVG y runs down */
  g.computeBoundingBox();
  const bb = g.boundingBox, h = Math.max(bb.max.y - bb.min.y, 1e-3);
  g.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
  g.scale(1 / h, 1 / h, 1 / h);
  g.computeVertexNormals();
  return g;
}
/* A plinth for a statue: 1 unit tall, 1 across, soft edges. */
export function plinthGeometry() {
  return merge([
    paint(slab(1, 0.1, 1, 0, 0.22, 0.03), 'body2'), paint(slab(0.78, 0.78, 0.78, 0.1, 0.16, 0.04), 'body'),
    paint(slab(0.9, 0.12, 0.9, 0.88, 0.2, 0.04), 'body2')
  ]);
}

/* ---------------- flags (tools shared by several projects) ---------------- */
/* One instanced cloth; a slow wave runs in the vertex shader from uTime. Colours per instance. */
export function flagMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = float(gl_InstanceID) * 1.7;
        transformed.z += sin(position.x * 4.0 - uTime * 1.6 + ph) * 0.1 * position.x;
        transformed.y += sin(position.x * 2.5 - uTime * 1.2 + ph) * 0.03 * position.x;`);
  };
  mat.customProgramCacheKey = () => 'hwc-flag';
  return mat;
}
export function flagGeometry() { return new THREE.PlaneGeometry(1, 0.62, 10, 1).translate(0.5, 0, 0); }
export function poleGeometry() { return merge([paint(pill(0.05, 1, 0, 0, 0, 6), 'statue')]); }

/* ---------------- ruins (retired projects) ---------------- */
export function ruinGeometry(seed = 1) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const parts = [paint(slab(1, 0.06, 1, 0, 0.2, 0.02), 'body3')];
  [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32], [0, -0.32]].forEach(([x, z], i) => {
    const h = 0.25 + r() * 0.75;
    if (i === 4 && r() < 0.5) return;
    parts.push(paint(pill(0.075, h, 0.06, x, z, 10), 'body3', 0.98));             /* broken pill columns */
  });
  parts.push(paint(slab(0.7, 0.3, 0.1, 0.06, 0.05, 0.03, 0, 0.38).rotateY(0.04), 'dim'));   /* a low broken wall */
  for (let i = 0; i < 7; i++) parts.push(paint(slab(0.1, 0.07, 0.08, 0.06, 0.03, 0.02, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9).rotateY(r() * 3), 'dim', 0.96));
  const g = merge(parts);
  g.computeBoundingBox(); const bb = g.boundingBox;
  g.scale(1, 1 / Math.max(bb.max.y, 1e-3), 1);
  return g;
}

/* ---------------- crane (in progress) ---------------- */
export function crane(mat) {
  const grp = new THREE.Group();
  const mast = new THREE.Mesh(merge([paint(slab(0.6, 0.3, 0.6, 0, 0.16, 0.05), 'body3'), paint(slab(0.3, 14, 0.3, 0.3, 0.12, 0.05), 'body'), paint(slab(0.56, 0.6, 0.56, 14.3, 0.18, 0.06), 'ink', 1.4)]), mat);
  const jib = new THREE.Group(); jib.position.y = 14.9;
  jib.add(new THREE.Mesh(merge([
    paint(slab(11, 0.3, 0.3, 0, 0.12, 0.05, 4.2, 0), 'body'), paint(slab(3.2, 0.3, 0.3, 0, 0.12, 0.05, -2.4, 0), 'body'),
    paint(slab(1, 0.8, 0.7, -0.6, 0.2, 0.08, -3.4, 0), 'body3'), paint(pill(0.12, 2.2, 0.2, 0, 0, 8), 'body'),
    paint(pill(0.03, 5, -5, 8.5, 0, 6), 'ink', 1.4), paint(slab(0.46, 0.4, 0.46, -5.4, 0.12, 0.06, 8.5, 0), 'ink', 1.4)
  ]), mat));
  grp.add(mast, jib);
  grp.userData.jib = jib;
  grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return grp;
}

/* ---------------- a demo to try ---------------- */
/* A small round sign by the door with a soft play mark. It does not spin or glow. */
export function demoSign(mat) {
  const tri = new THREE.Shape(); tri.moveTo(-0.26, -0.32); tri.lineTo(0.36, 0); tri.lineTo(-0.26, 0.32); tri.closePath();
  const play = new THREE.ExtrudeGeometry(tri, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 2 }).translate(0, 1.05, 0.03);
  const disc = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 32).rotateX(Math.PI / 2).translate(0, 1.05, 0);
  const g = merge([paint(slab(0.5, 0.08, 0.5, 0, 0.14, 0.03), 'body2'), paint(pill(0.06, 0.5, 0.06, 0, 0, 8), 'body3'), paint(disc, 'body'), paint(play, 'ink', 1.4)]);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

/* ---------------- live: the bot's two eyes on the roof ---------------- */
export function liveEyesGeometry() {
  return merge([paint(pill(0.12, 0.6, 0, -0.17, 0, 12), 'accent'), paint(pill(0.12, 0.6, 0, 0.17, 0, 12), 'accent')]);
}
/* ---------------- private: a small lock ---------------- */
export function lockGeometry() {
  const shackle = new THREE.TorusGeometry(0.16, 0.05, 8, 20, Math.PI).translate(0, 0.42, 0);
  return merge([paint(slab(0.5, 0.42, 0.26, 0, 0.08, 0.04), 'ink', 1.4), paint(shackle, 'ink', 1.4)]);
}
/* ---------------- in progress: a ring lying on the roof ---------------- */
export function roofRingGeometry() { return new THREE.TorusGeometry(0.5, 0.05, 8, 40).rotateX(Math.PI / 2); }

/* ---------------- gardens (tests) and trees ---------------- */
export function hedgeGeometry(poly, y) {
  const parts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const g = slab(len + 0.42, 0.5, 0.42, 0, 0.2, 0.1);
    g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0]));
    g.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    parts.push(paint(g, 'tree', 0.96));
  }
  return parts.length ? merge(parts) : null;
}
/* A model tree: a slim trunk under a round canopy. About 1.6 units tall. */
export function treeGeometry() {
  return merge([paint(pill(0.07, 0.7, 0, 0, 0, 6), 'body3'), paint(new THREE.SphereGeometry(0.46, 14, 10).scale(1, 1.1, 1).translate(0, 1.1, 0), 'tree')]);
}

/* ---------------- islands, beacons, boats ---------------- */
/* A live site's beacon: a slim pill tower with a violet cap (live). The cap is its own mesh so it
   can grow a little when the selected project runs here. */
export function beacon(mat, capMat) {
  const body = new THREE.Mesh(merge([paint(slab(2.4, 0.5, 2.4, 0, 0.6, 0.15), 'body2'), paint(pill(0.7, 6.4, 0.5, 0, 0, 20), 'body'), paint(cyl(0.82, 0.82, 0.12, 24, 5.0), 'body3')]), mat);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12).scale(1, 1.25, 1).translate(0, 0.0, 0), capMat);
  cap.position.y = 6.9;
  const g = new THREE.Group(); g.add(body, cap);
  body.castShadow = true; cap.castShadow = true;
  g.userData.cap = cap;
  return g;
}
export function boatGeometry() {
  const hull = pill(0.42, 2.4, 0, 0, 0, 12).rotateZ(Math.PI / 2).scale(1, 0.6, 1).translate(1.2, 0.25, 0);
  return merge([paint(hull, 'body'), paint(slab(0.8, 0.45, 0.55, 0.3, 0.14, 0.06, -0.2, 0), 'body3')]);
}

/* ---------------- sky and streets ---------------- */
export function cloudGeometry(seed) {
  let s = seed;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.SphereGeometry(2.4 + r() * 2.6, 16, 10);
    g.scale(1, 0.55, 0.8);
    g.translate((r() - 0.5) * 9, r() * 1.2, (r() - 0.5) * 4);
    parts.push(paint(g, 'body', 1.04));
  }
  return merge(parts);
}
export function birdGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -1, 0.35, -0.1, 0, 0, -0.2, 0, 0, 0.3, 0, 0, -0.2, 1, 0.35, -0.1], 3));
  return paint(g, 'ink', 1.2);
}
/* A model figure: a small pill with a round head. */
export function personGeometry() {
  return merge([paint(pill(0.17, 0.62, 0, 0, 0, 8), 'statue'), paint(new THREE.SphereGeometry(0.14, 10, 8).translate(0, 0.78, 0), 'statue', 0.9)]);
}

/* ---------------- billboard (a project's own picture) ---------------- */
export function billboard(texture, w, h, mat) {
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(merge([
    paint(pill(0.14, 4, 0, -w * 0.35, 0, 8), 'body3'), paint(pill(0.14, 4, 0, w * 0.35, 0, 8), 'body3'),
    paint(slab(w + 0.5, 0.2, h + 0.5, 0, 0.35, 0.08).rotateX(Math.PI / 2).translate(0, 3.8 + h / 2, -0.25), 'frame')
  ]), mat);
  frame.castShadow = true;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  pic.position.set(0, 3.8 + h / 2, 0.0);
  grp.add(frame, pic);
  return grp;
}

/* ---------------- the HelloWorld line's car ---------------- */
/* A pill-shaped cabin hanging from the line. The passenger is the real bot, drawn by the page over
   the canvas, never a model of him. */
export function lineCar(mat) {
  const cabin = pill(0.6, 2.2, 0, 0, 0, 18).rotateZ(Math.PI / 2).translate(1.1, -0.2, 0);
  const band = pill(0.62, 1.7, 0, 0, 0, 18).rotateZ(Math.PI / 2).scale(1, 0.32, 1.02).translate(0.85, 0.02, 0);
  const g = merge([paint(cabin, 'body'), paint(band, 'ink', 1.5), paint(pill(0.05, 1.5, 0.3, 0, 0, 6), 'ink', 1.4)]);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  const grp = new THREE.Group(); grp.add(m);
  return grp;
}

/* ---------------- carved stones (a project's pictures) ---------------- */
/* A picture traced into stone: its outlines (a Sobel edge pass) become grooves, and a faint wash
   of its light and shade stays in the surface. */
export async function engraveImage(blob) {
  const bmp = await createImageBitmap(blob);
  const W = 384, H = Math.max(120, Math.min(384, Math.round(W * bmp.height / Math.max(1, bmp.width))));
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sg = src.getContext('2d'); sg.drawImage(bmp, 0, 0, W, H);
  if (bmp.close) bmp.close();
  const d = sg.getImageData(0, 0, W, H).data, L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255 * (d[i * 4 + 3] / 255) + (1 - d[i * 4 + 3] / 255);
  const E = new Float32Array(W * H), at = (x, y) => L[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const vals = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
    const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
    const m = Math.hypot(gx, gy); E[y * W + x] = m; if ((x + y) % 7 === 0) vals.push(m);
  }
  vals.sort((a, b) => a - b);
  const hi = Math.max(0.05, vals[Math.floor(vals.length * 0.96)] || 1);
  const col = document.createElement('canvas'), bmpC = document.createElement('canvas');
  col.width = bmpC.width = W; col.height = bmpC.height = H;
  const cg = col.getContext('2d'), bg = bmpC.getContext('2d');
  const ci = cg.createImageData(W, H), bi = bg.createImageData(W, H);
  let seed = 4099;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < W * H; i++) {
    const e = Math.min(1, E[i] / hi), groove = e > 0.28 ? Math.min(1, (e - 0.28) / 0.5) : 0;
    const grain = (rnd() - 0.5) * 8, shade = 0.94 + 0.06 * L[i];
    const v = (240 + grain) * shade * (1 - groove * 0.32);
    ci.data[i * 4] = v * 0.985; ci.data[i * 4 + 1] = v * 0.98; ci.data[i * 4 + 2] = v; ci.data[i * 4 + 3] = 255;
    const h = 255 * (1 - groove * 0.9);
    bi.data[i * 4] = bi.data[i * 4 + 1] = bi.data[i * 4 + 2] = h; bi.data[i * 4 + 3] = 255;
  }
  cg.putImageData(ci, 0, 0); bg.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(col), bump = new THREE.CanvasTexture(bmpC);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = bump.anisotropy = 4;
  return { map, bump, aspect: W / H };
}
/* A standing stone with a carved face, leaning back a little. About 2.4 units tall. `stoneMat` and
   `faceMat` are tinted by the City for the theme. */
export function carvedStone(tex, stoneMat, faceMat) {
  const grp = new THREE.Group();
  const h = 2.2, w = Math.max(1.5, Math.min(3.8, h * tex.aspect));
  faceMat.map = tex.map; faceMat.bumpMap = tex.bump; faceMat.bumpScale = 3; faceMat.needsUpdate = true;
  const base = new THREE.Mesh(slab(w + 0.5, 0.25, 0.9, 0, 0.2, 0.06), stoneMat);
  const stone = new THREE.Mesh(slab(w, h, 0.28, 0, 0.12, 0.06), stoneMat);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.88).translate(0, h / 2, 0.142), faceMat);
  const lean = new THREE.Group(); lean.position.y = 0.25; lean.rotation.x = -0.1;
  lean.add(stone, face);
  grp.add(base, lean);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}
