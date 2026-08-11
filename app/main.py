from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth
from spotipy.cache_handler import MemoryCacheHandler
import asyncio
import time
import secrets
import urllib.parse
import requests
from datetime import datetime, timedelta
from typing import Optional

from app.generator import GalaxyGenerator, TrackVector

load_dotenv()

app = FastAPI(
    title="starfield",
    description="Turns Spotify tracks into physics-simulated galaxies.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:5173/auth/spotify/callback")

_generator = GalaxyGenerator()

# In-memory session store for local dev
_sessions: dict[str, dict] = {}
SESSION_COOKIE = "starfield_session"
SESSION_TTL = 60 * 60 * 24 * 30  # 30 days

SCOPES = "user-read-playback-state"

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"


# ── Session helpers ──────────────────────────────────────────────────

def _cleanup_sessions():
    now = time.time()
    expired = [k for k, v in _sessions.items() if now - v.get("_created_at", 0) > SESSION_TTL]
    for k in expired:
        _sessions.pop(k, None)


def _get_session(request: Request) -> dict:
    _cleanup_sessions()
    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id or session_id not in _sessions:
        session_id = secrets.token_urlsafe(32)
        _sessions[session_id] = {"_created_at": time.time()}
    return _sessions[session_id]


def _set_session_cookie(response: JSONResponse | RedirectResponse, session_id: str):
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        max_age=SESSION_TTL,
        secure=False,
        samesite="lax",
    )


# ── Spotify client helpers ───────────────────────────────────────────

def _get_spotify_client(token: Optional[str] = None) -> spotipy.Spotify:
    if token:
        return spotipy.Spotify(auth=token)
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise RuntimeError("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET")
    auth_manager = SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        cache_handler=MemoryCacheHandler(),
    )
    return spotipy.Spotify(auth_manager=auth_manager)


def _refresh_if_needed(session: dict) -> bool:
    if "spotify_access_token" not in session:
        return False
    if time.time() < session.get("spotify_token_expires_at", 0) - 60:
        return True

    refresh = session.get("spotify_refresh_token")
    if not refresh:
        return False

    try:
        r = requests.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "refresh_token", "refresh_token": refresh},
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
            timeout=10,
        )
        if not r.ok:
            return False
        tokens = r.json()
        session["spotify_access_token"] = tokens["access_token"]
        session["spotify_token_expires_at"] = time.time() + tokens.get("expires_in", 3600)
        if "refresh_token" in tokens:
            session["spotify_refresh_token"] = tokens["refresh_token"]
        return True
    except requests.RequestException:
        return False


# ── Models ───────────────────────────────────────────────────────────

class TrackSearchResult(BaseModel):
    id: str
    name: str
    artists: list[str]
    album_art: str | None = None


class TrackFeatures(BaseModel):
    bpm: int
    energy: float
    danceability: float
    valence: float
    acousticness: float
    instrumentalness: float


class GalaxySpecModel(BaseModel):
    particle_count: int
    arms: int
    arm_spread: float
    radius: float
    spin_factor: float
    randomness_power: float
    core_density: float
    inner_color: list[float]
    outer_color: list[float]
    bloom_strength: float
    rotation_speed: float
    turbulence: float
    seed: int
    parameters: dict


class TrackResponse(BaseModel):
    id: str
    name: str
    artists: list[str]
    album_art: str | None
    features: TrackFeatures
    galaxy_spec: GalaxySpecModel
    particles: dict


class SearchResponse(BaseModel):
    results: list[TrackSearchResult]


class DemoTrackResponse(BaseModel):
    id: str
    name: str
    artists: list[str]
    album_art: str | None = None


class LoginStatusResponse(BaseModel):
    logged_in: bool
    user: Optional[dict] = None


class TokenResponse(BaseModel):
    access_token: str
    expires_at: float


