# Board transcription tooling

`src/lib/features/map/board.json` is generated from the board photograph in the pinned rules reference (`source_of_the_nile_1978_map.jpg`, see `docs/rules-reference.md`). The photograph is not in this repository; pass its path.

```sh
PY='with import <nixpkgs> {}; python3.withPackages (ps: [ ps.numpy ps.pillow ])'
nix shell --impure --expr "$PY" -c python3 -I tools/mapfit/fit.py      <map.jpg> <outdir>   # fit the hex lattice → centres.json, overlay tiles
nix shell --impure --expr "$PY" -c python3 -I tools/mapfit/classify.py <map.jpg> <outdir>   # classify each hex by printed colour → classes.json, lettered tiles
nix shell --impure --expr "$PY" -c python3 -I tools/mapfit/regions.py  <map.jpg> <outdir>   # full-resolution crops of the coasts for checking
nix shell --impure --expr "$PY" -c python3 -I tools/mapfit/rivercheck.py <map.jpg> <outdir> # blue fraction per hex around each river
python3 -I tools/mapfit/build.py <outdir> src/lib/features/map/board.json                   # classifier output + the hand transcription → manifest
```

`build.py` holds the hand transcription (ports, rivers, drainage numbers, and every periphery hex that was checked by eye against the crops). The classifier only decides land vs sea and the desert band; interior crayon marks from old games are ignored by zone. Open questions about the transcription are logged under `RQ-5` in `docs/rules.md`.
