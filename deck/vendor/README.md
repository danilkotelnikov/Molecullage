# Vendored libraries

| File | What | Version | Licence |
|---|---|---|---|
| `3Dmol-min.js` | 3Dmol.js, the WebGL molecule viewer | 2.5.5 (npm `3dmol`), unchanged | BSD-3-Clause, `LICENSE-3Dmol.txt` and `3Dmol-min.js.LICENSE.txt` |

The file is the `build/3Dmol-min.js` of the npm package, copied as it is. The deck build inlines it into a deck only when the deck has a WebGL scene, so a finished deck loads nothing from the network.
SHA-256 of `3Dmol-min.js`: see `SHA256.txt`. To update: `npm pack 3dmol@<version>`, copy the file, update the version and the hash, and build the demo deck again.