DEMO_TRACKS = [
    {
        "id": "demo-nebula-drift",
        "name": "Nebula Drift",
        "artists": ["Synthia"],
        "album_art": None,
        "features": {
            "bpm": 118,
            "energy": 0.72,
            "danceability": 0.81,
            "valence": 0.64,
            "acousticness": 0.03,
            "instrumentalness": 0.91,
        },
        "duration_ms": 214000,
        "loudness": -8.4,
    },
    {
        "id": "demo-void-walker",
        "name": "Void Walker",
        "artists": ["Kestrel", "Mote"],
        "album_art": None,
        "features": {
            "bpm": 142,
            "energy": 0.88,
            "danceability": 0.55,
            "valence": 0.31,
            "acousticness": 0.01,
            "instrumentalness": 0.76,
        },
        "duration_ms": 187000,
        "loudness": -5.1,
    },
    {
        "id": "demo-slow-constellation",
        "name": "Slow Constellation",
        "artists": ["Aura Field"],
        "album_art": None,
        "features": {
            "bpm": 84,
            "energy": 0.34,
            "danceability": 0.42,
            "valence": 0.78,
            "acousticness": 0.58,
            "instrumentalness": 0.12,
        },
        "duration_ms": 276000,
        "loudness": -14.2,
    },
    {
        "id": "demo-iron-spiral",
        "name": "Iron Spiral",
        "artists": ["Rust Circuit"],
        "album_art": None,
        "features": {
            "bpm": 168,
            "energy": 0.95,
            "danceability": 0.68,
            "valence": 0.22,
            "acousticness": 0.0,
            "instrumentalness": 0.97,
        },
        "duration_ms": 153000,
        "loudness": -3.8,
    },
    {
        "id": "demo-tidal-memory",
        "name": "Tidal Memory",
        "artists": ["Glass Ocean"],
        "album_art": None,
        "features": {
            "bpm": 96,
            "energy": 0.51,
            "danceability": 0.73,
            "valence": 0.59,
            "acousticness": 0.41,
            "instrumentalness": 0.08,
        },
        "duration_ms": 241000,
        "loudness": -11.6,
    },
]


def _demo_track_payload(demo: dict) -> dict:
    tv = TrackVector(
        id=demo["id"],
        tempo=demo["features"]["bpm"],
        energy=demo["features"]["energy"],
        danceability=demo["features"]["danceability"],
        valence=demo["features"]["valence"],
        acousticness=demo["features"]["acousticness"],
        instrumentalness=demo["features"]["instrumentalness"],
        duration_ms=demo["duration_ms"],
        loudness=demo["loudness"],
        features=demo["features"],
    )
    spec = _generator.from_track(tv)
    particles = _generator.sample_particles(spec)
    return {
        "id": demo["id"],
        "name": demo["name"],
        "artists": demo["artists"],
        "album_art": demo["album_art"],
        "features": demo["features"],
        "galaxy_spec": {
            "particle_count": spec.particle_count,
            "arms": spec.arms,
            "arm_spread": spec.arm_spread,
            "radius": spec.radius,
            "spin_factor": spec.spin_factor,
            "randomness_power": spec.randomness_power,
            "core_density": spec.core_density,
            "inner_color": list(spec.inner_color),
            "outer_color": list(spec.outer_color),
            "bloom_strength": spec.bloom_strength,
            "rotation_speed": spec.rotation_speed,
            "turbulence": spec.turbulence,
            "seed": spec.seed,
            "parameters": spec.parameters,
        },
        "particles": particles,
    }


# ── Spotify OAuth routes ─────────────────────────────────────────────

@app.get("/auth/spotify/login")
async def auth_spotify_login(request: Request):
    if not SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=500, detail="SPOTIFY_CLIENT_ID not configured")
    state = secrets.token_urlsafe(16)
    session = _get_session(request)
    session["spotify_oauth_state"] = state

    params = {
        "response_type": "code",
        "client_id": SPOTIFY_CLIENT_ID,
        "scope": SCOPES,
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "state": state,
    }
    auth_url = f"{SPOTIFY_AUTH_URL}?{urllib.parse.urlencode(params)}"
    response = RedirectResponse(auth_url)
    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id:
        _set_session_cookie(response, session_id)
    return response


@app.get("/auth/spotify/callback")
async def auth_spotify_callback(request: Request, code: str, state: str):
    session = _get_session(request)
    expected_state = session.pop("spotify_oauth_state", None)
    if not state or state != expected_state:
        raise HTTPException(status_code=400, detail="Invalid state")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    r = requests.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": SPOTIFY_REDIRECT_URI,
        },
        auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        timeout=10,
    )
    if not r.ok:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {r.text}")

    tokens = r.json()
    session["spotify_access_token"] = tokens["access_token"]
    session["spotify_refresh_token"] = tokens.get("refresh_token", "")
    session["spotify_token_expires_at"] = time.time() + tokens.get("expires_in", 3600)

    response = RedirectResponse(url="/")
    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id:
        _set_session_cookie(response, session_id)
    return response


@app.get("/auth/spotify/token", response_model=TokenResponse)
async def auth_spotify_token(request: Request):
    session = _get_session(request)
    if not _refresh_if_needed(session):
        raise HTTPException(status_code=401, detail="not_authenticated")
    return {
        "access_token": session["spotify_access_token"],
        "expires_at": session["spotify_token_expires_at"],
    }


