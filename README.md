# starfield

Turns Spotify tracks into physics-simulated galaxies.

## Run locally

./scripts/dev.sh

Then open http://localhost:5003

## How it works

1. Search for any Spotify track
2. Audio features (BPM, energy, valence, danceability, etc.) are mapped to galaxy physics
3. A WebGL particle simulation renders a unique galaxy for each track

## Deploy

./scripts/deploy.sh "what changed"
./scripts/logs.sh
