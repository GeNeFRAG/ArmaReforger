# examples/

Node.js examples demonstrating `BallisticCalculator.js` usage. No server or browser required.

| File | Demonstrates |
|------|-------------|
| `node-example.js` | Basic calculation: load data, prepareInput, calculate, print solution |
| `coordinates-and-geometry.js` | Distance, bearing, height-difference helpers |
| `fire-corrections.js` | `calculateWithCorrections` — Add/Drop and Left/Right |
| `ffe-patterns.js` | `generateFFEPattern` — lateral/linear/circular sheaves |
| `trajectory-visualization.js` | ASCII terminal trajectory plot |
| `integration-with-engine.js` | Map engine integration pattern |
| `test-integration.js` | Batch test of multiple weapon/range combinations |

Run any example from `mortar_core/`:
```bash
node examples/node-example.js
```

The quickest smoke-test for the engine is `npm run engine:demo` (runs `node-example.js`).
