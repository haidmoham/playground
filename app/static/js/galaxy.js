import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("galaxy");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 80, 120);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 500;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,
  0.4,
  0.1
);
composer.addPass(bloomPass);

const PARTICLE_COUNT = 12000;
let galaxy = null;
let params = null;
let animationId = null;

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r, g, b };
}

function buildGalaxy(features) {
  if (galaxy) {
    scene.remove(galaxy);
    galaxy.geometry.dispose();
    galaxy.material.dispose();
  }

  const bpm = features.bpm || 120;
  const energy = features.energy || 0.5;
  const danceability = features.danceability || 0.5;
  const valence = features.valence || 0.5;
  const acousticness = features.acousticness || 0.0;
  const instrumentalness = features.instrumentalness || 0.0;

  const count = PARTICLE_COUNT;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const velocities = new Float32Array(count * 3);

  const arms = Math.floor(2 + danceability * 3);
  const armSpread = 0.3 + (1 - danceability) * 0.8;
  const radius = 60 + (features.duration_ms || 180000) / 5000;
  const spin = 1 + bpm / 120;
  const randomnessPower = 2 + acousticness * 4;
  const coreDensity = 0.3 + instrumentalness * 0.5;

  const insideColor = hslToRgb(0.08 + valence * 0.15, 0.9, 0.6);
  const outsideColor = hslToRgb(0.55 + (1 - valence) * 0.2, 0.7, 0.4);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.random() * radius;
    const armAngle = ((i % arms) / arms) * Math.PI * 2;
    const spinAngle = r * spin / radius;
    const randomX = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * armSpread * r;
    const randomY = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * armSpread * r * 0.3;
    const randomZ = Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * armSpread * r;

    positions[i3] = Math.cos(armAngle + spinAngle) * r + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(armAngle + spinAngle) * r + randomZ;

    velocities[i3] = (Math.random() - 0.5) * 0.02;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

    const mixedColor = insideColor;
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    const distRatio = r / radius;
    const size = (1 - distRatio) * (1.5 + energy * 2.5) + 0.2;
    sizes[i] = Math.random() < coreDensity && r < radius * 0.2 ? size * 2.5 : size;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });

  galaxy = new THREE.Points(geometry, material);
  galaxy.userData = { velocities, params: { spin, radius, arms, armSpread, randomnessPower, coreDensity } };
  scene.add(galaxy);

  controls.autoRotateSpeed = 0.2 + bpm / 200;
  bloomPass.strength = 0.8 + energy * 1.2;
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();

  if (galaxy) {
    const positions = galaxy.geometry.attributes.position.array;
    const vels = galaxy.userData.velocities;
    const p = galaxy.userData.params;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const dist = Math.sqrt(x * x + z * z);
      if (dist > 0.1) {
        const orbitalSpeed = (p.spin * 0.003) / (dist * 0.05 + 1);
        const nx = -z / dist;
        const nz = x / dist;
        positions[i] += nx * orbitalSpeed + vels[i] * 0.1;
        positions[i + 2] += nz * orbitalSpeed + vels[i + 2] * 0.1;
      }
      positions[i + 1] += vels[i + 1] * 0.05;
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

const searchInput = document.getElementById("search");
const resultsList = document.getElementById("results");
const nowPlaying = document.getElementById("now-playing");

let debounceTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value.trim();
  if (!query) {
    resultsList.innerHTML = "";
    return;
  }
  debounceTimer = setTimeout(async () => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    resultsList.innerHTML = data.results
      .map(
        (t) => `
      <li data-id="${t.id}">
        <img src="${t.album_art}" alt="" />
        <div class="meta">
          <span class="name">${t.name}</span>
          <span class="artists">${t.artists.join(", ")}</span>
        </div>
      </li>
    `
      )
      .join("");
  }, 250);
});

resultsList.addEventListener("click", async (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const trackId = li.dataset.id;
  const res = await fetch(`/api/track/${trackId}`);
  const data = await res.json();
  params = data.features;
  buildGalaxy(params);
  document.getElementById("track-name").textContent = `${data.name} — ${data.artists.join(", ")}`;
  document.getElementById("album-art").src = data.album_art;
  nowPlaying.classList.remove("hidden");
});
