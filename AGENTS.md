# tiny-cymbal

Webapp that turns Spotify tracks into physics-simulated galaxies.

## Quick start

1. `cp .env.example .env` and fill in Spotify credentials
2. `pip install -r requirements.txt`
3. `python run.py`
4. Open http://localhost:5003

## Architecture

- Flask backend handles Spotify Web API auth and track data fetching
- Three.js frontend renders galaxies as GPU particle systems
- Audio features map directly to physics parameters (BPM → rotation, energy → bloom, etc.)
