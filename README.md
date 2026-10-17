# Torqara

A static website and interactive detumbling demonstration.

## Run locally

From this directory:

```sh
python3 -m http.server 8781
```

Open http://localhost:8781/ in a browser. No build step or package installation is required.

## Contents

- `index.html`: cinematic concept website and original 3D hardware visualization.
- `explorer.html`: interactive model and three engineering concept sections.
- `model/index.html`: self-contained numerical model with orbit, zoom, target spin, brake engagement, pause and reset controls.
- `references.html`: research context and source links.
- `vendor/`: local Three.js modules and their retained license notice.

## Model scope

The model integrates rigid-body angular motion and a phenomenological local-patch drag approximation. Camera observations are synthetic. Arm geometry and magnet rotation are schematic; the visible magnet angle does not determine calculated torque. Values and durations are simulated, not measured hardware performance or validated spacecraft predictions. Spacecraft reaction, thermal effects and orbital dynamics are omitted. Detumbling does not remove a target from orbit.

No hardware interfaces, uploaded archives or private development records are included.