@app.get("/auth/spotify/status", response_model=LoginStatusResponse)
async def auth_spotify_status(request: Request):
    session = _get_session(request)
    token = session.get("spotify_access_token")
    if not token:
        return {"logged_in": False, "user": None}
    try:
        sp = _get_spotify_client(token)
        me = await asyncio.to_thread(sp.current_user)
        return {
            "logged_in": True,
            "user": {
                "id": me["id"],
                "name": me["display_name"],
                "image": me["images"][0]["url"] if me["images"] else None,
            },
        }
    except Exception:
        return {"logged_in": False, "user": None}


@app.post("/auth/spotify/logout")
async def auth_spotify_logout(request: Request):
    session = _get_session(request)
    for k in ("spotify_access_token", "spotify_refresh_token", "spotify_token_expires_at"):
        session.pop(k, None)
    return {"ok": True}


# ── Page + API routes ────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse("app/templates/index.html")


@app.get("/api/demo-tracks", response_model=list[DemoTrackResponse])
async def demo_tracks() -> list[DemoTrackResponse]:
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "artists": t["artists"],
            "album_art": t["album_art"],
        }
        for t in DEMO_TRACKS
    ]


@app.get("/api/demo/{track_id}", response_model=TrackResponse)
async def demo_track(track_id: str) -> TrackResponse:
    match = next((t for t in DEMO_TRACKS if t["id"] == track_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Demo track not found")
    return _demo_track_payload(match)


@app.get("/api/search", response_model=SearchResponse)
async def search_tracks(request: Request, q: str = "") -> SearchResponse:
    if not q:
        return {"results": []}
    session = _get_session(request)
    token = session.get("spotify_access_token")
    if not token or not _refresh_if_needed(session):
        return {"results": []}
    sp = _get_spotify_client(token)
    res = await asyncio.to_thread(sp.search, q=q, type="track", limit=12)
    items = [
        {
            "id": t["id"],
            "name": t["name"],
            "artists": [a["name"] for a in t["artists"]],
            "album_art": t["album"]["images"][0]["url"] if t["album"]["images"] else None,
        }
        for t in res["tracks"]["items"]
    ]
    return {"results": items}


@app.get("/api/track/{track_id}", response_model=TrackResponse)
async def track_data(request: Request, track_id: str) -> TrackResponse:
    session = _get_session(request)
    token = session.get("spotify_access_token")
    if not token or not _refresh_if_needed(session):
        raise HTTPException(status_code=401, detail="Not authenticated")
    sp = _get_spotify_client(token)
    track_data, raw_features = await asyncio.gather(
        asyncio.to_thread(sp.track, track_id),
        asyncio.to_thread(sp.audio_features, track_id),
    )
    raw_features = raw_features[0] or {}

    features = {
        "bpm": round(raw_features.get("tempo", 120) or 120),
        "energy": round(raw_features.get("energy", 0.5) or 0.5, 3),
        "danceability": round(raw_features.get("danceability", 0.5) or 0.5, 3),
        "valence": round(raw_features.get("valence", 0.5) or 0.5, 3),
        "acousticness": round(raw_features.get("acousticness", 0.0) or 0.0, 3),
        "instrumentalness": round(raw_features.get("instrumentalness", 0.0) or 0.0, 3),
    }

    tv = TrackVector(
        id=track_id,
        tempo=features["bpm"],
        energy=features["energy"],
        danceability=features["danceability"],
        valence=features["valence"],
        acousticness=features["acousticness"],
        instrumentalness=features["instrumentalness"],
        duration_ms=track_data["duration_ms"],
        loudness=raw_features.get("loudness") or -20.0,
        features=features,
    )

    spec = _generator.from_track(tv)
    particles = _generator.sample_particles(spec)

    return {
        "id": track_data["id"],
        "name": track_data["name"],
        "artists": [a["name"] for a in track_data["artists"]],
        "album_art": track_data["album"]["images"][0]["url"] if track_data["album"]["images"] else None,
        "features": features,
        "galaxy_spec": {
            "particle_count": spec.particle_count,
            "arms": spec.arms,
            "arm_spread": spec.arm_spread,
            "radius": spec.radius,
            "spin_factor": spec.spin_factor,
            "randomness_power": spec.randomness_power,
            "core_density": spec.core_density,
            "inner_color": list(spec.inner_color),
            "outer_color": list(spec.outer_color),
            "bloom_strength": spec.bloom_strength,
            "rotation_speed": spec.rotation_speed,
            "turbulence": spec.turbulence,
            "seed": spec.seed,
            "parameters": spec.parameters,
        },
        "particles": particles,
    }
