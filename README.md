# Viper Space

A static website for the proposed Arm v2 ground-test prototype: original supplied CAD, recorded simulation, candidate parts, build planning and reviewed engineering findings. The existing `/torqara/` URL is retained after the company rename.

## Local preview

From this directory:

```sh
python3 -m http.server 8782 --bind 127.0.0.1
```

Open http://127.0.0.1:8782/. No build or package installation is required. Serve over HTTP so the local CAD modules and assets can load.

## Pages

- `index.html`: Viper Space homepage, supplied CAD viewer and simulation video.
- `prototype.html`: recorded CAD trajectory, video, candidate parts, fabrication schedules, build sequence and original downloads.
- `explorer.html`: engineering concepts, supplied report interpretation and corrections, validation priorities, plus the earlier illustrative browser model.
- `model/index.html`: the preserved numerical concept model, rebranded with no changes to its simulation code.
- `references.html`: project-source context and published research references.

## Asset provenance

The Arm v2 files originate from the user-supplied `detumbler-arm-v2.zip` (SHA-256 `64666245dc1908edcf4659646e2c1d179b60f8efa76f3203b3ed0d2e8d41d13b`). The 13 GLB components, recorded Fusion trajectory, selected renders, MP4 and original downloads are preserved byte-for-byte under `assets/viper/`. `assets/viper/cad/provenance.json` documents the CAD viewer sources. Runtime geometry batches original face meshes by material without simplifying or replacing the supplied surfaces.

`cad-viewer.js` renders the supplied GLBs with local Three.js r172 modules. Its replay interpolates recorded joint poses; it does not run the Python/MuJoCo simulation in the browser. The MP4 is a supplied animation, not footage of physical hardware. Full source, simulation configuration and result files are available in the original package download. No software-license grant is implied by hosting the supplied package.

## Scope and findings

No prototype hardware has been built or flight validated. The report includes uncorrected statements; the reviewed findings at `explorer.html#report-review` distinguish geometric overlap samples from physical contacts, account for bearing-friction confounding, and identify the mass discrepancy, assumed actuator interfaces, incomplete EtherCAT integration and other validation work. CAD and load checks are preliminary, not manufacturing or safety approval.

The separate earlier browser model integrates angular motion with a phenomenological local-patch drag approximation. Camera observations are synthetic. Its visible magnet angle does not determine calculated torque. Spacecraft reaction, thermal effects and orbital dynamics are omitted. Detumbling does not remove a target from orbit.

The previous `hardware.js` invented scene and `assets/orbital-horizon.svg` artwork remain archived in source. The homepage does not load them. Third-party Three.js license is retained in `vendor/THREE-LICENSE.txt`; uploaded design materials remain separate from that license.
