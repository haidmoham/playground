import hashlib
import math
import random
from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class TrackVector:
    id: str
    tempo: float
    energy: float
    danceability: float
    valence: float
    acousticness: float
    instrumentalness: float
    duration_ms: float
    loudness: float
    features: dict[str, float] = field(default_factory=dict)

    def to_vector(self) -> np.ndarray:
        return np.array([
            self.tempo / 200.0,
            self.energy,
            self.danceability,
            self.valence,
            self.acousticness,
            self.instrumentalness,
            self.duration_ms / 600000.0,
            (self.loudness + 60.0) / 60.0,
        ], dtype=np.float64)


@dataclass
class GalaxySpec:
    particle_count: int
    arms: int
    arm_spread: float
    radius: float
    spin_factor: float
    randomness_power: float
    core_density: float
    inner_color: tuple[float, float, float]
    outer_color: tuple[float, float, float]
    bloom_strength: float
    rotation_speed: float
    turbulence: float
    seed: int
    parameters: dict[str, Any] = field(default_factory=dict)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _map_range(value: float, in_min: float, in_max: float, out_min: float, out_max: float) -> float:
    return _lerp(out_min, out_max, max(0.0, min(1.0, (value - in_min) / (in_max - in_min))))


def _hash_to_seed(track_id: str) -> int:
    return int(hashlib.sha256(track_id.encode()).hexdigest()[:8], 16)


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[float, float, float]:
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h * 6) % 2 - 1))
    m = l - c / 2
    if h < 1 / 6:
        r, g, b = c, x, 0
    elif h < 2 / 6:
        r, g, b = x, c, 0
    elif h < 3 / 6:
        r, g, b = 0, c, x
    elif h < 4 / 6:
        r, g, b = 0, x, c
    elif h < 5 / 6:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return (r + m, g + m, b + m)


def _gauss(rng: random.Random, mu: float = 0.0, sigma: float = 1.0) -> float:
    u1 = rng.random()
    u2 = rng.random()
    z = math.sqrt(-2.0 * math.log(max(u1, 1e-10))) * math.cos(2.0 * math.pi * u2)
    return mu + z * sigma


