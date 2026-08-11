import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface TrackFeatures {
  bpm: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

export interface GalaxySpec {
  particle_count: number;
  arms: number;
  arm_spread: number;
  radius: number;
  spin_factor: number;
  randomness_power: number;
  core_density: number;
  inner_color: number[];
  outer_color: number[];
  bloom_strength: number;
  rotation_speed: number;
  turbulence: number;
  seed: number;
  parameters: {
    track_vector: number[];
    tempo: number;
    energy: number;
    danceability: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
    duration_s: number;
    loudness: number;
    seed: number;
    particle_count_pipeline: number;
    arms_pipeline: number;
  };
}

export interface Particles {
  positions: number[][];
  colors: number[][];
  sizes: number[];
  velocities: number[][];
}

export interface TrackPayload {
  id: string;
  name: string;
  artists: string[];
  album_art: string | null;
  features: TrackFeatures;
  galaxy_spec: GalaxySpec;
  particles: Particles;
}

function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.1, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.2)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.04)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createBackgroundStars(): THREE.Points {
  const count = 2500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 250 + Math.random() * 750;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0x555555,
    sizeAttenuation: true,
    depthWrite: false,
  });
  return new THREE.Points(geom, mat);
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uBreatheAmp;
  uniform float uBreatheFreq;
  attribute float size;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vec3 pos = position;

    float breathe = 1.0 + sin(uTime * uBreatheFreq + length(pos) * 0.05) * uBreatheAmp;
    pos *= breathe;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * uPixelRatio * (180.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 40.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = length(pos.xz);
    vAlpha = smoothstep(0.0, 0.15, dist / 140.0) * 0.7 + 0.3;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float core = exp(-d * 5.0);
    float halo = exp(-d * 1.8) * 0.25;
    float alpha = (core + halo) * vAlpha;

    vec3 col = vColor * (0.55 + core * 0.45);
    col += vColor * core * 0.3;

    gl_FragColor = vec4(col, alpha);
  }
`;

const canvas = document.getElementById("galaxy") as HTMLCanvasElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 55, 95);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 400;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;
controls.enablePan = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.1,
  0.6,
  0.15
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

scene.add(createBackgroundStars());

const glowTexture = createGlowTexture();
let galaxy: THREE.Points | null = null;
let galaxyParams: { spin: number; radius: number; turbulence: number; breatheAmp: number; breatheFreq: number } | null = null;
let time = 0;

export function buildGalaxy(spec: GalaxySpec, particles: Particles): void {
  if (galaxy) {
    scene.remove(galaxy);
    galaxy.geometry.dispose();
    (galaxy.material as THREE.Material).dispose();
  }

  const positions = new Float32Array(particles.positions.flat());
  const colors = new Float32Array(particles.colors.flat());
  const sizes = new Float32Array(particles.sizes);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const innerColor = new THREE.Color(spec.inner_color[0], spec.inner_color[1], spec.inner_color[2]);
  const outerColor = new THREE.Color(spec.outer_color[0], spec.outer_color[1], spec.outer_color[2]);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColorInner: { value: innerColor },
      uColorOuter: { value: outerColor },
      uBreatheAmp: { value: 0.03 + spec.parameters.energy * 0.08 },
      uBreatheFreq: { value: 0.4 + (spec.parameters.tempo / 200) * 0.8 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  galaxy = new THREE.Points(geometry, material);
  galaxy.userData.velocities = new Float32Array(particles.velocities.flat());
  galaxy.userData.params = {
    spin: spec.spin_factor,
    radius: spec.radius,
    turbulence: spec.turbulence,
    breatheAmp: 0.03 + spec.parameters.energy * 0.08,
    breatheFreq: 0.4 + (spec.parameters.tempo / 200) * 0.8,
  };
  scene.add(galaxy);

  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: innerColor,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowSprite = new THREE.Sprite(glowMaterial);
  glowSprite.scale.set(spec.radius * 0.7, spec.radius * 0.7, 1);
  galaxy.add(glowSprite);

  controls.autoRotateSpeed = 0.2 + spec.rotation_speed * 0.4;
  bloomPass.strength = spec.bloom_strength;
  galaxyParams = {
    spin: spec.spin_factor,
    radius: spec.radius,
    turbulence: spec.turbulence,
    breatheAmp: 0.03 + spec.parameters.energy * 0.08,
    breatheFreq: 0.4 + (spec.parameters.tempo / 200) * 0.8,
  };
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  time += 0.016;

  if (galaxy && galaxyParams) {
    const positions = galaxy.geometry.attributes.position.array as Float32Array;
    const vels = galaxy.userData.velocities as Float32Array;
    const p = galaxyParams;
    const uniforms = (galaxy.material as THREE.ShaderMaterial).uniforms;
    uniforms.uTime.value = time;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 0.1) {
        const orbitalSpeed = (p.spin * 0.0025) / (dist * 0.04 + 1);
        const nx = -z / dist;
        const nz = x / dist;
        positions[i] += nx * orbitalSpeed + vels[i] * 0.06;
        positions[i + 2] += nz * orbitalSpeed + vels[i + 2] * 0.06;
      }
      positions[i + 1] += Math.sin(time * 0.8 + positions[i] * 0.04) * 0.015 + vels[i + 1] * 0.02;
    }
    galaxy.geometry.attributes.position.needsUpdate = true;
  }

  composer.render();
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
