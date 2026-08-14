import * as THREE from 'three';

// Frozen config exported from the warded-braid studio (cavern/warded-braid-studio).
// The shader takes these as uniforms rather than literals so the studio and this
// component stay value-compatible; see the studio's PARAMETER-MAP.md for the mapping.
const CONFIG = {
  ribbonCount: 6,
  baseR: 1,
  baseA: 0.22,
  baseB: 0.245,
  helixFactor: 3,
  curveSteps: 210,
  geoSteps: 520,
  width: 0.1,
  thicknessRatio: 0.55,
  sectionSegs: 32,
  squirclePower: 0.9,
  curveTension: 0.5,
  Roffsets: [0.014, -0.009, 0.021, 0, 0, 0],
  Aoffsets: [-0.008, 0.011, -0.03, 0, 0, 0],
  Boffsets: [0.009, -0.013, 0.006, 0, 0, 0],
  skews: [0.018, -0.024, 0.011, 0, 0, 0],
  protagonistA: 1,
  protagonistB: 3,
  accent: '#e8dcc0',
  spark: '#a99ce4',
  metalF0: '#4d475c',
  bodyBase: '#030204',
  amethyst: '#6b4d9e',
  roughnessBase: 0.33,
  roughnessMottle: 0.25,
  anisoX: 0.11,
  anisoY: 0.75,
  brushStrength: 0.011,
  mottleStrength: 0.005,
  brushScaleU: 650,
  brushScaleV: 8,
  mottleScaleU: 90,
  mottleScaleV: 16,
  aoInward: 0.23,
  aoHeight: 0.14,
  aoNeighbor: 0.42,
  throughStrength: 0.2,
  envAmethyst: 0.18,
  rimBloom: 0.1,
  sweepSpeed: 0.12,
  sweepWidth: 0.1,
  sweepAmp: 0.34,
  breatheAmp: 0.12,
  breatheSpeed: 1.5,
  smokeAmount: 0.18,
  smokeColor: '#ccbeeb',
  smokeDensity: 0.85,
  smokeScaleU: 80,
  smokeScaleV: 2,
  smokeSpeed: 1.5,
  smokeWarp: 4,
  smokeContrast: 1.25,
  smokeParallax: 0.94,
  smokeGlass: 0.98,
  flatAmount: 0.5,
  flatBands: 5,
  flatColor: '#000000',
  inkColor: '#120e1c',
  edgeWidth: 0.58,
  edgeStrength: 0.7,
  flattenAmount: 0,
  afterglowAmount: 0.53,
  afterglowLength: 0.29,
  afterglowColor: '#c09ecd',
  afterglowSpread: 0.46,
  afterglowSoft: 0.08,
  loopDuration: 12,
  approachStart: 4.4,
  approachEnd: 6.4,
  holdStart: 6.2,
  holdPeak: 6.9,
  holdEnd: 8.6,
  holdFade: 9.3,
  tipShowStart: 6.8,
  tipShowEnd: 9.6,
  revealRate: 0.03,
  speeds: [0.046, 0.062, 0.046, 0.05, 0.05, 0.05],
  groupScale: 0.82,
  // outer radius of the weave in local units, for the seat the page draws around it
  outerRadius: 1.42,
  groupY: 0.18,
  rotYSpeed: 0.055,
  // POWERED: click seats the object into the panel and spins it up like a blower fan
  spinUpRate: 2.6,
  spinDownRate: 1.1,
  // seated it turns a little faster than idle -- a stone set in a socket, driven, not floating
  poweredSpin: 0.085,
  // and it compresses into the seat: the weave's vertical excursion is what opens the gaps
  // between strands, so squashing local Y closes them without any chance of interpenetration
  // (a linear map keeps disjoint solids disjoint). XZ pulls in a hair so it reads as set, not
  // shrunk -- the published seat radius is unchanged, so the panel around it never moves.
  seatSquashY: 0.7,
  seatTightenXZ: 0.965,
  // it does not drop — it flies back into the panel and sets into the seat
  seatPush: 1.15,
  seatTime: 0.62,
  rotXBase: 1.12,
  pointerSensX: 0.1,
  pointerSensY: 0.06,
  // Seated in a panel, not floating in a studio. The annotation, the ward pulse, the floor and
  // its cast all belonged to the old staging and are switched off here; the light stays, because
  // it is what puts a travelling highlight on the metal.
  showWard: false,
  showAnnotation: false,
  showFloor: false,
  liftAmp: 0,
  liftSpeed: 0.6,
  cameraDist: 7.3,
  cameraY: 1.35,
  cameraFov: 32,
  orthoAmount: 1,
  frameH: 540,
  objectXFrac: 0.26,
  wardRadius: 1.85,
  ringSize: 1.5,
  ringLift: 0.5,
  crossingSamples: 180,
  shadowSize: 28,
  shadowY: -1.58,
  // LIGHT AND SHADOW
  // One light, one floor, and a real shadow map off the ribbon geometry, so the gaps in the
  // weave carry through the cast. Two receivers share that one map: an ink pass that darkens
  // where the geometry occludes the light, and an emit pass that adds light where it does not.
  // On a light page the ink carries it; on a dark page the ink has nothing to darken, so the
  // emit pass takes over and the object reads as throwing light through itself onto the stage.
  // data-look picks the setup; the cursor steers it from there.
  sunHeight: 8.5,
  shadowFrame: 4.8,
  shadowMapSize: 1024,
  shadowBlur: 2.5,
  shadowBlurSamples: 10,
  shadowBias: -0.0015,
  shadowNormalBias: 0.02,
  emitColor: '#c3b6e0',
  // the cast dissolves into the floor before the plane runs out, so no receiver edge ever shows
  shadowReach: 4.2,
  shadowReachFade: 1.8,
  // the cursor steers the light: sway swings it across the stage, tilt rakes it toward the
  // viewer, and the damping keeps a fast flick from snapping the cast
  cursorSway: 5.2,
  cursorTilt: 2.2,
  cursorDamp: 0.055,
  defaultLook: 'studio',
  looks: {
    // dir is the direction TO the light from the object; ink/emit are the two passes, per theme
    studio: { dir: [0.38, 1, 0.42], ink: 0.52, inkDark: 0.14, emit: 0.6, sheen: 0.3, sheenR: 3 },
    chamber: { dir: [0.92, 1, 0.16], ink: 0.62, inkDark: 0.18, emit: 0.72, sheen: 0.16, sheenR: 2.6 },
    emitter: { dir: [0.12, 1, -0.5], ink: 0.3, inkDark: 0.1, emit: 1, sheen: 0.46, sheenR: 3.6 },
  },
  // the cast must never fall across the copy column, and must die before the canvas ends on the
  // right: the object is parked in the right-hand third. Both are canvas fractions, and
  // --braid-keepout lets the page move the left one per breakpoint.
  shadowKeepOut: 0.46,
  shadowKeepIn: 0.99,
  shadowFadeWidth: 1.4,
  tipTitle: 'Ward',
  tipLine1: 'two signals, one crossing',
  tipLine2: 'second path held',
  // how hard the steerable key reads on the metal: the highlight travelling across the strands
  // is the only proof the viewer gets that the light is where the shadow says it is
  keyGain: 3.2,
  // how much of the environment's azimuth follows the key: 1 = the softbox rides with it
  // 1:1 only. The baked environment is a RING of softboxes, so any gain over 1 rotates the
  // reflection past the key and its bright lobe lands on the flank away from the light,
  // cancelling the specular and rim cues. Magnitude comes from the key terms below instead.
  envFollow: 1,
  rimKey: 1.05,
  keyIntensity: 1,
  fillIntensity: 1.05,
  bounceIntensity: 1,
  stripIntensity: 2,
};

const RIBBONS = CONFIG.ribbonCount;
const ACCENT = new THREE.Color(CONFIG.accent);
const SPARK = new THREE.Color(CONFIG.spark);
const PROTAGONISTS = [CONFIG.protagonistA, CONFIG.protagonistB];

