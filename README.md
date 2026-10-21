# Vyper Space

A static website for the proposed Arm v2 ground-test prototype: original supplied CAD, recorded simulation, candidate parts, build planning and reviewed engineering findings. The production hostname is `vyperspace.com`; the source repository remains `GTamerlan/torqara`.

## Local preview

From this directory:

```sh
python3 -m http.server 8783 --bind 127.0.0.1
```

Open http://127.0.0.1:8783/. No build or package installation is required. Serve over HTTP so the local CAD modules and assets can load.

Deployment uses GitHub Pages, built from the root of `main`, with `vyperspace.com` as the custom domain. The root `CNAME` file preserves that hostname on subsequent releases. Porkbun DNS must point the root ALIAS and the `www` CNAME to `gtamerlan.github.io` (without a repository path). GitHub provisions the HTTPS certificate after DNS validation. Review changes locally before pushing an approved release to `main`.

The homepage follows thirteen scroll-driven scenes: crowded Earth orbit, a first illustrative detumbling encounter, a return to an imagined microgravity experiment, an experiment closeup, the proposed arm prototype, a concept launch pad, rocket liftoff, ascent, orbital deployment, a field of tumbling spacecraft, arm approach, magnetic interaction and a closing pullback. The laboratory, zero-g conditions, vehicle and mission sequence are imagined explanatory staging; no experiment, manufacture or launch is claimed to have occurred.

The cinematic overlay now uses headlines and essential navigation only. Orbital statistics, source dates and explanatory limits are available in the collapsed “About this illustration” section below the journey. The opening keeps the orbit-shell population visible and reveals larger foreground spacecraft only during the approach. The primary navigation uses the user-supplied VYPER lettering only, edited to remove the emblem, orbit, SPACE line and checkerboard background.

`home.js` manages captions and navigation. `orbital-scene.js` integrates the local Three.js render; `ground-sequence.js` constructs the concept laboratory and prototype journey; `launch-sequence.js` constructs the generic concept rocket and launch; `orbital-population.js` constructs the illustrative orbital distribution; `orbital-hardware.js` mounts the supplied arm CAD and creates concept spacecraft. Native scrolling drives deterministic geometry poses and eased camera movement. Pause holds the scene, Replay returns to crowded Earth, and arrows jump between the thirteen scenes. “Look around” freezes the story and enables drag-to-orbit plus wheel/pinch zoom. Return to story, Escape, Replay or scene navigation restores the guided view. Reduced motion uses still compositions. A readable fallback and engineering links remain when 3D is unavailable. The detailed CAD viewer, replay and original numerical model remain on separate pages.

The expandable population notes use ESA's 14 October 2026 figures: approximately 47,140 tracked space objects. The separate 1.5 million debris estimate for objects larger than 1 cm and up to 10 cm comes from ESA's MASTER-8 model with a February 2026 reference population. Source: https://www.esa.int/Space_Safety/Space_Debris/Space_debris_by_the_numbers . Drawn markers are a synthetic visual sample with enlarged sizes, not a live catalog, not one marker per physical object, and not a claim about category proportions. Source data and browser evidence are recorded in `../../Vyper-Space/evidence/earth-to-orbit/`.

## Pages

- `index.html`: a minimal cinematic Earth-orbit journey with routes into the separate engineering explorer and prototype.
- `prototype.html`: recorded CAD trajectory, video, candidate parts, fabrication schedules, build sequence and original downloads.
- `explorer.html`: engineering concepts, supplied report interpretation and corrections, validation priorities, plus the earlier illustrative browser model.
- `model/index.html`: the preserved numerical concept model, rebranded with no changes to its simulation code.
- `references.html`: project-source context and published research references.

## Asset provenance

`assets/vyper/orbital-dawn.jpg` is an original AI-generated artistic Earth-orbit illustration, not flight imagery or a rendering of validated project hardware. The built-in image-generation tool produced it for this preview. No GRU text, images, code, video, logos or commercial fonts are incorporated. Reference observations and the full image prompt are retained outside the site in `../../Vyper-Space/evidence/`.

`assets/vyper/earth-day.jpg` is a resized 2048×1024 NASA Blue Marble July 2004 base map. Credit: NASA Earth Observatory. Source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/ . The overlaid cloud texture is procedural decoration, not observed weather. Texture provenance is retained in `../../Vyper-Space/evidence/orbit-journey/earth-provenance.json`.

The Arm v2 files originate from the user-supplied `detumbler-arm-v2.zip` (SHA-256 `64666245dc1908edcf4659646e2c1d179b60f8efa76f3203b3ed0d2e8d41d13b`). The 13 GLB components, recorded Fusion trajectory, selected renders, MP4 and original downloads are preserved byte-for-byte under `assets/viper/`. `assets/viper/cad/provenance.json` documents the CAD viewer sources. Runtime geometry batches original face meshes by material without simplifying or replacing the supplied surfaces.

`cad-viewer.js` renders the supplied GLBs with local Three.js r172 modules. Its replay interpolates recorded joint poses; it does not run the Python/MuJoCo simulation in the browser. The MP4 is a supplied animation, not footage of physical hardware. Full source, simulation configuration and result files are available in the original package download. No software-license grant is implied by hosting the supplied package.

The homepage orbital installation is an artistic adaptation of seven supplied arm components, with named ground pedestal and leveling hardware omitted at runtime. The source GLBs are unchanged. The surrounding carrier, satellites, damage and placement are original illustrative geometry, not flight-qualified CAD. Transverse N/S markers on the rotor turn about the shaft so the depicted dipole changes direction. The field and current lines are explanatory graphics; the target's apparent slowdown is a scripted presentation, not computed magnetic torque. There is no physical elapsed-time or braking-efficacy claim. Whether a real rotating field brakes or accelerates a target depends on its relative motion, geometry and control.

## Scope and findings

No prototype hardware has been built or flight validated. The report includes uncorrected statements; the reviewed findings at `explorer.html#report-review` distinguish geometric overlap samples from physical contacts, account for bearing-friction confounding, and identify the mass discrepancy, assumed actuator interfaces, incomplete EtherCAT integration and other validation work. CAD and load checks are preliminary, not manufacturing or safety approval.

The separate earlier browser model integrates angular motion with a phenomenological local-patch drag approximation. Camera observations are synthetic. Its visible magnet angle does not determine calculated torque. Spacecraft reaction, thermal effects and orbital dynamics are omitted. Detumbling does not remove a target from orbit.

The previous `hardware.js` invented scene and `assets/orbital-horizon.svg` artwork remain archived in source. The homepage does not load them. Third-party Three.js license is retained in `vendor/THREE-LICENSE.txt`; uploaded design materials remain separate from that license.