class GalaxyGenerator:
    def __init__(self, rng: random.Random | None = None):
        self.rng = rng or random.Random(0)

    def from_track(self, track: TrackVector) -> GalaxySpec:
        vec = track.to_vector()
        seed = _hash_to_seed(track.id)
        self.rng.seed(seed)

        tempo = track.tempo
        energy = track.energy
        danceability = track.danceability
        valence = track.valence
        acousticness = track.acousticness
        duration_s = track.duration_ms / 1000.0

        particle_count = int(_map_range(energy * tempo, 60, 200, 6000, 18000))
        particle_count = max(6000, min(18000, particle_count))

        arms = int(_map_range(danceability, 0.0, 1.0, 2, 5))
        arms = max(2, min(5, arms))

        arm_spread = _map_range(1.0 - danceability, 0.0, 1.0, 0.2, 0.9)
        radius = _map_range(duration_s, 60, 600, 50, 160)
        spin_factor = _map_range(tempo, 60, 200, 0.9, 2.6)
        randomness_power = _map_range(acousticness, 0.0, 1.0, 1.3, 4.0)
        core_density = _map_range(track.instrumentalness, 0.0, 1.0, 0.3, 0.75)
        bloom_strength = _map_range(energy, 0.0, 1.0, 0.8, 2.2)
        rotation_speed = _map_range(tempo, 60, 200, 0.25, 1.1)
        turbulence = _map_range(1.0 - valence, 0.0, 1.0, 0.05, 0.45)

        hue = 0.06 + valence * 0.14 + energy * 0.06
        inner = _hsl_to_rgb(hue, 0.95, 0.7)
        outer_hue = 0.58 + (1.0 - valence) * 0.22
        outer = _hsl_to_rgb(outer_hue, 0.75, 0.38)

        params = {
            "track_vector": vec.tolist(),
            "tempo": tempo,
            "energy": energy,
            "danceability": danceability,
            "valence": valence,
            "acousticness": acousticness,
            "instrumentalness": track.instrumentalness,
            "duration_s": duration_s,
            "loudness": track.loudness,
            "seed": seed,
            "particle_count_pipeline": particle_count,
            "arms_pipeline": arms,
        }

        return GalaxySpec(
            particle_count=particle_count,
            arms=arms,
            arm_spread=arm_spread,
            radius=radius,
            spin_factor=spin_factor,
            randomness_power=randomness_power,
            core_density=core_density,
            inner_color=inner,
            outer_color=outer,
            bloom_strength=bloom_strength,
            rotation_speed=rotation_speed,
            turbulence=turbulence,
            seed=seed,
            parameters=params,
        )

    def sample_particles(self, spec: GalaxySpec) -> dict[str, Any]:
        rng = random.Random(spec.seed)
        count = spec.particle_count
        positions = np.zeros((count, 3), dtype=np.float64)
        colors = np.zeros((count, 3), dtype=np.float64)
        sizes = np.zeros(count, dtype=np.float64)
        velocities = np.zeros((count, 3), dtype=np.float64)

        core_count = int(count * 0.25)
        arm_count = count - core_count

        for i in range(count):
            if i < core_count:
                r = abs(_gauss(rng, 0.0, spec.radius * 0.12))
                r = min(r, spec.radius * 0.25)
                theta = rng.random() * math.pi * 2
                phi = math.acos(2 * rng.random() - 1)
                x = r * math.sin(phi) * math.cos(theta)
                y = r * math.sin(phi) * math.sin(theta) * 0.35
                z = r * math.cos(phi)
                positions[i] = (x, y, z)

                dist_ratio = r / max(spec.radius, 1e-6)
                cr, cg, cb = spec.inner_color
                boost = 1.15
                colors[i] = (
                    min(cr * boost, 1.0),
                    min(cg * boost, 1.0),
                    min(cb * boost, 1.0),
                )

                base_size = (1.0 - dist_ratio * 0.5) * (1.8 + 1.2 * (spec.bloom_strength / 2.0))
                sizes[i] = max(0.2, base_size * (0.8 + rng.random() * 0.4))

                vx = (rng.random() - 0.5) * spec.turbulence * 0.3
                vy = (rng.random() - 0.5) * spec.turbulence * 0.15
                vz = (rng.random() - 0.5) * spec.turbulence * 0.3
                velocities[i] = (vx, vy, vz)

            else:
                arm_index = (i - core_count) % spec.arms
                base_angle = (arm_index / spec.arms) * 2 * math.pi
                u = math.pow(rng.random(), 0.5)
                r = u * spec.radius
                spin_angle = r * spec.spin_factor / spec.radius
                angle = base_angle + spin_angle

                power = spec.randomness_power
                spread = spec.arm_spread * (0.3 + r * 0.7)
                rx = math.pow(rng.random(), power) * (rng.random() < 0.5 and -1 or 1) * spread
                ry = math.pow(rng.random(), power) * (rng.random() < 0.5 and -1 or 1) * spread * 0.3
                rz = math.pow(rng.random(), power) * (rng.random() < 0.5 and -1 or 1) * spread

                x = math.cos(angle) * r + rx
                y = ry
                z = math.sin(angle) * r + rz
                positions[i] = (x, y, z)

                dist_ratio = r / max(spec.radius, 1e-6)
                cr, cg, cb = spec.inner_color
                or_, og, ob = spec.outer_color
                t = dist_ratio
                r_ = cr * (1 - t) + or_ * t
                g_ = cg * (1 - t) + og * t
                b_ = cb * (1 - t) + ob * t
                colors[i] = (r_, g_, b_)

                base_size = (1.0 - dist_ratio) * (1.0 + 0.6 * (spec.bloom_strength / 2.0))
                if rng.random() < spec.core_density and r < spec.radius * 0.25:
                    base_size *= 1.8
                sizes[i] = max(0.1, base_size * (0.7 + rng.random() * 0.6))

                vx = (rng.random() - 0.5) * spec.turbulence
                vy = (rng.random() - 0.5) * spec.turbulence * 0.4
                vz = (rng.random() - 0.5) * spec.turbulence
                velocities[i] = (vx, vy, vz)

        return {
            "positions": positions.tolist(),
            "colors": colors.tolist(),
            "sizes": sizes.tolist(),
            "velocities": velocities.tolist(),
        }
