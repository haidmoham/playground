import { buildGalaxy, type TrackPayload } from "./galaxy";

const authBtn = document.getElementById("auth-btn") as HTMLButtonElement;
const authStatus = document.getElementById("auth-status") as HTMLSpanElement;
const searchWrap = document.getElementById("search-wrap") as HTMLDivElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const resultsList = document.getElementById("results") as HTMLUListElement;
const demoList = document.getElementById("demo-list") as HTMLUListElement;
const nowPlaying = document.getElementById("now-playing") as HTMLDivElement;
const trackName = document.getElementById("track-name") as HTMLDivElement;
const trackArtists = document.getElementById("track-artists") as HTMLDivElement;
const albumArt = document.getElementById("album-art") as HTMLImageElement;

const trackInfo = document.getElementById("track-info") as HTMLDivElement;
const vectorDisplay = document.getElementById("vector-display") as HTMLDivElement;
const galaxyParams = document.getElementById("galaxy-params") as HTMLDivElement;

let debounceTimer: number;
let isAuthenticated = false;

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/auth/spotify/status");
    if (!res.ok) return false;
    const data = await res.json();
    return data.logged_in;
  } catch {
    return false;
  }
}

function setAuthUI(loggedIn: boolean, userName?: string) {
  isAuthenticated = loggedIn;
  if (loggedIn) {
    authBtn.textContent = `[ disconnect ${userName ?? ""} ]`;
    authStatus.textContent = "";
    searchWrap.classList.remove("hidden");
  } else {
    authBtn.textContent = "[ connect spotify ]";
    authStatus.textContent = "";
    searchWrap.classList.add("hidden");
  }
}

async function loadTrack(trackId: string) {
  const endpoint = trackId.startsWith("demo-") ? `/api/demo/${trackId}` : `/api/track/${trackId}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    alert("failed to load track");
    return;
  }
  const data: TrackPayload = await res.json();

  trackName.textContent = data.name;
  trackArtists.textContent = data.artists.join(", ");
  albumArt.src = data.album_art ?? "";
  nowPlaying.classList.remove("hidden");

  buildGalaxy(data.galaxy_spec, data.particles);

  trackInfo.innerHTML = `
    <strong>${data.name}</strong>
    <span>${data.artists.join(", ")}</span>
  `;

  const f = data.features;
  const vec = [
    (f.bpm / 200).toFixed(3),
    f.energy.toFixed(3),
    f.danceability.toFixed(3),
    f.valence.toFixed(3),
    f.acousticness.toFixed(3),
    f.instrumentalness.toFixed(3),
    (data.galaxy_spec.parameters.duration_s / 600).toFixed(3),
    ((data.galaxy_spec.parameters.loudness + 60) / 60).toFixed(3),
  ];
  vectorDisplay.innerHTML = `
    <div class="label">track vector (8-d)</div>
    <pre>${vec.join(", ")}</pre>
    <div class="kv"><span>bpm</span><span>${f.bpm}</span></div>
    <div class="kv"><span>energy</span><span>${f.energy}</span></div>
    <div class="kv"><span>danceability</span><span>${f.danceability}</span></div>
    <div class="kv"><span>valence</span><span>${f.valence}</span></div>
    <div class="kv"><span>acousticness</span><span>${f.acousticness}</span></div>
    <div class="kv"><span>instrumentalness</span><span>${f.instrumentalness}</span></div>
  `;

  const g = data.galaxy_spec;
  galaxyParams.innerHTML = `
    <div class="label">galaxy spec</div>
    <div class="kv"><span>particles</span><span>${g.particle_count.toLocaleString()}</span></div>
    <div class="kv"><span>arms</span><span>${g.arms}</span></div>
    <div class="kv"><span>radius</span><span>${g.radius.toFixed(1)}</span></div>
    <div class="kv"><span>spin</span><span>${g.spin_factor.toFixed(3)}</span></div>
    <div class="kv"><span>randomness</span><span>${g.randomness_power.toFixed(3)}</span></div>
    <div class="kv"><span>core density</span><span>${g.core_density.toFixed(3)}</span></div>
    <div class="kv"><span>bloom</span><span>${g.bloom_strength.toFixed(3)}</span></div>
    <div class="kv"><span>rotation</span><span>${g.rotation_speed.toFixed(3)}</span></div>
    <div class="kv"><span>turbulence</span><span>${g.turbulence.toFixed(3)}</span></div>
    <div class="kv"><span>seed</span><span>${g.seed}</span></div>
  `;
}

async function loadDemoTracks() {
  const res = await fetch("/api/demo-tracks");
  const tracks: { id: string; name: string; artists: string[]; album_art: string | null }[] = await res.json();
  demoList.innerHTML = tracks
    .map(
      (t) => `
      <li data-id="${t.id}">
        <div class="meta">
          <span class="name">${t.name}</span>
          <span class="artists">${t.artists.join(", ")}</span>
        </div>
      </li>
    `
    )
    .join("");

  return tracks;
}

async function init() {
  const loggedIn = await checkAuth();
  setAuthUI(loggedIn);

  const demos = await loadDemoTracks();
  if (demos.length > 0) {
    await loadTrack(demos[0].id);
  }
}

authBtn.addEventListener("click", async () => {
  if (isAuthenticated) {
    await fetch("/auth/spotify/logout", { method: "POST" });
    setAuthUI(false);
  } else {
    window.location.href = "/auth/spotify/login";
  }
});

searchInput.addEventListener("input", (e: Event) => {
  clearTimeout(debounceTimer);
  const query = (e.target as HTMLInputElement).value.trim();
  if (!query) {
    resultsList.innerHTML = "";
    return;
  }
  debounceTimer = window.setTimeout(async () => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      resultsList.innerHTML = `<li style="color:var(--muted)">connect spotify to search</li>`;
      return;
    }
    const data = await res.json();
    resultsList.innerHTML = data.results
      .map(
        (t: { id: string; name: string; artists: string[]; album_art: string | null }) => `
        <li data-id="${t.id}">
          <img src="${t.album_art ?? ""}" alt="" />
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

resultsList.addEventListener("click", async (e: Event) => {
  const li = (e.target as HTMLElement).closest("li");
  if (!li) return;
  const trackId = li.getAttribute("data-id")!;
  await loadTrack(trackId);
});

demoList.addEventListener("click", async (e: Event) => {
  const li = (e.target as HTMLElement).closest("li");
  if (!li) return;
  const trackId = li.getAttribute("data-id")!;
  await loadTrack(trackId);
});

init();
