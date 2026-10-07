import * as THREE from 'three';

/** CELL — translucent membrane with rim light, faint subsurface glow, atlas-mapped host image. */
export const CELL_VERT = /* glsl */ `
attribute float aTint;
attribute float aHalo;
attribute float aSpeckle;
attribute float aDead;
attribute vec2 aTile;
attribute float aSwell;
attribute float aFlash;
attribute float aDim;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vTint, vHalo, vSpeckle, vDead, vSwell, vFlash, vDim;
varying vec2 vTile;
uniform float uTime;
void main() {
  vTint = aTint; vHalo = aHalo; vSpeckle = aSpeckle; vDead = aDead; vSwell = aSwell; vFlash = aFlash; vDim = aDim; vTile = aTile; vUv = uv;
  // swell with a slow wobble before rupture
  float wob = aSwell * 0.06 * sin(uTime * 9.0 + position.y * 4.0);
  vec3 p = position * (1.0 + aSwell * 0.38 + wob);
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vec4 world = m * vec4(p, 1.0);
  vN = normalize(mat3(m) * normal);
  vV = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const CELL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform float uTime;
uniform float uBright;
uniform vec3 uSpecimen, uViral, uImmune, uDead, uInfection;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying float vTint, vHalo, vSpeckle, vDead, vSwell, vFlash, vDim;
varying vec2 vTile;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float ndv = max(dot(normalize(vN), normalize(vV)), 0.0);
  float rim = pow(1.0 - ndv, 2.6);
  vec3 base = mix(uSpecimen, uViral, vTint);
  base = mix(base, uDead, vDead);
  // membrane texture: host image faintly mapped
  vec2 tuv = vTile + vec2(vUv.x, 1.0 - vUv.y) * (1.0 / 16.0);
  vec3 tex = texture2D(uAtlas, tuv).rgb;
  // subsurface approximation: light scattered inside, strongest facing camera, soft falloff
  float sss = pow(ndv, 1.6) * 0.11 + pow(ndv, 0.5) * 0.035;
  // lysogenic speckle pattern
  float speck = vSpeckle * step(0.94, hash(floor(vUv * vec2(48.0, 24.0))));
  vec3 col = base * (rim * 1.5 + sss) + tex * 0.22 * (0.35 + 0.65 * ndv) * (1.0 - vDead * 0.7);
  col += uViral * speck * 0.7;
  col += uImmune * vHalo * pow(1.0 - ndv, 3.5) * 1.4;      // immunity halo
  col += uInfection * vFlash * (0.5 + rim * 1.5);          // activation flash
  col += uViral * vSwell * rim * 0.8;
  float alpha = rim * 0.95 + sss + speck * 0.35 + vHalo * pow(1.0 - ndv, 3.5) + vFlash * 0.5;
  // brightfield: dark specimen on white
  vec3 bright = mix(base * 0.35, vec3(0.05), rim * 0.6) + uImmune * 0.0;
  col = mix(col, bright, uBright);
  alpha = mix(alpha, (rim * 0.9 + sss * 2.5 + speck * 0.4) * 0.9, uBright);
  gl_FragColor = vec4(col * vDim, alpha * vDim);
}
`;

/** VIRUS PARTICLE — small faceted icosahedron, emissive. */
export const PARTICLE_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vC;
varying float vA;
varying vec3 vN;
varying vec3 vV;
void main() {
  vC = aColor; vA = aAlpha;
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vec4 world = m * vec4(position, 1.0);
  vN = normalize(mat3(m) * normal);
  vV = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
export const PARTICLE_FRAG = /* glsl */ `
precision highp float;
uniform float uBright;
varying vec3 vC;
varying float vA;
varying vec3 vN;
varying vec3 vV;
void main() {
  float ndv = max(dot(normalize(vN), normalize(vV)), 0.0);
  float facet = 0.55 + 0.45 * ndv;
  vec3 col = vC * (facet * 1.6) + vC * pow(1.0 - ndv, 2.0) * 0.8;
  col = mix(col, vC * 0.6, uBright);
  gl_FragColor = vec4(col, vA);
}
`;

export function makeCellMaterial(atlas: THREE.Texture, palette: { specimen: string; viral: string; immune: string; dead: string; infection: string }) {
  return new THREE.ShaderMaterial({
    vertexShader: CELL_VERT,
    fragmentShader: CELL_FRAG,
    uniforms: {
      uAtlas: { value: atlas },
      uTime: { value: 0 },
      uBright: { value: 0 },
      uSpecimen: { value: new THREE.Color(palette.specimen) },
      uViral: { value: new THREE.Color(palette.viral) },
      uImmune: { value: new THREE.Color(palette.immune) },
      uDead: { value: new THREE.Color(palette.dead) },
      uInfection: { value: new THREE.Color(palette.infection) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

export function makeParticleMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: { uBright: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Builds a 16×16 tile atlas (64px tiles) from data-URI host images; returns texture + a loader that fills tiles async. */
export function makeAtlas(): { texture: THREE.CanvasTexture; draw: (index: number, src: string, fallbackText: string) => void } {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  const draw = (index: number, src: string, fallbackText: string) => {
    const x = (index % 16) * 64;
    const y = Math.floor(index / 16) * 64;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, 64, 64);
      texture.needsUpdate = true;
    };
    img.onerror = () => {
      ctx.fillStyle = '#223';
      ctx.fillRect(x, y, 64, 64);
      ctx.fillStyle = '#9ab';
      ctx.font = '700 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fallbackText.slice(0, 4), x + 32, y + 38);
      texture.needsUpdate = true;
    };
    img.src = src;
  };
  return { texture, draw };
}

export function tileOf(index: number): [number, number] {
  return [(index % 16) / 16, Math.floor(index / 16) / 16];
}
