# Starfield

An early Spotify-to-galaxy experiment: a FastAPI backend retrieves track metadata and audio features; a Three.js frontend maps them into a procedural particle scene. The repository slug is `playground`; `tiny-cymbal` remains the package name.

This is a local prototype with in-memory sessions. The visual mapping is authored; it is not an astrophysical inference or a validated model of musical meaning. Spotify credentials and access to the requested endpoints are required for the live track path.

## Run locally

The checked-in PowerShell launcher starts the backend after dependencies and environment configuration are ready:

```powershell
.\scripts\dev.ps1
```

For separate processes, install the Python and Node dependencies, configure `.env` from `.env.example`, then run:

```bash
pip install -r requirements.txt
npm install
python run.py
```

In another terminal:

```bash
npm run dev
```

The API listens on port 5003. Open the frontend URL printed by Vite (normally port 5173); Vite proxies `/api` only; the checked-in OAuth redirect defaults to `/auth/spotify/callback` on port 5173, so the complete sign-in round trip still needs verification. `SPOTIFY_CLIENT_SECRET` belongs only in server configuration.

`npm run build` checks TypeScript and produces the frontend bundle. No automated test suite is configured. There are no checked-in `dev.sh`, `deploy.sh`, or `logs.sh` scripts, and this README does not claim a verified deployment.

## Source

- `app/main.py`: FastAPI routes and Spotify integration.
- `app/generator.py`: track-feature mapping and procedural galaxy generation.
- `src/`: browser renderer and controls.
- `run.py`: local Uvicorn entry point.
