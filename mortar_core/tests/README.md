# tests/

Playwright e2e tests only. No unit tests — engine correctness is validated through integration against the running app.

All tests live under `tests/e2e/`. See [../docs/ADDING_A_TEST.md](../docs/ADDING_A_TEST.md) for the full pattern (POM, fixtures, helpers) and a worked example.

Docker must be running before tests execute (`npm run docker:up`). The `npm run test:e2e` script handles start/stop automatically.