// helical weave: r and y share one phase, so no two ribbons ever occupy the same
// point — crossings read as over/under instead of slicing through each other
function ribbonCurve(i) {
  const pts = [];
  const phi = (i / RIBBONS) * Math.PI * 2;
  const steps = CONFIG.curveSteps;
  // per-strand variance: a manufactured set is never six identical parts
  const R = CONFIG.baseR + (CONFIG.Roffsets[i] ?? 0);
  const A = CONFIG.baseA + (CONFIG.Aoffsets[i] ?? 0);
  const B = CONFIG.baseB + (CONFIG.Boffsets[i] ?? 0);
  const skew = CONFIG.skews[i] ?? 0;
  for (let s = 0; s < steps; s++) {
    const t = (s / steps) * Math.PI * 2;
    const a = CONFIG.helixFactor * t + phi + skew * Math.sin(t);
    const r = R + A * Math.sin(a);
    pts.push(new THREE.Vector3(r * Math.cos(t), B * Math.cos(a), r * Math.sin(t)));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', CONFIG.curveTension);
}

// squircle cross-section, so the ribbon has real volume and a bevelled edge
function sectionPoint(k, halfW, halfT) {
  const a = k * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const e = CONFIG.squirclePower;
  return {
    x: Math.sign(c) * Math.pow(Math.abs(c), e) * halfW,
    y: Math.sign(s) * Math.pow(Math.abs(s), e) * halfT,
  };
}

// solid ribbon swept along the curve; v = 0 is the centre of the outer face,
// where the intent channel runs
function ribbonGeometry(curve, width, steps) {
  const SEG = CONFIG.sectionSegs;
  const frames = curve.computeFrenetFrames(steps, true);
  const pos = [];
  const norm = [];
  const tan = [];
  const uv = [];
  const idx = [];
  const halfW = width / 2;
  const halfT = width * CONFIG.thicknessRatio;
  // exact section normals from the parametric derivative; the analytic guess
  // is only correct for an ellipse and leaves visible facets on a squircle
  const sectionNormals = [];
  const h = 0.0005;
  for (let k = 0; k <= SEG; k++) {
    const kk = k / SEG;
    const a = sectionPoint(kk - h, halfW, halfT);
    const b2 = sectionPoint(kk + h, halfW, halfT);
    let nx = b2.y - a.y;
    let ny = -(b2.x - a.x);
    const l = Math.hypot(nx, ny) || 1;
    sectionNormals.push({ x: nx / l, y: ny / l });
  }
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const p = curve.getPointAt(u % 1);
    const b = frames.binormals[s % steps];
    const n = frames.normals[s % steps];
    const tg = frames.tangents[s % steps];
    for (let k = 0; k <= SEG; k++) {
      const kk = k / SEG;
      const sp = sectionPoint(kk, halfW, halfT);
      const sn = sectionNormals[k];
      pos.push(p.x + b.x * sp.x + n.x * sp.y, p.y + b.y * sp.x + n.y * sp.y, p.z + b.z * sp.x + n.z * sp.y);
      let nx = b.x * sn.x + n.x * sn.y;
      let ny = b.y * sn.x + n.y * sn.y;
      let nz = b.z * sn.x + n.z * sn.y;
      const len = Math.hypot(nx, ny, nz) || 1;
      norm.push(nx / len, ny / len, nz / len);
      tan.push(tg.x, tg.y, tg.z);
      uv.push(u, kk);
    }
    if (s < steps) {
      const row = SEG + 1;
      for (let k = 0; k < SEG; k++) {
        const a = s * row + k;
        const c = a + row;
        idx.push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('aTangent', new THREE.Float32BufferAttribute(tan, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// where two ribbons come closest: the contested crossing
function findCrossing(a, b, samples) {
  const pa = [];
  const pb = [];
  for (let i = 0; i < samples; i++) {
    pa.push(a.getPointAt(i / samples));
    pb.push(b.getPointAt(i / samples));
  }
  let best = Infinity;
  let ua = 0;
  let ub = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const d = pa[i].distanceToSquared(pb[j]);
      if (d < best) { best = d; ua = i / samples; ub = j / samples; }
    }
  }
  const mid = pa[Math.round(ua * samples) % samples].clone().add(pb[Math.round(ub * samples) % samples]).multiplyScalar(0.5);
  return { ua: ua, ub: ub, point: mid };
}

// procedural studio: a dark room with two soft boxes and a warm key, written to an
// equirect canvas. Real reflections that sweep as the object turns are what stop it
// reading as a flat shaded shape.
function studioEnv() {
  const W = 2048;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');

  const floor = x.createLinearGradient(0, 0, 0, H);
  floor.addColorStop(0, '#2b2b34');
  floor.addColorStop(0.42, '#16151c');
  floor.addColorStop(0.55, '#0a0910');
  floor.addColorStop(1, '#050408');
  x.fillStyle = floor;
  x.fillRect(0, 0, W, H);

  const glow = (cx, cy, rx, ry, color, alpha) => {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = alpha;
    x.translate(cx, cy);
    x.scale(rx / ry, 1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, color);
    g.addColorStop(0.45, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, ry, 0, Math.PI * 2);
    x.fill();
    x.restore();
  };

  // rectangular soft boxes with hard edges. Radial glows alone read as CG; real
  // studio metal reflects panels with corners, and those edges are what sell it.
  const softbox = (cx, cy, w, h, color, alpha, feather) => {
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = alpha;
    x.shadowColor = color;
    x.shadowBlur = feather;
    x.fillStyle = color;
    const r = Math.min(w, h) * 0.18;
    x.beginPath();
    x.moveTo(cx - w / 2 + r, cy - h / 2);
    x.arcTo(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2, r);
    x.arcTo(cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2, r);
    x.arcTo(cx - w / 2, cy + h / 2, cx - w / 2, cy - h / 2, r);
    x.arcTo(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, r);
    x.closePath();
    x.fill();
    x.restore();
  };

  const kI = CONFIG.keyIntensity;
  const fI = CONFIG.fillIntensity;
  const bI = CONFIG.bounceIntensity;
  const sI = CONFIG.stripIntensity;

  glow(W * 0.30, H * 0.16, 300, 120, 'rgba(255,252,246,1)', 0.55 * kI);   // key spill
  glow(W * 0.74, H * 0.24, 210, 96, 'rgba(214,224,255,1)', 0.34 * fI);    // cool fill spill
  glow(W * 0.06, H * 0.40, 150, 130, 'rgba(150,120,232,1)', 0.30 * bI);   // amethyst bounce
  glow(W * 0.52, H * 0.62, 380, 90, 'rgba(120,116,140,1)', 0.18);         // horizon band

  softbox(W * 0.30, H * 0.15, 300, 128, 'rgba(255,252,246,1)', 0.92 * kI, 26);  // key panel
  softbox(W * 0.735, H * 0.235, 176, 92, 'rgba(216,226,255,1)', 0.52 * fI, 22); // cool panel
  softbox(W * 0.905, H * 0.50, 74, 210, 'rgba(232,220,192,1)', 0.30 * sI, 18);  // warm strip
  softbox(W * 0.135, H * 0.60, 120, 54, 'rgba(150,120,232,1)', 0.20 * bI, 16);  // amethyst card

  // thin bright strips: hard edges in the reflection give brushed metal its life
  x.globalCompositeOperation = 'lighter';
  x.globalAlpha = 0.38 * kI;
  x.fillStyle = 'rgba(255,255,255,0.85)';
  x.fillRect(0, H * 0.085, W, 3);
  x.globalAlpha = 0.18;
  x.fillRect(0, H * 0.30, W, 2);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const VERT = `
attribute vec3 aTangent;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying vec3 vLocal;
varying vec3 vNormalL;
void main() {
  vUv = uv;
  vLocal = position;
  vNormalL = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vTangentW = normalize(mat3(modelMatrix) * aTangent);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLAIN_VERT = `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = `
uniform float uHead;
uniform float uReserve;
uniform float uWaiting;
uniform float uTime;
uniform float uDir;
uniform float uSeed;
uniform vec4 uOther;
uniform float uR;
uniform float uA;
uniform float uB;
uniform vec3 uAccent;
uniform vec3 uSpark;
uniform float uReveal;
uniform sampler2D uEnv;

uniform float uRoughBase;
uniform float uRoughMottle;
uniform float uAnisoX;
uniform float uAnisoY;
uniform float uBrushStr;
uniform float uMottleStr;
uniform float uBrushSU;
uniform float uBrushSV;
uniform float uMottleSU;
uniform float uMottleSV;
uniform float uAoInward;
uniform float uAoHeight;
uniform float uAoNeighbor;
uniform float uThrough;
uniform float uEnvAmethyst;
uniform float uRimBloom;
uniform float uSweepSpeed;
uniform float uSweepWidth;
uniform float uSweepAmp;
uniform float uBreatheAmp;
uniform float uBreatheSpeed;
uniform vec3 uKeyDir;
uniform float uKeyGain;
uniform float uEnvSpin;
uniform float uRimKey;
uniform vec3 uMetalF0;
uniform vec3 uBodyBase;
uniform vec3 uAmethyst;

uniform float uSmokeAmount;
uniform vec3 uSmokeColor;
uniform float uSmokeDensity;
uniform float uSmokeSU;
uniform float uSmokeSV;
uniform float uSmokeSpeed;
uniform float uSmokeWarp;
uniform float uSmokeContrast;
uniform float uSmokeParallax;
uniform float uSmokeGlass;

uniform float uFlatAmount;
uniform float uFlatBands;
uniform vec3 uFlatColor;
uniform vec3 uInkColor;
uniform float uEdgeWidth;
uniform float uEdgeStrength;

uniform float uAfterglow;
uniform float uAfterglowLen;
uniform vec3 uAfterglowColor;
uniform float uAfterglowSpread;
uniform float uAfterglowSoft;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vTangentW;
varying vec3 vViewDir;
varying vec3 vLocal;
varying vec3 vNormalL;

float band(float d, float w) { return smoothstep(w, 0.0, abs(d)); }
float wrap(float d) { return d - floor(d + 0.5); }
float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// the environment is a baked softbox, and it is what actually paints brushed metal. Spinning
// its azimuth with the key light is what makes a moving light visible on the object: the
// reflection travels across the strands instead of sitting still while the shadow swings.
vec2 equirect(vec3 d) {
  return vec2(atan(d.z, d.x) * 0.1591549 + 0.5 + uEnvSpin, acos(clamp(d.y, -1.0, 1.0)) * 0.3183099);
}
vec3 sampleEnv(vec3 d, float lod) {
  return texture2D(uEnv, equirect(normalize(d)), lod).rgb;
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.55;
  }
  return v;
}

void main() {
  float d = wrap(vUv.x - uHead);
  float acrossC = min(vUv.y, 1.0 - vUv.y);
  float channel = smoothstep(0.13, 0.03, acrossC);

  float core = band(d, 0.010) * channel;
  float halo = band(d, 0.048) * channel * 0.34;
  float reserve = smoothstep(0.0, 0.012, d) * (1.0 - smoothstep(0.0, uReserve, d)) * channel * 0.42;
  float trail = smoothstep(0.20, 0.0, -d) * step(d, 0.0) * channel * 0.20;

  vec3 n = normalize(vNormalW);
  vec3 T = normalize(vTangentW);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uKeyDir);
  vec3 L2 = normalize(vec3(-0.72, 0.24, -0.52));

  // micro-texture: brushing along the length, finer mottle across it. Screen-derivative
  // filtered — unfiltered high-frequency noise reads as sparkle, not finish
  vec2 bUv = vec2(vUv.x * uBrushSU, vUv.y * uBrushSV);
  vec2 mUv = vec2(vUv.x * uMottleSU, vUv.y * uMottleSV);
  float bFade = 1.0 - smoothstep(0.35, 1.0, max(fwidth(bUv.x), fwidth(bUv.y)));
  float mFade = 1.0 - smoothstep(0.35, 1.0, max(fwidth(mUv.x), fwidth(mUv.y)));
  float brush = mix(0.5, vnoise(bUv), bFade);
  float mottle = mix(0.5, vnoise(mUv), mFade);
  vec3 bitan = normalize(cross(T, n));
  n = normalize(n + bitan * (brush - 0.5) * uBrushStr + T * (mottle - 0.5) * uMottleStr);

  // brushed metal: anisotropic GGX, no diffuse term — metals have none
  vec3 bitanB = normalize(cross(n, T));
  float rough = uRoughBase + uRoughMottle * mottle;
  float ax = max(0.004, rough * rough * uAnisoX);
  float ay = max(0.004, rough * rough * uAnisoY);

  vec3 F0 = uMetalF0;

  vec3 spec = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec3 Ld = (i == 0) ? L : L2;
    vec3 Lc = (i == 0) ? vec3(1.00, 0.94, 0.84) : vec3(0.52, 0.50, 0.72);
    float amp = (i == 0) ? uKeyGain : 0.55;
    vec3 H = normalize(Ld + V);
    float nl = max(dot(n, Ld), 0.0);
    float nv = max(dot(n, V), 1e-4);
    float nh = max(dot(n, H), 0.0);
    float vh = max(dot(V, H), 1e-4);
    float th = dot(T, H);
    float bh = dot(bitanB, H);
    float dd = th * th / (ax * ax) + bh * bh / (ay * ay) + nh * nh;
    float D = 1.0 / (3.14159 * ax * ay * dd * dd);
    float k = rough * 0.5;
    float G = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - vh, 5.0);
    spec += Lc * amp * D * G * F * nl / (4.0 * nv + 1e-4);
  }

  float fres = pow(1.0 - max(dot(n, V), 0.0), 5.0);

  // real studio environment, sampled twice: a sharp mirror term and a brushed
  // term whose reflection is stretched along the ribbon, the way milled metal streaks
  vec3 R = reflect(-V, n);
  vec3 Raniso = normalize(R - T * dot(R, T) * 0.88);
  vec3 envSharp = sampleEnv(R, rough * 1.6);
  vec3 envStreak = sampleEnv(Raniso, 0.8 + rough * 1.6);
  vec3 env = mix(envSharp, envStreak, 0.30);
  // amethyst sits in the grazing angles, never in the highlights
  env += uAmethyst * pow(1.0 - abs(R.y), 3.0) * uEnvAmethyst;

  // the strands shade each other. The weave is analytic, so each neighbour's position at
  // this angle is solvable — real contact occlusion without a screen-space pass.
  vec3 radial = normalize(vec3(vLocal.x, 0.0, vLocal.z));
  float inward = clamp(-dot(radial, normalize(vNormalL)), 0.0, 1.0);
  float ao = 1.0 - uAoInward * inward - uAoHeight * (1.0 - smoothstep(0.0, 0.22, abs(vLocal.y)));

  float ang = atan(vLocal.z, vLocal.x);
  vec2 me = vec2(length(vLocal.xz), vLocal.y);
  float occ = 0.0;
  for (int j = 0; j < 4; j++) {
    float a2 = 3.0 * ang + uOther[j];
    vec2 other = vec2(uR + uA * sin(a2), uB * cos(a2));
    float above = smoothstep(-0.02, 0.10, other.y - me.y);
    occ += smoothstep(0.26, 0.05, distance(me, other)) * above;
  }
  ao *= 1.0 - uAoNeighbor * clamp(occ, 0.0, 1.0);
  ao = clamp(ao, 0.22, 1.0);

  // metal: the environment IS the surface colour, tinted by F0 and gated by Fresnel
  vec3 Fenv = F0 + (1.0 - F0) * fres;
  vec3 body = uBodyBase;
  body += env * Fenv * (1.10 + 1.5 * fres) * ao;
  body += spec * ao;
  // faint amethyst bloom on the grazing rim
  body += uAmethyst * fres * uRimBloom;
  body *= 0.95 + 0.10 * mottle;
  body *= 0.72 + 0.28 * smoothstep(0.0, 0.42, 1.0 - acrossC * 2.0);

  // light carried through the thin section, tinted amethyst
  float through = pow(max(dot(-n, L), 0.0), 2.2) + pow(max(dot(-n, L2), 0.0), 2.2) * 0.6;
  body += uAmethyst * through * uThrough;

  // a specular sweep travelling the ribbon, alternating direction per strand
  float sweepPos = fract(uTime * uSweepSpeed * uDir + uSeed);
  float sd = abs(wrap(vUv.x - sweepPos));
  float sweep = smoothstep(uSweepWidth, 0.0, sd);
  body += vec3(0.72, 0.70, 0.86) * pow(sweep, 2.0) * uSweepAmp;

  // slow breathing on the environment term, so idle never reads as frozen
  body *= 0.96 + uBreatheAmp * sin(uTime * uBreatheSpeed + uSeed * 6.28);

  // smoke trapped in the ribbon: domain-warped fbm advected along the strand, sampled
  // twice with a view-dependent (tangent-space) offset so the two layers slide against
  // each other as the camera moves — that parallax is what sells "inside" over "painted on"
  vec3 bitS = normalize(cross(T, normalize(vNormalW)));
  vec2 vpar = vec2(dot(V, T), dot(V, bitS)) * uSmokeParallax;
  vec2 sp = vec2(vUv.x * uSmokeSU, vUv.y * uSmokeSV);
  float st = uTime * uSmokeSpeed;
  vec2 q = vec2(fbm(sp + vec2(st * 0.7, 0.0)), fbm(sp + vec2(0.0, st * 0.4) + 5.2));
  float smokeA = fbm(sp + uSmokeWarp * q + vpar + vec2(st * uDir * 0.5, st * 0.18));
  float smokeB = fbm(sp * 1.7 - uSmokeWarp * q.yx - vpar * 2.2 + vec2(-st * uDir * 0.33, st * 0.12) + 11.3);
  float smk = pow(clamp((smokeA * 0.65 + smokeB * 0.35) * 1.15, 0.0, 1.0), uSmokeContrast);
  vec3 smokeBody = uBodyBase * 1.5
    + uSmokeColor * smk * uSmokeDensity * (0.35 + 0.65 * ao)
    + uAmethyst * fres * (uRimBloom + 0.08)
    + env * Fenv * uSmokeGlass * (0.6 + 1.2 * fres);
  smokeBody *= 0.96 + uBreatheAmp * sin(uTime * uBreatheSpeed + uSeed * 6.28);
  body = mix(body, smokeBody, uSmokeAmount);

  // flat "2D print" style: banded lambert over a solid fill, ink at the silhouette —
  // kills the photoreal cues (env continuity, specular) that make shading read as 3D.
  // Uses the unperturbed normal so bands and ink stay clean, not noisy.
  vec3 n0 = normalize(vNormalW);
  float lam = dot(n0, L) * 0.5 + 0.5;
  float bands = max(uFlatBands, 2.0);
  float banded = min(mix(lam, floor(lam * bands) / (bands - 1.0), 0.55), 1.0);
  vec3 flatBody = uFlatColor * (0.5 + 0.5 * banded);
  flatBody *= 0.72 + 0.28 * ao;
  flatBody = mix(flatBody, flatBody * (0.45 + 0.9 * smk), uSmokeAmount);
  float edge = 1.0 - smoothstep(uEdgeWidth * 0.35, uEdgeWidth, dot(n0, V));
  flatBody = mix(flatBody, uInkColor, edge * uEdgeStrength);
  body = mix(body, flatBody, uFlatAmount);

  vec3 sig = uAccent * (core * 2.6 + halo + reserve) + uSpark * trail;
  sig += uSpark * core * uWaiting * 1.4;

  // lasting afterglow: the head's position is analytic, so "how long ago it passed
  // here" is just distance-behind-the-head. Exponential decay over that distance gives
  // a persistent wake that relights the black body only where the spark has traveled.
  // Normalized so the tail hits zero exactly one lap behind (no wrap seam), and ramped
  // in over uAfterglowSoft behind the head (no hard leading edge travelling the strand).
  float behind = fract(uHead - vUv.x);
  float glowLen = max(uAfterglowLen, 0.001);
  float tailFloor = exp(-1.0 / glowLen);
  float wake = (exp(-behind / glowLen) - tailFloor) / (1.0 - tailFloor);
  wake *= smoothstep(0.0, max(uAfterglowSoft, 0.0001), behind);
  float spreadMask = mix(channel, 1.0, uAfterglowSpread);
  sig += uAfterglowColor * wake * uAfterglow * spreadMask * (0.45 + 0.55 * ao);

  // silhouette edge nearest the light: cheap, and it reads instantly as "lit from over there"
  float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0) * (dot(n, L) * 0.5 + 0.5);
  body += vec3(1.0, 0.93, 0.82) * rim * uRimKey;

  vec3 col = body + sig * uReveal;

  // filmic shoulder, so highlights roll off instead of clipping
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  gl_FragColor = vec4(col, 1.0);
}`;

const WARD_FRAG = `
uniform float uTime;
uniform float uActive;
uniform vec3 uFlarePos;
uniform vec3 uAccent;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vWorldPos;
void main() {
  float fres = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 5.0);
  float dist = distance(vWorldPos, uFlarePos);
  float local = smoothstep(2.0, 0.35, dist);
  float wave = sin(dist * 9.0 - uTime * 2.6) * 0.5 + 0.5;
  float shell = fres * (0.014 + uActive * local * (0.30 + 0.55 * wave));
  gl_FragColor = vec4(uAccent * shell, shell * 0.85);
}`;

const RING_FRAG = `
uniform float uActive;
uniform float uPing;
uniform float uTime;
uniform vec3 uAccent;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float core = smoothstep(0.055, 0.0, abs(r - 0.30)) * uActive;
  float dot0 = smoothstep(0.10, 0.0, r) * uActive * 0.9;
  // outward ping
  float pr = mix(0.30, 1.0, uPing);
  float ping = smoothstep(0.05, 0.0, abs(r - pr)) * (1.0 - uPing) * 0.9;
  float a = core + dot0 + ping;
  gl_FragColor = vec4(uAccent, a * 0.9);
}`;

class WardedBraid extends HTMLElement {
  connectedCallback() {
    if (this._started) return;
    this._started = true;
    this.style.display = 'block';
    this.style.position = this.style.position || 'relative';
    if (!this.style.height) this.style.height = '100%';
    // the build below costs seconds of main-thread time on a throttled mobile CPU
    // (geometry sweep + env canvas + crossing search); yield so the page paints and
    // becomes interactive first, then assemble the braid when the thread is idle
    const boot = () => { if (this.isConnected) this._boot(); };
    if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 800 });
    else setTimeout(boot, 40);
  }

  _boot() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const w = this.clientWidth || 720;
    const h = this.clientHeight || 460;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    // supersample: render above CSS resolution and let the browser downsample. Narrow
    // diagonal silhouettes like these are the worst case for plain MSAA.
    const pixelRatio = () => Math.min(Math.max(1, window.devicePixelRatio || 1) * 1.5, 2.5);
    renderer.shadowMap.enabled = true;
    // VSM is the only filter in three that reads shadow.radius, and it works with a directional
    // light: a soft-edged cast is the whole difference between grounded and pasted-on
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;'
      + 'mask-image:radial-gradient(60% 56% at 52% 44%, #000 20%, rgba(0,0,0,0.6) 54%, rgba(0,0,0,0.16) 78%, transparent 95%);'
      + '-webkit-mask-image:radial-gradient(60% 56% at 52% 44%, #000 20%, rgba(0,0,0,0.6) 54%, rgba(0,0,0,0.16) 78%, transparent 95%)';
    this.appendChild(renderer.domElement);

    // annotation overlay: leader line + label for what the ward caught
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:visible';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'position:absolute;inset:0;overflow:visible;color:var(--cv-text-secondary, #8a8a92)';
    const leader = document.createElementNS(svgNS, 'path');
    leader.setAttribute('fill', 'none');
    leader.setAttribute('stroke', 'currentColor');
    leader.setAttribute('stroke-width', '1');
    leader.setAttribute('stroke-opacity', '0.5');
    leader.setAttribute('stroke-dasharray', '260');
    leader.setAttribute('stroke-dashoffset', '260');
    leader.style.transition = 'stroke-dashoffset 520ms cubic-bezier(0.2,0,0,1), opacity 320ms linear';
    leader.style.opacity = '0';
    svg.appendChild(leader);
    const tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;transform:translateY(-50%);opacity:0;transition:opacity 380ms cubic-bezier(0.2,0,0,1),transform 380ms cubic-bezier(0.2,0,0,1);font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap;padding:9px 12px;border-radius:9px;background:var(--cv-bg-raised, #16161a);border:1px solid var(--cv-border-hairline, rgba(255,255,255,0.12));box-shadow:0 8px 26px rgba(0,0,0,0.22)';
    tip.innerHTML = '<div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--cv-accent);margin-bottom:5px">' + CONFIG.tipTitle + '</div>'
      + '<div style="font-size:11.5px;color:var(--cv-text-primary)">' + CONFIG.tipLine1 + '</div>'
      + '<div style="font-size:10.5px;color:var(--cv-text-muted);margin-top:3px">' + CONFIG.tipLine2 + '</div>';
    overlay.appendChild(svg);
    overlay.appendChild(tip);
    if (!CONFIG.showAnnotation) overlay.style.display = 'none';
    this.appendChild(overlay);

    const scene = new THREE.Scene();
    // the canvas is deliberately much larger than the object's cell so its edges are
    // nowhere near the silhouette; frame against that reference height, not the canvas,
    // or the object grows with the bleed
    const FRAME_H = CONFIG.frameH;
    // "2D projection": dolly-zoom toward orthographic — narrow the FOV while pulling the
    // camera back along its ray so the framed size stays constant and parallax collapses
    const EFF_FOV = THREE.MathUtils.lerp(CONFIG.cameraFov, 4, CONFIG.orthoAmount);
    const D_SCALE = Math.tan(THREE.MathUtils.degToRad(CONFIG.cameraFov) / 2)
      / Math.tan(THREE.MathUtils.degToRad(EFF_FOV) / 2);
    const camBase = new THREE.Vector3(0, CONFIG.cameraY, CONFIG.cameraDist).multiplyScalar(D_SCALE);
    const camera = new THREE.PerspectiveCamera(EFF_FOV, w / h, 0.1, Math.max(120, CONFIG.cameraDist * D_SCALE * 3));
    const frame = () => {
      const ch2 = this.clientHeight || h;
      const k = Math.max(1, ch2 / FRAME_H);
      camera.position.copy(camBase).multiplyScalar(k);
      camera.lookAt(0, -0.16 * k, 0);
      camera.clearViewOffset();
    };
    frame();

    const group = new THREE.Group();
    group.name = 'wardedBraid';
    // flattenAmount squashes the braid's local height (pre-rotation) toward a plane
    const FLAT_Y = THREE.MathUtils.lerp(1, 0.06, CONFIG.flattenAmount);
    group.scale.set(CONFIG.groupScale, CONFIG.groupScale * FLAT_Y, CONFIG.groupScale);
    group.position.y = CONFIG.groupY;
    scene.add(group);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(CONFIG.shadowMapSize, CONFIG.shadowMapSize);
    const shadowCam = sun.shadow.camera;
    shadowCam.left = -CONFIG.shadowFrame;
    shadowCam.right = CONFIG.shadowFrame;
    shadowCam.top = CONFIG.shadowFrame;
    shadowCam.bottom = -CONFIG.shadowFrame;
    shadowCam.near = 0.5;
    shadowCam.far = CONFIG.sunHeight + 8;
    shadowCam.updateProjectionMatrix();
    sun.shadow.bias = CONFIG.shadowBias;
    sun.shadow.normalBias = CONFIG.shadowNormalBias;
    // VSM is the only filter in three that reads shadow.radius, and a soft-edged cast is the
    // whole difference between grounded and pasted on
    sun.shadow.radius = CONFIG.shadowBlur;
    sun.shadow.blurSamples = CONFIG.shadowBlurSamples;
    scene.add(sun);
    scene.add(sun.target);

    // the ribbons' key light IS this light: same vector, so the highlight that travels across
    // the strands and the cast on the floor can only ever agree
    const keyDir = new THREE.Vector3(0.55, 0.8, 0.42).normalize();
    // the baked softbox sits at this azimuth, so spin is measured from there
    const ENV_BASE_AZIMUTH = Math.atan2(0.42, 0.55);
    const envSpin = { value: 0 };
    const floorUniforms = {
      uGround: { value: new THREE.Vector3() },
      uFadeX: { value: -1e6 },
      uFadeX2: { value: 1e6 },
      uFadeW: { value: CONFIG.shadowFadeWidth },
      uReach: { value: CONFIG.shadowReach },
      uReachW: { value: CONFIG.shadowReachFade },
      uSheen: { value: 0 },
      uSheenR: { value: 3 },
      uCast: { value: 0 },
      uEmitColor: { value: new THREE.Color(CONFIG.emitColor) },
    };

    // one falloff, shared by every pass: radial around the point under the object, plus a hard
    // promise on either side in screen space so nothing lands on the copy or the canvas edge
    const FLOOR_FALLOFF = [
      'uniform vec3 uGround;',
      'uniform float uFadeX, uFadeX2, uFadeW, uReach, uReachW, uSheen, uSheenR, uCast;',
      'float omKeep(vec3 p) {',
      '  float l = smoothstep(uFadeX, uFadeX + uFadeW, p.x);',
      '  float r = 1.0 - smoothstep(uFadeX2 - uFadeW, uFadeX2, p.x);',
      '  return l * r;',
      '}',
      'float omReach(vec3 p) {',
      '  return smoothstep(uReach + uReachW, uReach, length(p - uGround));',
      '}',
    ].join('\n');

    const sheenMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: floorUniforms,
      vertexShader: 'varying vec3 vWorld; void main(){ vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vWorld;\nuniform vec3 uEmitColor;\n' + FLOOR_FALLOFF + '\n' + [
        'void main() {',
        '  float d = length(vWorld - uGround);',
        '  float lit = smoothstep(uSheenR, 0.2, d);',
        '  gl_FragColor = vec4(uEmitColor, clamp(lit * uSheen * omKeep(vWorld), 0.0, 1.0));',
        '}',
      ].join('\n'),
    });

    // Both cast passes are ShadowMaterial underneath, so they read the same shadow map three
    // already renders. The patch lands just before each shader's final brace, which keeps it
    // independent of three's include list: ink keeps the built-in "dark where occluded", emit
    // throws the complement, additively, so the weave's gaps become light on the floor.
    const castMat = (emit) => {
      const m = new THREE.ShadowMaterial({ color: emit ? 0xffffff : 0x05040a, opacity: 1 });
      m.depthWrite = false;
      if (emit) m.blending = THREE.AdditiveBlending;
      m.onBeforeCompile = (shader) => {
        const tail = (src, add) => src.slice(0, src.lastIndexOf('}')) + add + '\n}';
        shader.vertexShader = tail(
          'varying vec3 vWorld;\n' + shader.vertexShader,
          '  vWorld = (modelMatrix * vec4( transformed, 1.0 )).xyz;'
        );
        shader.fragmentShader = tail(
          'varying vec3 vWorld;\nuniform vec3 uEmitColor;\n' + FLOOR_FALLOFF + '\n' + shader.fragmentShader,
          emit
            ? '  gl_FragColor = vec4( uEmitColor, uCast * getShadowMask() * omKeep( vWorld ) * omReach( vWorld ) );'
            : '  gl_FragColor.a = uCast * ( 1.0 - getShadowMask() ) * omKeep( vWorld ) * omReach( vWorld );'
        );
        Object.keys(floorUniforms).forEach((k) => { shader.uniforms[k] = floorUniforms[k]; });
        shader.uniforms.uCast = emit ? emitUniform : inkUniform;
      };
      return m;
    };
    const inkUniform = { value: 0 };
    const emitUniform = { value: 0 };
    const inkMat = castMat(false);
    const emitMat = castMat(true);

    // segmented so the far-reaching plane clips cleanly where it passes the camera
    const floorGeo = new THREE.PlaneGeometry(CONFIG.shadowSize, CONFIG.shadowSize, 24, 24);
    const floorAt = (mat, name, nudge, order) => {
      const m = new THREE.Mesh(floorGeo, mat);
      m.name = name;
      m.receiveShadow = true;
      m.rotation.x = -Math.PI / 2;
      m.position.y = CONFIG.shadowY + nudge;
      m.renderOrder = order;
      scene.add(m);
      return m;
    };
    const spot = floorAt(sheenMat, 'floorSheen', -0.006, -3);
    const emitPass = floorAt(emitMat, 'lightCast', -0.003, -2);
    const shadow = floorAt(inkMat, 'inkCast', 0, -1);
    const receivers = [spot, emitPass, shadow];
    if (!CONFIG.showFloor) {
      receivers.forEach((m) => { m.visible = false; });
      // no receivers means no reason to render a shadow map at all
      sun.castShadow = false;
    }

    // data-look picks the setup, and the page can change it live
    let look = CONFIG.looks[CONFIG.defaultLook];
    const lookDir = new THREE.Vector3();
    let cursorLight = true;
    let powered = false;
    const readLook = () => {
      const name = this.getAttribute('data-look');
      look = CONFIG.looks[name] || CONFIG.looks[CONFIG.defaultLook];
      lookDir.fromArray(look.dir).normalize();
      floorUniforms.uSheenR.value = look.sheenR;
      cursorLight = this.getAttribute('data-cursor') !== 'off';
      powered = this.getAttribute('data-power') === 'on';
    };
    const onLook = () => { readLook(); if (this._syncTheme) this._syncTheme(); };
    readLook();
    this._lookObs = new MutationObserver(onLook);
    this._lookObs.observe(this, { attributes: true, attributeFilter: ['data-look', 'data-cursor', 'data-power'] });

    // handle for tuning the light and the floor from the console
    this._floor = { uniforms: floorUniforms, ink: inkUniform, emit: emitUniform, shadow, spot, emitPass, light: sun, scene, camera };

    let inkBase = 0;
    let emitBase = 0;
    const syncTheme = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      // a dark page has nothing for ink to darken, so the emit pass carries it there and the
      // ink drops to a whisper of weight; a light page is the other way round
      inkBase = dark ? look.inkDark : look.ink;
      emitBase = dark ? look.emit : look.emit * 0.08;
      floorUniforms.uSheen.value = dark ? look.sheen : look.sheen * 0.16;
    };
    syncTheme();
    this._syncTheme = syncTheme;
    this._themeObs = new MutationObserver(syncTheme);
    this._themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const curves = [];
    const uniformsList = [];
    const envTex = studioEnv();
    const F0 = new THREE.Color(CONFIG.metalF0);
    const BODY = new THREE.Color(CONFIG.bodyBase);
    const AMETHYST = new THREE.Color(CONFIG.amethyst);
    for (let i = 0; i < RIBBONS; i++) {
      const curve = ribbonCurve(i);
      curves.push(curve);
      const uniforms = {
        uHead: { value: i / RIBBONS },
        uReserve: { value: 0.10 },
        uWaiting: { value: 0 },
        uTime: { value: 0 },
        uDir: { value: i % 2 === 0 ? 1 : -1 },
        uSeed: { value: i * 0.37 },
        uOther: { value: new THREE.Vector4(
          ((i + 1) % RIBBONS / RIBBONS) * Math.PI * 2,
          ((i + 2) % RIBBONS / RIBBONS) * Math.PI * 2,
          ((i + 3) % RIBBONS / RIBBONS) * Math.PI * 2,
          ((i + 4) % RIBBONS / RIBBONS) * Math.PI * 2
        ) },
        uR: { value: CONFIG.baseR },
        uA: { value: CONFIG.baseA },
        uB: { value: CONFIG.baseB },
        uAccent: { value: ACCENT },
        uSpark: { value: SPARK },
        uReveal: { value: 0 },
        uEnv: { value: envTex },
        uRoughBase: { value: CONFIG.roughnessBase },
        uRoughMottle: { value: CONFIG.roughnessMottle },
        uAnisoX: { value: CONFIG.anisoX },
        uAnisoY: { value: CONFIG.anisoY },
        uBrushStr: { value: CONFIG.brushStrength },
        uMottleStr: { value: CONFIG.mottleStrength },
        uBrushSU: { value: CONFIG.brushScaleU },
        uBrushSV: { value: CONFIG.brushScaleV },
        uMottleSU: { value: CONFIG.mottleScaleU },
        uMottleSV: { value: CONFIG.mottleScaleV },
        uAoInward: { value: CONFIG.aoInward },
        uAoHeight: { value: CONFIG.aoHeight },
        uAoNeighbor: { value: CONFIG.aoNeighbor },
        uThrough: { value: CONFIG.throughStrength },
        uEnvAmethyst: { value: CONFIG.envAmethyst },
        uRimBloom: { value: CONFIG.rimBloom },
        uSweepSpeed: { value: CONFIG.sweepSpeed },
        uSweepWidth: { value: CONFIG.sweepWidth },
        uSweepAmp: { value: CONFIG.sweepAmp },
        uBreatheAmp: { value: CONFIG.breatheAmp },
        uBreatheSpeed: { value: CONFIG.breatheSpeed },
        uKeyDir: { value: keyDir },
        uKeyGain: { value: CONFIG.keyGain },
        uEnvSpin: envSpin,
        uRimKey: { value: CONFIG.rimKey },
        uMetalF0: { value: F0 },
        uBodyBase: { value: BODY },
        uAmethyst: { value: AMETHYST },
        uSmokeAmount: { value: CONFIG.smokeAmount },
        uSmokeColor: { value: new THREE.Color(CONFIG.smokeColor) },
        uSmokeDensity: { value: CONFIG.smokeDensity },
        uSmokeSU: { value: CONFIG.smokeScaleU },
        uSmokeSV: { value: CONFIG.smokeScaleV },
        uSmokeSpeed: { value: CONFIG.smokeSpeed },
        uSmokeWarp: { value: CONFIG.smokeWarp },
        uSmokeContrast: { value: CONFIG.smokeContrast },
        uSmokeParallax: { value: CONFIG.smokeParallax },
        uSmokeGlass: { value: CONFIG.smokeGlass },
        uFlatAmount: { value: CONFIG.flatAmount },
        uFlatBands: { value: CONFIG.flatBands },
        uFlatColor: { value: new THREE.Color(CONFIG.flatColor) },
        uInkColor: { value: new THREE.Color(CONFIG.inkColor) },
        uEdgeWidth: { value: CONFIG.edgeWidth },
        uEdgeStrength: { value: CONFIG.edgeStrength },
        uAfterglow: { value: CONFIG.afterglowAmount },
        uAfterglowLen: { value: CONFIG.afterglowLength },
        uAfterglowColor: { value: new THREE.Color(CONFIG.afterglowColor) },
        uAfterglowSpread: { value: CONFIG.afterglowSpread },
        uAfterglowSoft: { value: CONFIG.afterglowSoft },
      };
      uniformsList.push(uniforms);
      const mesh = new THREE.Mesh(
        ribbonGeometry(curve, CONFIG.width, CONFIG.geoSteps),
        new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms })
      );
      mesh.name = 'ribbon' + i;
      mesh.castShadow = true;
      group.add(mesh);
    }

    const cross = findCrossing(curves[PROTAGONISTS[0]], curves[PROTAGONISTS[1]], CONFIG.crossingSamples);
    const flarePos = cross.point.clone().multiplyScalar(0.98);

    const wardUniforms = {
      uTime: { value: 0 },
      uActive: { value: 0 },
      uFlarePos: { value: new THREE.Vector3() },
      uAccent: { value: ACCENT },
    };
    const ward = new THREE.Mesh(
      new THREE.SphereGeometry(CONFIG.wardRadius, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: PLAIN_VERT,
        fragmentShader: WARD_FRAG,
        uniforms: wardUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ward.name = 'ward';
    ward.visible = CONFIG.showWard;
    group.add(ward);

    const ringUniforms = { uActive: { value: 0 }, uPing: { value: 0 }, uTime: { value: 0 }, uAccent: { value: ACCENT } };
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.ringSize, CONFIG.ringSize),
      new THREE.ShaderMaterial({
        vertexShader: PLAIN_VERT,
        fragmentShader: RING_FRAG,
        uniforms: ringUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.name = 'contestedRegion';
    ring.visible = CONFIG.showWard;
    ring.position.copy(cross.point);
    ring.renderOrder = 3;
    group.add(ring);

    let pointer = { x: 0, y: 0 };
    const onMove = (e) => {
      const r = this.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // --braid-keepout lets the page move the edge per breakpoint: on phones the copy sits
    // below the band, so there is nothing to keep the shadow off and the value goes to 0
    let keepOut = CONFIG.shadowKeepOut;
    const readKeepOut = () => {
      const raw = parseFloat(getComputedStyle(this).getPropertyValue('--braid-keepout'));
      keepOut = Number.isFinite(raw) ? raw : CONFIG.shadowKeepOut;
    };
    readKeepOut();

    const resize = () => {
      readKeepOut();
      const cw = this.clientWidth || w;
      const ch = this.clientHeight || h;
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(cw, ch);
      camera.aspect = cw / ch;
      frame();
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(this);
    }

    const isVisible = () => {
      const r = this.getBoundingClientRect();
      return r.bottom > -200 && r.top < (window.innerHeight || 800) + 200 && r.width > 0;
    };

    const speeds = CONFIG.speeds;
    const heads = uniformsList.map((u) => u.uHead.value);
    const wrapTo = (v) => v - Math.floor(v);
    const shortest = (from, to) => {
      const d = to - from;
      return d - Math.round(d);
    };

    const t0 = performance.now();
    let last = t0;
    let reveal = 0;
    const worldFlare = new THREE.Vector3();
    const ringLift = new THREE.Vector3();
    const invGroup = new THREE.Quaternion();
    let spinRate = CONFIG.rotYSpeed;
    let spinAngle = 0;
    let seat = 0;
    let lastPub = 0;
    let swayNow = 0;
    let tiltNow = 0;
    const fadeA = new THREE.Vector3();
    const fadeB = new THREE.Vector3();
    const _seatRest = new THREE.Vector3();
    const _seatDir = new THREE.Vector3();

    const tick = () => {
      if (!isVisible()) { last = performance.now(); return; }
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - t0) / 1000;
      const loop = t % CONFIG.loopDuration;

      // approach window: both reserve the crossing · hold window: the ward holds B · then both continue
      const approach = THREE.MathUtils.smoothstep(loop, CONFIG.approachStart, CONFIG.approachEnd);
      const holding = THREE.MathUtils.smoothstep(loop, CONFIG.holdStart, CONFIG.holdPeak) * (1 - THREE.MathUtils.smoothstep(loop, CONFIG.holdEnd, CONFIG.holdFade));
      const pressure = Math.max(approach * (1 - THREE.MathUtils.smoothstep(loop, 9.0, 10.2)), holding);
      reveal += (1 - reveal) * CONFIG.revealRate;

      const targets = {};
      targets[PROTAGONISTS[0]] = cross.ua;
      targets[PROTAGONISTS[1]] = wrapTo(cross.ub - 0.075);

      uniformsList.forEach((u, i) => {
        const isA = i === PROTAGONISTS[0];
        const isB = i === PROTAGONISTS[1];
        const held = isB ? holding : 0;
        heads[i] = wrapTo(heads[i] + dt * (speeds[i] ?? 0.05) * (1 - held * 0.98));
        if ((isA || isB) && targets[i] !== undefined) {
          const pull = (isA ? approach * (1 - THREE.MathUtils.smoothstep(loop, 6.6, 7.4)) : Math.max(approach, holding)) * 0.9;
          if (pull > 0.001) heads[i] = wrapTo(heads[i] + shortest(heads[i], targets[i]) * Math.min(1, dt * 2.6 * pull));
        }
        u.uHead.value = heads[i];
        u.uTime.value = t;
        u.uReveal.value = reveal;
        u.uReserve.value = isA || isB ? 0.10 + 0.10 * pressure : 0.09;
        u.uWaiting.value = isB ? holding : 0;
      });

      wardUniforms.uTime.value = t;
      wardUniforms.uActive.value = pressure;
      ringUniforms.uTime.value = t;
      ringUniforms.uActive.value = holding;
      ringUniforms.uPing.value = THREE.MathUtils.clamp((loop - 6.35) / 0.85, 0, 1);

      // integrate the angle instead of deriving it from t, so the spin can accelerate
      const spinTarget = powered ? CONFIG.poweredSpin : CONFIG.rotYSpeed;
      const rate = powered ? CONFIG.spinUpRate : CONFIG.spinDownRate;
      spinRate += (spinTarget - spinRate) * Math.min(1, dt * rate);
      spinAngle += spinRate * dt;
      group.rotation.y = spinAngle + pointer.x * CONFIG.pointerSensX;
      seat += ((powered ? 1 : 0) - seat) * Math.min(1, dt / CONFIG.seatTime);
      group.rotation.x = CONFIG.rotXBase + pointer.y * CONFIG.pointerSensY + Math.sin(t * 0.18) * 0.02;
      const lift = Math.sin(t * CONFIG.liftSpeed) * CONFIG.liftAmp * (1 - seat);
      const restY = CONFIG.groupY + lift;
      // smoothstep so it eases out of the approach and settles rather than arriving at speed
      const settle = seat * seat * (3 - 2 * seat);
      const tighten = 1 + (CONFIG.seatTightenXZ - 1) * settle;
      const squash = 1 + (CONFIG.seatSquashY - 1) * settle;
      group.scale.set(
        CONFIG.groupScale * tighten,
        CONFIG.groupScale * FLAT_Y * squash,
        CONFIG.groupScale * tighten
      );
      // the canvas spans the whole hero; park the object in the right-hand third so the
      // copy column stays clear
      const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.length();
      const restX = visH * camera.aspect * CONFIG.objectXFrac;
      // recede along the view ray, not world -Z: the camera looks slightly down, so a straight
      // -Z push would walk the projected centre up toward the vanishing point and out of the seat
      _seatRest.set(restX, restY, 0);
      _seatDir.copy(_seatRest).sub(camera.position).normalize().multiplyScalar(CONFIG.seatPush * settle);
      group.position.set(_seatRest.x + _seatDir.x, _seatRest.y + _seatDir.y, _seatDir.z);
      for (let r = 0; r < receivers.length; r++) receivers[r].position.x = restX;
      // The light hangs over the stage and the cursor steers it: sway swings it across, tilt
      // rakes it toward the viewer. Damped, so a flick of the mouse pushes the cast rather than
      // teleporting it.
      const swayTo = cursorLight ? pointer.x * CONFIG.cursorSway : 0;
      const tiltTo = cursorLight ? pointer.y * CONFIG.cursorTilt : 0;
      swayNow += (swayTo - swayNow) * CONFIG.cursorDamp;
      tiltNow += (tiltTo - tiltNow) * CONFIG.cursorDamp;
      // the light follows the cursor; the cast falls away from it, the way it should
      sun.position.set(
        group.position.x + lookDir.x * CONFIG.sunHeight + swayNow,
        CONFIG.shadowY + lookDir.y * CONFIG.sunHeight,
        lookDir.z * CONFIG.sunHeight + tiltNow
      );
      sun.target.position.set(group.position.x, CONFIG.shadowY, 0);
      sun.target.updateMatrixWorld();
      keyDir.copy(sun.position).sub(sun.target.position).normalize();
      envSpin.value =
        -((Math.atan2(keyDir.z, keyDir.x) - ENV_BASE_AZIMUTH) / (Math.PI * 2)) * CONFIG.envFollow;
      floorUniforms.uGround.value.set(_seatRest.x, CONFIG.shadowY, 0);
      // publish the object's screen circle so the page can seat it in the panel: the page can
      // never work this out on its own, since it depends on this camera and this frame height
      if (t - lastPub > 0.08) {
        lastPub = t;
        const cw2 = renderer.domElement.clientWidth;
        const ch2 = renderer.domElement.clientHeight;
        // from the REST seat, never the live position: the seating push travels along the view
        // ray, so group.position.x drifts outward as it recedes while its projection holds still.
        // Publishing the live x would slide the whole panel right as the object drops in.
        fadeA.set(_seatRest.x, CONFIG.groupY, 0).project(camera);
        fadeB.set(_seatRest.x + CONFIG.outerRadius * CONFIG.groupScale, CONFIG.groupY, 0).project(camera);
        const cx = (fadeA.x * 0.5 + 0.5) * cw2;
        const cy = (1 - (fadeA.y * 0.5 + 0.5)) * ch2;
        const rr = Math.abs(fadeB.x - fadeA.x) * 0.5 * cw2;
        // on this element and on its parent: custom properties inherit downward only, and the
        // page's chrome are siblings of this element, not children of it
        const pub = (el) => {
          if (!el) return;
          el.style.setProperty('--braid-cx', cx.toFixed(1) + 'px');
          el.style.setProperty('--braid-cy', cy.toFixed(1) + 'px');
          el.style.setProperty('--braid-r', rr.toFixed(1) + 'px');
        };
        pub(this);
        pub(this.parentElement);
        // and on the root, because whatever mounts this element may sit between it and the page's
        // own chrome, and custom properties only inherit downward
        pub(document.documentElement);
      }
      // both casts lighten a little as the object breathes up off the floor
      const rise = 1 - lift * 1.2;
      inkUniform.value = inkBase * rise;
      emitUniform.value = emitBase * rise;
      // the keep-out edges are a screen-space promise, so solve them in world units each frame:
      // two projected points on the floor give ndc-per-unit under this camera
      fadeA.set(group.position.x, CONFIG.shadowY, 0).project(camera);
      fadeB.set(group.position.x + 1, CONFIG.shadowY, 0).project(camera);
      const ndcPerUnit = fadeB.x - fadeA.x || 1;
      const atFrac = (f) => group.position.x + (f * 2 - 1 - fadeA.x) / ndcPerUnit;
      floorUniforms.uFadeX.value = atFrac(keepOut);
      floorUniforms.uFadeX2.value = atFrac(CONFIG.shadowKeepIn);

      // billboard in world space: the ring is a child of the rotating group, so undo
      // the parent rotation or it renders as a skewed ellipse
      group.updateMatrixWorld(true);
      group.getWorldQuaternion(invGroup).invert();
      ring.quaternion.copy(invGroup).multiply(camera.quaternion);
      // depth-tested now, so lift it toward the camera: it should sit in front of the
      // strand it marks, while strands genuinely nearer still occlude it
      worldFlare.copy(cross.point).applyMatrix4(group.matrixWorld);
      ringLift.copy(camera.position).sub(worldFlare).normalize().multiplyScalar(CONFIG.ringLift).add(worldFlare);
      group.worldToLocal(ringLift);
      ring.position.copy(ringLift);
      ring.scale.setScalar(1 + 0.06 * Math.sin(t * 2.4) * holding);
      worldFlare.copy(flarePos).applyMatrix4(group.matrixWorld);
      wardUniforms.uFlarePos.value.copy(worldFlare);

      renderer.render(scene, camera);

      // project the crossing, then route the leader out through the emptiest quadrant
      const anchor = cross.point.clone().applyMatrix4(group.matrixWorld).project(camera);
      const cw = renderer.domElement.clientWidth;
      const ch = renderer.domElement.clientHeight;
      const ax = (anchor.x * 0.5 + 0.5) * cw;
      const ay = (-anchor.y * 0.5 + 0.5) * ch;
      const centre = new THREE.Vector3(0, 0, 0).applyMatrix4(group.matrixWorld).project(camera);
      const cx = (centre.x * 0.5 + 0.5) * cw;
      const cy = (-centre.y * 0.5 + 0.5) * ch;
      // always route right: the object sits in the right-hand grid cell, so a label
      // sent left lands on the hero copy
      const dirX = 1;
      const dirY = ay <= cy ? -1 : 1;
      const ex = Math.min(ax + dirX * 92, cw - 190);
      const ey = Math.max(28, Math.min(ch - 40, ay + dirY * 74));
      const tail = dirX * 34;
      leader.setAttribute('d', 'M ' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' L ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L ' + (ex + tail).toFixed(1) + ' ' + ey.toFixed(1));
      const labelX = ex + tail + 10;
      tip.style.right = 'auto';
      tip.style.left = labelX + 'px';
      tip.style.textAlign = 'left';
      tip.style.top = ey + 'px';
      const showTip = loop > CONFIG.tipShowStart && loop < CONFIG.tipShowEnd;
      if (showTip !== this._tipOn) {
        this._tipOn = showTip;
        leader.style.opacity = showTip ? '1' : '0';
        leader.setAttribute('stroke-dashoffset', showTip ? '0' : '260');
        tip.style.opacity = showTip ? '1' : '0';
        tip.style.transform = showTip ? 'translateY(-50%)' : 'translateY(calc(-50% + 5px))';
      }
    };

    if (reduce) {
      uniformsList.forEach((u) => { u.uReveal.value = 1; });
      ringUniforms.uActive.value = 0.7;
      wardUniforms.uActive.value = 0.7;
      wardUniforms.uFlarePos.value.copy(flarePos);
      group.rotation.set(CONFIG.rotXBase, 0.5, 0);
      group.updateMatrixWorld(true);
      group.getWorldQuaternion(invGroup).invert();
      ring.quaternion.copy(invGroup).multiply(camera.quaternion);
      renderer.render(scene, camera);
    } else {
      // rAF is throttled to a crawl in embedded previews, so drive on wall clock
      let rafFrames = 0;
      const rafLoop = () => {
        this._raf = requestAnimationFrame(rafLoop);
        rafFrames++;
        tick();
      };
      rafLoop();
      let seen = 0;
      this._watch = setInterval(() => {
        if (rafFrames - seen < 6) {
          cancelAnimationFrame(this._raf);
          clearInterval(this._watch);
          this._watch = null;
          this._timer = setInterval(tick, 33);
        }
        seen = rafFrames;
      }, 500);
    }

    this._cleanup = () => {
      cancelAnimationFrame(this._raf);
      if (this._timer) clearInterval(this._timer);
      if (this._watch) clearInterval(this._watch);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      if (this._themeObs) this._themeObs.disconnect();
      if (this._lookObs) this._lookObs.disconnect();
      renderer.dispose();
    };
  }

  disconnectedCallback() {
    if (this._cleanup) this._cleanup();
    this._started = false;
  }
}

if (!customElements.get('warded-braid')) customElements.define('warded-braid', WardedBraid);
